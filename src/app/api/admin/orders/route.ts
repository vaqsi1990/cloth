import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdminOrSupport } from '@/lib/roles'
import { Prisma } from '@prisma/client'
import { syncPaymentHoldWithBog } from '@/lib/payment-hold'

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
    const statusFilter = searchParams.get('status')
    const outOfStockOnly = searchParams.get('outOfStock') === 'true'

    const where: Prisma.OrderWhereInput = {}

    if (
      statusFilter &&
      ['PENDING', 'PAID', 'SHIPPED', 'CANCELED', 'REFUNDED'].includes(statusFilter)
    ) {
      where.status = statusFilter as Prisma.EnumOrderStatusFilter['equals']
    }

    if (outOfStockOnly) {
      where.items = {
        some: {
          sellerReportedOutOfStock: true,
          isRental: { not: true },
        },
      }
    }

    const transferredOnly = searchParams.get('transferred') === 'true'
    if (transferredOnly) {
      where.items = {
        some: {
          sellerMarkedTransferred: true,
          isRental: { not: true },
        },
      }
    }

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

    const holdOrdersToSync = orders.filter(
      (order) =>
        order.paymentCaptureMode === 'MANUAL' &&
        (order.paymentHoldStatus === 'CAPTURED' || order.paymentHoldStatus === 'BLOCKED'),
    )

    if (holdOrdersToSync.length > 0) {
      const syncResults = await Promise.all(
        holdOrdersToSync.slice(0, 15).map(async (order) => ({
          orderId: order.id,
          ...(await syncPaymentHoldWithBog(order.id)),
        })),
      )

      const changedIds = new Set(
        syncResults.filter((result) => result.changed).map((result) => result.orderId),
      )

      if (changedIds.size > 0) {
        const refreshed = await prisma.order.findMany({
          where: { id: { in: [...changedIds] } },
          select: { id: true, paymentHoldStatus: true, status: true },
        })
        const refreshedById = new Map(refreshed.map((order) => [order.id, order]))
        for (const order of orders) {
          const updated = refreshedById.get(order.id)
          if (updated) {
            order.paymentHoldStatus = updated.paymentHoldStatus
            order.status = updated.status
          }
        }
      }
    }

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
