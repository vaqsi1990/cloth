import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  calculatePlatformRevenue,
  countCompletedOrders,
} from '@/lib/platform-revenue'

// GET - Fetch admin dashboard stats (admin only) - OPTIMIZED FOR SPEED
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const [productsCount, usersCount, ordersCount, totalRevenue] = await Promise.all([
      prisma.product.count(),
      prisma.user.count({ where: { role: 'USER' } }),
      countCompletedOrders(),
      calculatePlatformRevenue(),
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
