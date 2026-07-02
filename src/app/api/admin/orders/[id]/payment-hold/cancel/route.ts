import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PaymentHoldStatus } from '@prisma/client'
import { isAdminOrSupport } from '@/lib/roles'
import { prisma } from '@/lib/prisma'
import {
  bogCancelPreAuthorization,
  getBogPreAuthErrorMessage,
} from '@/lib/bog-preauth'
import {
  isPaymentHoldExpired,
  PAYMENT_HOLD_MAX_DAYS,
} from '@/lib/payment-hold-config'
import {
  expirePaymentHoldIfNeeded,
  markOrderPaymentReleased,
} from '@/lib/payment-hold'

const paymentHoldOrderSelect = {
  id: true,
  paymentId: true,
  total: true,
  status: true,
  paymentCaptureMode: true,
  paymentHoldStatus: true,
  paymentHoldBlockedAt: true,
  updatedAt: true,
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

    const order = await prisma.order.findUnique({
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
      description: body.description || 'Admin released payment hold',
    })

    await markOrderPaymentReleased(orderId)

    return NextResponse.json({
      success: true,
      message: 'შეკვეთა გაუქმდა. ბარათზე დაბლოკილი თანხა განთავისუფლდა.',
      bog: bogResponse,
      paymentHoldStatus: PaymentHoldStatus.RELEASED,
    })
  } catch (error) {
    console.error('Admin payment hold cancel error:', error)
    return NextResponse.json(
      {
        success: false,
        error: getBogPreAuthErrorMessage(error),
      },
      { status: 500 },
    )
  }
}
