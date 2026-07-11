import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PaymentHoldStatus } from '@prisma/client'
import { isAdminOrSupport } from '@/lib/roles'
import { prisma } from '@/lib/prisma'
import {
  bogApprovePreAuthorization,
  describeBogReceiptSplit,
  fetchBogPaymentReceipt,
  getBogApproveReadinessMessage,
  getBogPreAuthErrorMessage,
  hasBogReceiptSplit,
  isBogPaymentCaptured,
  isBogPreAuthAlreadyRequestedError,
  isBogAuthorizeRejectedError,
  waitForBogAuthorizeOutcome,
  waitForPendingAuthorizeToSettle,
} from '@/lib/bog-preauth'
import {
  buildSplitPaymentConfigForOrder,
  describeSplitPayments,
  getOrderSplitReadinessMessage,
  logOrderSplitDiagnostics,
} from '@/lib/bog-split-config'
import {
  allowPaymentHoldApproveWithoutSplit,
  isPaymentHoldExpired,
  isPaymentHoldSplitOnApproveEnabled,
  PAYMENT_HOLD_MAX_DAYS,
} from '@/lib/payment-hold-config'
import {
  expirePaymentHoldIfNeeded,
  markOrderPaymentCaptured,
  syncPaymentHoldWithBog,
} from '@/lib/payment-hold'

const paymentHoldOrderSelect = {
  id: true,
  paymentId: true,
  total: true,
  status: true,
  paymentMethod: true,
  deliveryPrice: true,
  voucherDiscount: true,
  paymentCaptureMode: true,
  paymentHoldStatus: true,
  paymentHoldBlockedAt: true,
  updatedAt: true,
  items: {
    select: {
      productId: true,
      sellerUserId: true,
      price: true,
      quantity: true,
      isRental: true,
    },
  },
} as const

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isAdminOrSupport(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Admin or Support access required' },
        { status: 403 },
      )
    }

    const { id } = await params
    const orderId = parseInt(id, 10)
    if (Number.isNaN(orderId) || orderId <= 0) {
      return NextResponse.json(
        { success: false, error: 'არასწორი შეკვეთის ID' },
        { status: 400 },
      )
    }

    let order = await prisma.order.findUnique({
      where: { id: orderId },
      select: paymentHoldOrderSelect,
    })
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'შეკვეთა ვერ მოიძებნა' },
        { status: 404 },
      )
    }

    if (order.paymentCaptureMode !== 'MANUAL') {
      return NextResponse.json(
        { success: false, error: 'ამ შეკვეთაზე პრეავტორიზაცია არ არის ჩართული' },
        { status: 400 },
      )
    }

    if (!order.paymentId) {
      return NextResponse.json(
        { success: false, error: 'გადახდის იდენტიფიკატორი ვერ მოიძებნა' },
        { status: 400 },
      )
    }

    const sync = await syncPaymentHoldWithBog(orderId)
    if (sync.changed) {
      order = await prisma.order.findUnique({
        where: { id: orderId },
        select: paymentHoldOrderSelect,
      })
      if (!order) {
        return NextResponse.json(
          { success: false, error: 'შეკვეთა ვერ მოიძებნა' },
          { status: 404 },
        )
      }
    }

    if (order.paymentHoldStatus === PaymentHoldStatus.CAPTURED) {
      return NextResponse.json({
        success: true,
        message: 'გადახდა უკვე დადასტურებულია BOG-ში.',
        bogStatus: sync.bogStatus,
        paymentHoldStatus: PaymentHoldStatus.CAPTURED,
      })
    }

    if (order.paymentHoldStatus === PaymentHoldStatus.RELEASED) {
      return NextResponse.json(
        {
          success: false,
          error: 'გადახდის ბლოკი უკვე მოხსნილია',
        },
        { status: 400 },
      )
    }

    if (order.paymentHoldStatus !== PaymentHoldStatus.BLOCKED) {
      return NextResponse.json(
        {
          success: false,
          error: 'გადახდის ბლოკი უკვე მოხსნილია ან დადასტურებულია',
        },
        { status: 400 },
      )
    }

    if (isPaymentHoldExpired(order)) {
      await expirePaymentHoldIfNeeded(orderId)
      return NextResponse.json(
        {
          success: false,
          error: `გადახდის ბლოკის ${PAYMENT_HOLD_MAX_DAYS} დღიანი ვადა გავიდა და ავტომატურად მოიხსნა`,
        },
        { status: 400 },
      )
    }

    let body: { amount?: number; description?: string } = {}
    try {
      body = await request.json()
    } catch {
      body = {}
    }

    const splitEnabled = isPaymentHoldSplitOnApproveEnabled()
    const splitConfig = splitEnabled
      ? await buildSplitPaymentConfigForOrder(order)
      : null
    const splitReadinessError = splitEnabled
      ? getOrderSplitReadinessMessage(order, splitConfig)
      : null

    logOrderSplitDiagnostics(order, splitConfig, {
      splitEnabled,
      context: `payment-hold approve #${orderId}`,
    })

    if (splitEnabled && splitReadinessError) {
      console.error(`[SPLIT] Approve blocked for order #${orderId}: ${splitReadinessError}`)
      return NextResponse.json(
        {
          success: false,
          error: `Split ვერ მომზადდა: ${splitReadinessError}`,
          splitPreview: describeSplitPayments(splitConfig),
        },
        { status: 400 },
      )
    }

    const approveAmount = body.amount ?? order.total
    const approveDescription = body.description || 'Admin approved pre-authorization'
    const paymentId = order.paymentId!

    const receiptBeforeApprove = await fetchBogPaymentReceipt(paymentId)
    if (isBogPaymentCaptured(receiptBeforeApprove)) {
      await markOrderPaymentCaptured(orderId)
      return NextResponse.json({
        success: true,
        message: 'გადახდა უკვე დადასტურებულია BOG-ში.',
        bogStatus: receiptBeforeApprove.order_status?.key,
        paymentHoldStatus: PaymentHoldStatus.CAPTURED,
      })
    }

    const approveReadinessError = getBogApproveReadinessMessage(receiptBeforeApprove)
    if (approveReadinessError) {
      return NextResponse.json(
        { success: false, error: approveReadinessError },
        { status: 400 },
      )
    }

    const runApprove = async (withSplit: boolean) => {
      if (withSplit && splitConfig) {
        console.log(
          `[SPLIT] Approving order #${orderId} with split:`,
          JSON.stringify(describeSplitPayments(splitConfig)),
        )
      } else {
        console.warn(`[SPLIT] Approving order #${orderId} without split`, {
          splitEnabled,
          splitConfigBuilt: !!splitConfig,
          reason: !splitEnabled
            ? 'PAYMENT_HOLD_SPLIT_ON_APPROVE is disabled'
            : !splitConfig
              ? 'split config was not built'
              : 'explicit fallback without split',
        })
      }

      const postApprove = async () =>
        bogApprovePreAuthorization(paymentId, {
          amount: approveAmount,
          description: approveDescription,
          split: withSplit ? splitConfig ?? undefined : undefined,
        })

      try {
        const response = await postApprove()
        const receipt = await waitForBogAuthorizeOutcome(paymentId, response.action_id)
        if (!isBogPaymentCaptured(receipt)) {
          throw new Error('BOG-მა დადასტურება მიიღო, მაგრამ გადახდა ჯერ არ დასრულებულა.')
        }
        return { response, receipt }
      } catch (bogError) {
        if (!isBogPreAuthAlreadyRequestedError(bogError)) {
          throw bogError
        }

        console.warn(
          `[SPLIT] BOG already processing authorize for #${orderId}, waiting to settle`,
        )
        await waitForPendingAuthorizeToSettle(paymentId)
        const response = await postApprove()
        const receipt = await waitForBogAuthorizeOutcome(paymentId, response.action_id)
        if (!isBogPaymentCaptured(receipt)) {
          throw new Error('BOG-მა დადასტურება მიიღო, მაგრამ გადახდა ჯერ არ დასრულებულა.')
        }
        return { response, receipt }
      }
    }

    let bogResponse
    let finalReceipt
    let usedSplit = false
    let splitSentToBog = false

    if (splitEnabled && splitConfig) {
      try {
        const approveResult = await runApprove(true)
        bogResponse = approveResult.response
        finalReceipt = approveResult.receipt
        splitSentToBog = true
        usedSplit = hasBogReceiptSplit(finalReceipt)

        const receiptSplit = describeBogReceiptSplit(finalReceipt)
        console.log(`[SPLIT] BOG receipt after approve #${orderId}`, receiptSplit)

        if (!usedSplit) {
          console.error(`[SPLIT] Split was sent to BOG but receipt shows no split for order #${orderId}`, {
            orderId,
            paymentId,
            splitPreview: describeSplitPayments(splitConfig),
            receiptSplit,
            likelyCauses: [
              'BOG split payment is not activated for pre-auth capture on this merchant account',
              'BOG merchant settlement account has insufficient balance for split transfer fees',
              'BOG rejected split silently while still completing authorize',
              'Recipient IBAN is inactive or not eligible for BOG split transfer',
            ],
          })
        }
      } catch (bogError) {
        if (!isBogAuthorizeRejectedError(bogError)) {
          throw bogError
        }

        console.error(`[SPLIT] BOG rejected split approve for order #${orderId}`, {
          error: getBogPreAuthErrorMessage(bogError),
          splitPreview: describeSplitPayments(splitConfig),
        })

        if (!allowPaymentHoldApproveWithoutSplit()) {
          return NextResponse.json(
            {
              success: false,
              error: `BOG-მა split-ით დადასტურება უარყო: ${getBogPreAuthErrorMessage(bogError)}. დაამატეთ გამყიდველის IBAN ან ჩართეთ PAYMENT_HOLD_SPLIT_FALLBACK_WITHOUT_SPLIT=true.`,
              splitPreview: describeSplitPayments(splitConfig),
            },
            { status: 400 },
          )
        }

        console.warn(
          `[SPLIT] Split approve rejected by BOG for #${orderId}, retrying without split`,
        )
        await waitForPendingAuthorizeToSettle(paymentId)
        const approveResult = await runApprove(false)
        bogResponse = approveResult.response
        finalReceipt = approveResult.receipt
        usedSplit = false
        splitSentToBog = false
      }
    } else {
      const approveResult = await runApprove(false)
      bogResponse = approveResult.response
      finalReceipt = approveResult.receipt
      usedSplit = false
      splitSentToBog = false
    }

    await markOrderPaymentCaptured(orderId)

    return NextResponse.json({
      success: true,
      message: usedSplit
        ? 'გადახდა დადასტურებულია. თანხა გადანაწილდა მერჩანტს და გამყიდველს.'
        : splitSentToBog
          ? 'გადახდა დადასტურებულია BOG-ში, მაგრამ split არ შესრულდა — გამყიდველის ნაწილი ხელით გადაირიცხეთ. Vercel logs-ში ნახე [SPLIT].'
          : splitConfig
            ? 'გადახდა დადასტურებულია BOG-ში split-ის გარეშე — გამყიდველის ნაწილი ხელით გადაირიცხეთ.'
            : 'გადახდა დადასტურებულია BOG-ში.',
      bog: bogResponse,
      splitApplied: usedSplit,
      splitSentToBog,
      bogReceiptSplit: finalReceipt ? describeBogReceiptSplit(finalReceipt) : null,
      splitPreview: describeSplitPayments(splitConfig),
      paymentHoldStatus: PaymentHoldStatus.CAPTURED,
    })
  } catch (error) {
    console.error('Admin payment hold approve error:', error)
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { status?: number; data?: unknown } }
      console.error('BOG response:', axiosError.response?.status, axiosError.response?.data)
    }
    return NextResponse.json(
      {
        success: false,
        error: getBogPreAuthErrorMessage(error),
      },
      { status: 500 },
    )
  }
}
