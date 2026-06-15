import { prisma } from '@/lib/prisma'
import { getDiscountedPrice } from '@/lib/discount-helpers'
import { getSellerPriceFromBuyer } from '@/lib/platform-pricing'
import { processExpiredDiscount } from '@/utils/discountUtils'

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
              discount: true,
              discountDays: true,
              discountStartDate: true,
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
  }

  const sellerTotals = new Map<string, { userId: string; type: TransactionType; total: number }>()

  for (const item of order.items) {
    const sellerId = item.product?.userId
    if (!sellerId) {
      continue
    }

    const transactionType: TransactionType = item.isRental ? 'RENT' : 'SALE'
    const product = item.product ? processExpiredDiscount(item.product) : null
    const sellerDiscount =
      product?.discount && product.discount > 0 ? product.discount : 0
    const sellerListPerUnit = getSellerPriceFromBuyer(item.price || 0)
    const sellerPayablePerUnit = getDiscountedPrice(sellerListPerUnit, sellerDiscount)
    const itemTotal = sellerPayablePerUnit * (item.quantity || 1)
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
  }

  // Hide sold products by marking them as RESERVED (they remain in database but are hidden from listings)
  const soldProductIds = order.items
    .filter((item) => !item.isRental && typeof item.productId === 'number')
    .map((item) => item.productId as number)

  if (soldProductIds.length > 0) {
    await Promise.all(
      soldProductIds.map(productId =>
        prisma.product.update({
          where: { id: productId },
          data: { status: 'RESERVED' } // Mark as RESERVED to hide from public listings
        }).catch(error => {
          console.error(`Error updating product ${productId} status to RESERVED:`, error)
          return null
        })
      )
    )
  }
}


