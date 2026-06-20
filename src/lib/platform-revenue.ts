import { prisma } from '@/lib/prisma'
import { roundMoney } from '@/lib/platform-pricing'
import { COMPLETED_SALE_ORDER_STATUSES } from '@/lib/sold-products'

/** Dressla platform share from completed orders: buyer total minus seller payouts. */
export async function calculatePlatformRevenue(): Promise<number> {
  const completedStatuses = [...COMPLETED_SALE_ORDER_STATUSES]

  const [orderSum, sellerPayoutSum] = await Promise.all([
    prisma.order.aggregate({
      where: { status: { in: completedStatuses } },
      _sum: { total: true },
    }),
    prisma.transaction.aggregate({
      where: {
        orderId: { not: null },
        order: { status: { in: completedStatuses } },
      },
      _sum: { total: true },
    }),
  ])

  const gross = orderSum._sum.total ?? 0
  const sellerPayouts = sellerPayoutSum._sum.total ?? 0

  return roundMoney(Math.max(0, gross - sellerPayouts))
}

export async function countCompletedOrders(): Promise<number> {
  return prisma.order.count({
    where: { status: { in: [...COMPLETED_SALE_ORDER_STATUSES] } },
  })
}
