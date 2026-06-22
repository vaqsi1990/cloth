import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isAdminOrSupport } from '@/lib/roles'
import { cancelOrderForOutOfStock } from '@/lib/order-out-of-stock'
import { prisma } from '@/lib/prisma'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !isAdminOrSupport(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Admin or Support access required' },
        { status: 403 },
      )
    }

    const resolvedParams = await params
    const orderId = parseInt(resolvedParams.id, 10)
    if (!Number.isFinite(orderId)) {
      return NextResponse.json(
        { success: false, message: 'არასწორი შეკვეთის ID' },
        { status: 400 },
      )
    }

    const result = await cancelOrderForOutOfStock(orderId)
    if (!result.ok) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: result.status },
      )
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              include: { images: true },
            },
          },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: result.message,
      order,
    })
  } catch (error) {
    console.error('Error canceling out-of-stock order:', error)
    return NextResponse.json(
      { success: false, message: 'შეცდომა შეკვეთის გაუქმებისას' },
      { status: 500 },
    )
  }
}
