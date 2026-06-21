import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import type { Session } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { bogTokenManager } from '@/lib/bog-token'
import { isAdminOrSupport } from '@/lib/roles'
import { internalServerErrorResponse } from '@/lib/api-error'
import axios, { AxiosError } from 'axios'

async function canAccessBogPaymentStatus(
  orderId: string,
  session: Session | null,
): Promise<boolean> {
  if (!session?.user?.id) return false
  if (isAdminOrSupport(session.user.role)) return true

  const order = await prisma.order.findFirst({
    where: { paymentId: orderId },
    select: { userId: true, email: true },
  })

  if (!order) return false
  if (order.userId === session.user.id) return true

  if (
    !order.userId &&
    order.email &&
    session.user.email &&
    order.email.trim().toLowerCase() === session.user.email.trim().toLowerCase()
  ) {
    return true
  }

  return false
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    const session = await getServerSession(authOptions)
    const { orderId } = await params

    if (!orderId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Order ID is required',
        },
        { status: 400 },
      )
    }

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 },
      )
    }

    const allowed = await canAccessBogPaymentStatus(orderId, session)
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 },
      )
    }

    const paymentDetails = await bogTokenManager.makeAuthenticatedRequest(
      async (token: string) => {
        const response = await axios.get(
          `https://api.bog.ge/payments/v1/receipt/${orderId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            timeout: 10000,
          },
        )

        return response.data
      },
    )

    return NextResponse.json({
      success: true,
      data: paymentDetails,
    })
  } catch (error) {
    const axiosError = error as AxiosError

    if (axiosError.response?.status === 404) {
      return NextResponse.json(
        {
          success: false,
          error: 'Payment not found',
          message: 'Payment not found',
        },
        { status: 404 },
      )
    }

    if (axiosError.response?.status === 401) {
      return NextResponse.json(
        {
          success: false,
          error: 'Payment provider authentication failed',
          message: 'Payment provider authentication failed',
        },
        { status: 502 },
      )
    }

    if (axiosError.response?.status) {
      return NextResponse.json(
        {
          success: false,
          error: 'Payment provider error',
          message: 'Payment provider error',
        },
        { status: 502 },
      )
    }

    return internalServerErrorResponse('Error fetching BOG payment status:', error)
  }
}
