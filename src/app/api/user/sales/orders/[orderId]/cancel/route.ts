import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { cancelSaleOrder } from '@/lib/cancel-sale-order'
import { requireSellerOrderCancelAccess } from '@/lib/seller-order-cancel-access'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'ავტორიზაცია საჭიროა' },
        { status: 401 },
      )
    }

    const resolvedParams = await params
    const orderId = parseInt(resolvedParams.orderId, 10)
    if (!Number.isFinite(orderId)) {
      return NextResponse.json(
        { success: false, message: 'არასწორი შეკვეთის ID' },
        { status: 400 },
      )
    }

    const access = await requireSellerOrderCancelAccess(orderId, session.user.id)
    if (!access.ok) {
      return NextResponse.json(
        { success: false, message: access.message },
        { status: access.status },
      )
    }

    const result = await cancelSaleOrder(orderId)
    if (!result.ok) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: result.status },
      )
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      orderId,
      status: 'CANCELED',
    })
  } catch (error) {
    console.error('Error canceling seller order:', error)
    return NextResponse.json(
      { success: false, message: 'შეცდომა შეკვეთის გაუქმებისას' },
      { status: 500 },
    )
  }
}
