import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { abandonPendingPayment } from '@/lib/rental-order-holds'

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

    if (isNaN(orderId) || orderId <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid order ID' },
        { status: 400 },
      )
    }

    const released = await abandonPendingPayment(orderId, session.user.id)

    return NextResponse.json({
      success: true,
      released,
      message: released
        ? 'გადაუხდელი შეკვეთა წაიშალა'
        : 'შეკვეთა უკვე დამუშავებულია',
    })
  } catch (error) {
    console.error('Error abandoning payment:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    )
  }
}
