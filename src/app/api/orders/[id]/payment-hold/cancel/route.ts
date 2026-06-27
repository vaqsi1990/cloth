import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PaymentHoldStatus } from '@prisma/client'
import {
  bogCancelPreAuthorization,
  getBogPreAuthErrorMessage,
} from '@/lib/bog-preauth'
import {
  getOrderForPaymentHoldAction,
  isPaymentHoldExpired,
  expirePaymentHoldIfNeeded,
  markOrderPaymentReleased,
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

    let body: { description?: string } = {}
    try {
      body = await request.json()
    } catch {
      body = {}
    }

    const bogResponse = await bogCancelPreAuthorization(order.paymentId, {
      description: body.description || 'Customer released payment hold',
    })

    await markOrderPaymentReleased(orderId)

    return NextResponse.json({
      success: true,
      message: 'გადახდის ბლოკი მოხსნილია. თანხა აღარ ჩაირიცხება.',
      bog: bogResponse,
      paymentHoldStatus: PaymentHoldStatus.RELEASED,
    })
  } catch (error) {
    console.error('Payment hold cancel error:', error)
    return NextResponse.json(
      {
        success: false,
        error: getBogPreAuthErrorMessage(error),
      },
      { status: 500 },
    )
  }
}
