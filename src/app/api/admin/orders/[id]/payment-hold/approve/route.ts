import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PaymentHoldStatus } from '@prisma/client'
import { isAdminOrSupport } from '@/lib/roles'
import { prisma } from '@/lib/prisma'
import {
  bogApprovePreAuthorization,
  fetchBogPaymentReceipt,
  getBogApproveReadinessMessage,
  getBogPreAuthErrorMessage,
  isBogPaymentCaptured,
  isBogPreAuthAlreadyRequestedError,
  isBogAuthorizeRejectedError,
  waitForBogAuthorizeOutcome,
  waitForPendingAuthorizeToSettle,
} from '@/lib/bog-preauth'
import { buildSplitPaymentConfigForOrder } from '@/lib/bog-split-config'
import {
  isPaymentHoldExpired,
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
      price: true,
      quantity: true,
      isRental: true,
    },
  },
} as const

function shouldTrySplitOnApprove(): boolean {
  return process.env.PAYMENT_HOLD_SPLIT_ON_APPROVE === 'true'
}

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

    const splitConfig = await buildSplitPaymentConfigForOrder(order)
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
          `[payment-hold] Approving order #${orderId} with split:`,
          JSON.stringify(
            splitConfig.split_payments.map((sp) => ({
              percent: sp.percent,
              iban: `${sp.iban.substring(0, 8)}...${sp.iban.slice(-4)}`,
            })),
          ),
        )
      } else {
        console.log(`[payment-hold] Approving order #${orderId} without split`)
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
        return response
      } catch (bogError) {
        if (!isBogPreAuthAlreadyRequestedError(bogError)) {
          throw bogError
        }

        console.warn(
          `[payment-hold] BOG already processing authorize for #${orderId}, waiting to settle`,
        )
        await waitForPendingAuthorizeToSettle(paymentId)
        const response = await postApprove()
        const receipt = await waitForBogAuthorizeOutcome(paymentId, response.action_id)
        if (!isBogPaymentCaptured(receipt)) {
          throw new Error('BOG-მა დადასტურება მიიღო, მაგრამ გადახდა ჯერ არ დასრულებულა.')
        }
        return response
      }
    }

    let bogResponse
    let usedSplit = false

    if (shouldTrySplitOnApprove() && splitConfig) {
      try {
        bogResponse = await runApprove(true)
        usedSplit = true
      } catch (bogError) {
        if (!isBogAuthorizeRejectedError(bogError)) {
          throw bogError
        }

        console.warn(
          `[payment-hold] Split approve rejected by BOG for #${orderId}, retrying without split`,
        )
        await waitForPendingAuthorizeToSettle(paymentId)
        bogResponse = await runApprove(false)
        usedSplit = false
      }
    } else {
      bogResponse = await runApprove(false)
    }

    await markOrderPaymentCaptured(orderId)

    return NextResponse.json({
      success: true,
      message: usedSplit
        ? 'გადახდა დადასტურებულია. თანხა ჩაირიცხება მიმწოდებლის ანგარიშზე.'
        : splitConfig
          ? 'გადახდა დადასტურებულია BOG-ში. Split პრეავტორიზაციაზე არ მუშაობს — თანხა მერჩანტ ანგარიშზე ჩაირიცხა, გამყიდველის ნაწილი ხელით გადაირიცხეთ.'
          : 'გადახდა დადასტურებულია BOG-ში.',
      bog: bogResponse,
      splitApplied: usedSplit,
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
