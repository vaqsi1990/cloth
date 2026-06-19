import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function parseSince(value: string | null): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 },
      )
    }

    const { searchParams } = new URL(request.url)
    const usersSince = parseSince(searchParams.get('users'))
    const productsSince = parseSince(searchParams.get('products'))
    const ordersSince = parseSince(searchParams.get('orders'))
    const salesInfoSince = parseSince(searchParams.get('salesInfo'))

    const [
      pendingProductApprovals,
      newUsers,
      newOrders,
      newPaidSales,
    ] = await Promise.all([
      prisma.product.count({
        where: { approvalStatus: 'PENDING' },
      }),
      usersSince
        ? prisma.user.count({
            where: {
              role: 'USER',
              createdAt: { gt: usersSince },
            },
          })
        : Promise.resolve(0),
      ordersSince
        ? prisma.order.count({
            where: {
              createdAt: { gt: ordersSince },
              status: { in: ['PENDING', 'PAID', 'SHIPPED'] },
            },
          })
        : Promise.resolve(0),
      salesInfoSince
        ? prisma.order.count({
            where: {
              status: 'PAID',
              createdAt: { gt: salesInfoSince },
            },
          })
        : Promise.resolve(0),
    ])

    return NextResponse.json({
      success: true,
      alerts: {
        pendingProductApprovals,
        newUsers,
        newOrders,
        newPaidSales,
        productsSince: productsSince
          ? await prisma.product.count({
              where: {
                approvalStatus: 'PENDING',
                updatedAt: { gt: productsSince },
              },
            })
          : pendingProductApprovals,
      },
    })
  } catch (error) {
    console.error('Error fetching admin alerts:', error)
    return NextResponse.json(
      { success: false, error: 'Error fetching admin alerts' },
      { status: 500 },
    )
  }
}
