import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PaymentHoldStatus } from '@prisma/client'
import {
  bogApprovePreAuthorization,
  getBogPreAuthErrorMessage,
} from '@/lib/bog-preauth'
import {
  getOrderForPaymentHoldAction,
  isPaymentHoldExpired,
  expirePaymentHoldIfNeeded,
  markOrderPaymentCaptured,
  PAYMENT_HOLD_MAX_DAYS,
} from '@/lib/payment-hold'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 },
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

    const order = await getOrderForPaymentHoldAction(orderId, session.user.id)
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

    if (order.paymentHoldStatus !== PaymentHoldStatus.BLOCKED) {
      return NextResponse.json(
        { success: false, error: 'გადახდის ბლოკი უკვე მოხსნილია ან დადასტურებულია' },
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

    if (!order.paymentId) {
      return NextResponse.json(
        { success: false, error: 'გადახდის იდენტიფიკატორი ვერ მოიძებნა' },
        { status: 400 },
      )
    }

    let body: { amount?: number; description?: string } = {}
    try {
      body = await request.json()
    } catch {
      body = {}
    }

    const bogResponse = await bogApprovePreAuthorization(order.paymentId, {
      amount: body.amount,
      description: body.description || 'Customer approved pre-authorization',
    })

    await markOrderPaymentCaptured(orderId)

    return NextResponse.json({
      success: true,
      message: 'გადახდა დადასტურებულია. თანხა ჩაირიცხება მიმწოდებლის ანგარიშზე.',
      bog: bogResponse,
      paymentHoldStatus: PaymentHoldStatus.CAPTURED,
    })
  } catch (error) {
    console.error('Payment hold approve error:', error)
    return NextResponse.json(
      {
        success: false,
        error: getBogPreAuthErrorMessage(error),
      },
      { status: 500 },
    )
  }
}
