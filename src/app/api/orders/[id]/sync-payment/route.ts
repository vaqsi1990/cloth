import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { bogTokenManager } from '@/lib/bog-token'
import {
  markOrderPaymentBlocked,
  markOrderPaymentCaptured,
  markOrderPaymentReleased,
  syncExpiredPaymentHolds,
} from '@/lib/payment-hold'
import { sendPaidOrderNotificationsOnce } from '@/lib/order-paid-notifications'

export async function POST(
  _request: NextRequest,
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

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: session.user.id },
      select: {
        id: true,
        paymentId: true,
        status: true,
        paymentCaptureMode: true,
        paymentHoldStatus: true,
      },
    })

    if (!order?.paymentId) {
      return NextResponse.json(
        { success: false, error: 'გადახდა ჯერ არ არის დაწყებული' },
        { status: 400 },
      )
    }

    await syncExpiredPaymentHolds()

    const receipt = await bogTokenManager.makeAuthenticatedRequest(async (token) => {
      const response = await axios.get(
        `https://api.bog.ge/payments/v1/receipt/${order.paymentId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        },
      )
      return response.data as { order_status?: { key?: string } }
    })

    const bogStatus = receipt.order_status?.key?.toLowerCase() || ''

    if (order.paymentCaptureMode === 'MANUAL') {
      if (bogStatus === 'blocked') {
        if (
          order.paymentHoldStatus !== 'CAPTURED' &&
          order.paymentHoldStatus !== 'RELEASED'
        ) {
          await markOrderPaymentBlocked(order.id)
        }
      } else if (bogStatus === 'completed' || bogStatus === 'partial_completed') {
        await markOrderPaymentCaptured(order.id)
      } else if (
        bogStatus === 'refunded' ||
        bogStatus === 'refunded_partially' ||
        bogStatus === 'rejected'
      ) {
        await markOrderPaymentReleased(order.id)
      }
    } else if (bogStatus === 'completed') {
      await markOrderPaymentCaptured(order.id)
    }

    if (bogStatus === 'completed' || bogStatus === 'blocked') {
      await sendPaidOrderNotificationsOnce(order.id)
    }

    const updated = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        deliveryCity: { select: { name: true } },
        items: {
          include: {
            product: {
              include: {
                images: true,
                user: { select: { id: true, name: true } },
                rentalPriceTiers: { orderBy: { minDays: 'asc' } },
              },
            },
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      order: updated,
      bogStatus,
    })
  } catch (error) {
    console.error('Sync payment error:', error)
    return NextResponse.json(
      { success: false, error: 'გადახდის სტატუსის შემოწმება ვერ მოხერხდა' },
      { status: 500 },
    )
  }
}
