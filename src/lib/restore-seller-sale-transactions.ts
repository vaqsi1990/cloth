import { prisma } from '@/lib/prisma'
import { isSaleOrderItem } from '@/lib/order-item-snapshot'
import { computeSellerSaleLineAmount } from '@/lib/seller-sale-amounts'
import { parseOrderItemProductSnapshot } from '@/lib/order-item-snapshot'
import { isSellerIncomeOrderStatus } from '@/lib/sold-products'

type RestoreResult = {
  orderId: number
  created: number
  skipped: number
}

/** Recreate missing seller SALE transactions from order item snapshots. */
export async function restoreMissingSellerSaleTransactionsForOrder(
  orderId: number,
): Promise<RestoreResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: {
            select: {
              userId: true,
              discount: true,
              discountDays: true,
              discountStartDate: true,
            },
          },
        },
      },
    },
  })

  if (!order || !isSellerIncomeOrderStatus(order.status)) {
    return { orderId, created: 0, skipped: 0 }
  }

  const sellerTotals = new Map<string, number>()

  for (const item of order.items) {
    if (!isSaleOrderItem(item.isRental)) continue

    const sellerId = item.sellerUserId ?? item.product?.userId
    if (!sellerId) continue

    const snapshot = parseOrderItemProductSnapshot(item.productSnapshot)
    const buyerUnitPrice = snapshot?.price ?? item.price
    const quantity = snapshot?.quantity ?? item.quantity
    const { sellerLineTotal } = computeSellerSaleLineAmount(
      buyerUnitPrice,
      quantity,
      item.product,
    )

    if (sellerLineTotal <= 0) continue

    sellerTotals.set(sellerId, (sellerTotals.get(sellerId) ?? 0) + sellerLineTotal)
  }

  let created = 0
  let skipped = 0

  for (const [sellerId, total] of sellerTotals) {
    const existing = await prisma.transaction.findFirst({
      where: {
        orderId,
        userId: sellerId,
        type: 'SALE',
      },
    })

    if (existing) {
      skipped += 1
      continue
    }

    await prisma.transaction.create({
      data: {
        type: 'SALE',
        total,
        userId: sellerId,
        orderId,
      },
    })
    created += 1
  }

  return { orderId, created, skipped }
}

export async function restoreAllMissingSellerSaleTransactions() {
  const orders = await prisma.order.findMany({
    where: {
      status: { in: ['PAID', 'SHIPPED', 'CANCELED'] },
    },
    select: { id: true },
    orderBy: { id: 'asc' },
  })

  const results: RestoreResult[] = []
  for (const order of orders) {
    results.push(await restoreMissingSellerSaleTransactionsForOrder(order.id))
  }

  return results
}

/**
 * Orders auto-closed by legacy item cancel should stay paid for income/history.
 * Only restores when every sale item is marked canceled at item level.
 */
export async function restorePaidStatusForItemCanceledOrders() {
  const orders = await prisma.order.findMany({
    where: { status: 'CANCELED' },
    include: {
      items: {
        select: {
          isRental: true,
          sellerCanceledItem: true,
        },
      },
    },
  })

  const restoredOrderIds: number[] = []

  for (const order of orders) {
    const saleItems = order.items.filter((item) => isSaleOrderItem(item.isRental))
    if (saleItems.length === 0) continue

    const allItemsCanceled = saleItems.every((item) => item.sellerCanceledItem)
    if (!allItemsCanceled) continue

    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'PAID', updatedAt: new Date() },
    })
    restoredOrderIds.push(order.id)
  }

  return restoredOrderIds
}
