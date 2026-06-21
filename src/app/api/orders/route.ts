import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { internalServerErrorResponse } from '@/lib/api-error'
import { requireAuthedUser } from '@/lib/auth-session'

// POST - Legacy endpoint disabled (use /api/create-order)
export async function POST(_request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      message: 'ეს endpoint აღარ გამოიყენება. გამოიყენეთ checkout.',
    },
    { status: 410 },
  )
}

// GET - Fetch orders (for authenticated users)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const auth = await requireAuthedUser(session)
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status },
      )
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10) || 50, 1), 100)
    const skip = (page - 1) * limit

    const where = {
      OR: [
        { userId: auth.user.id },
        {
          userId: null,
          OR: [
            { email: auth.user.email || undefined },
            { phone: auth.user.phone || undefined },
          ],
        },
      ],
    }

    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              product: {
                select: { status: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ])

    // Filter items to exclude those with AVAILABLE product status
    // (Items with AVAILABLE status were likely re-added to inventory after being sold)
    const filteredOrders = orders.map(order => ({
      ...order,
      items: order.items.filter(item => 
        !item.product || item.product.status !== 'AVAILABLE'
      )
    }))

    return NextResponse.json({
      success: true,
      orders: filteredOrders,
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    })
    
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json({
      success: false,
      message: 'შეცდომა შეკვეთების მიღებისას'
    }, { status: 500 })
  }
}
