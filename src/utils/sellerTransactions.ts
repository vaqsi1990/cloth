import { prisma } from '@/lib/prisma'
import { checkAndBlockUser, reevaluateUserBlocking } from '@/utils/revenue'
import { removePurchasedProducts } from '@/utils/removePurchasedProducts'

type TransactionType = 'SALE' | 'RENT'

/**
 * Create revenue transactions for product owners when an order is paid.
 * Aggregates totals per seller and transaction type to avoid duplicates.
 */
export async function recordSellerTransactions(orderId: number) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: {
        select: { id: true },
      },
      items: {
        include: {
          product: {
            select: {
              userId: true,
            },
          },
        },
      },
    },
  })

  if (!order) {
    console.warn(`[recordSellerTransactions] Order ${orderId} not found`)
    return
  }

  if (order.user?.id) {
    await prisma.transaction.deleteMany({
      where: {
        orderId: order.id,
        userId: order.user.id,
      },
    })
    await reevaluateUserBlocking(order.user.id)
  }

  const sellerTotals = new Map<string, { userId: string; type: TransactionType; total: number }>()

  for (const item of order.items) {
    const sellerId = item.product?.userId
    if (!sellerId) {
      continue
    }

    const transactionType: TransactionType = item.isRental ? 'RENT' : 'SALE'
    const itemTotal = (item.price || 0) * (item.quantity || 1)
    if (itemTotal <= 0) {
      continue
    }

    const key = `${sellerId}:${transactionType}`
    const existing = sellerTotals.get(key)
    if (existing) {
      existing.total += itemTotal
    } else {
      sellerTotals.set(key, { userId: sellerId, type: transactionType, total: itemTotal })
    }
  }

  for (const entry of sellerTotals.values()) {
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        orderId: order.id,
        userId: entry.userId,
        type: entry.type,
      },
    })

    if (existingTransaction) {
      continue
    }

    await prisma.transaction.create({
      data: {
        type: entry.type,
        total: entry.total,
        userId: entry.userId,
        orderId: order.id,
      },
    })

    await checkAndBlockUser(entry.userId)
  }

  const soldProductIds = order.items
    .filter((item) => !item.isRental && typeof item.productId === 'number')
    .map((item) => item.productId as number)

  if (soldProductIds.length) {
    await removePurchasedProducts(soldProductIds, { orderId: order.id })
  }
}


