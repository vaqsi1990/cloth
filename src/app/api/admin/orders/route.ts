import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdminOrSupport } from '@/lib/roles'

// GET - Fetch all orders (admin only)
export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin/support role
    const session = await getServerSession(authOptions)
    if (!session || !isAdminOrSupport(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Admin or Support access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10) || 50, 1), 200)
    const skip = (page - 1) * limit

    const where = { status: 'PAID' as const }

    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  status: true,
                  userId: true,
                  images: {
                    select: { url: true, alt: true },
                    take: 1,
                  },
                  rentalPriceTiers: {
                    orderBy: { minDays: 'asc' },
                    take: 5,
                  },
                  pickupAddress: true,
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                      phone: true,
                      pickupAddress: true,
                      address: true,
                    },
                  },
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              address: true,
              location: true,
            },
          },
          deliveryCity: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      orders,
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    })

  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { success: false, error: 'Error fetching orders' },
      { status: 500 }
    )
  }
}
