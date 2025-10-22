import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Fetch admin dashboard stats (admin only) - OPTIMIZED FOR SPEED
export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Use Promise.all to fetch only essential counts in parallel
    const [productsCount, usersCount, ordersCount, totalRevenue] = await Promise.all([
      prisma.product.count(),
      prisma.user.count({ where: { role: 'USER' } }),
      prisma.order.count(),
      prisma.order.aggregate({
        _sum: { total: true }
      }).then(result => result._sum.total || 0)
    ])

    return NextResponse.json({
      success: true,
      stats: {
        totalProducts: productsCount,
        totalUsers: usersCount,
        totalOrders: ordersCount,
        totalRevenue: totalRevenue
      }
    })

  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json(
      { success: false, error: 'Error fetching admin stats' },
      { status: 500 }
    )
  }
}
