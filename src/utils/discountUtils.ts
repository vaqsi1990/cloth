import { prisma } from '@/lib/prisma'
import { prismaCacheStrategy } from '@/lib/prisma-cache'
import {
  discountIsExpired,
  processExpiredDiscount,
  productHasActiveDiscount,
  type DiscountFields,
} from '@/lib/discount-helpers'

export { processExpiredDiscount, productHasActiveDiscount, type DiscountFields }

/**
 * Checks if a product's discount has expired and clears it if necessary
 */
export async function checkAndClearExpiredDiscount(productId: number): Promise<boolean> {
  try {
    const product = await prisma.product.findUnique({
      ...prismaCacheStrategy({ swr: 60, ttl: 60 }),
      where: { id: productId },
      select: {
        id: true,
        discount: true,
        discountDays: true,
        discountStartDate: true,
      },
    })

    if (!product || !discountIsExpired(product)) {
      return false
    }

    await prisma.product.update({
      where: { id: productId },
      data: {
        discount: null,
        discountDays: null,
        discountStartDate: null,
      },
    })
    return true
  } catch (error) {
    console.error('Error checking expired discount:', error)
    return false
  }
}

/**
 * Batch clear expired discounts — one read + one updateMany instead of N+1.
 */
export async function checkAndClearExpiredDiscounts(productIds: number[]): Promise<number> {
  if (productIds.length === 0) return 0

  const uniqueIds = [...new Set(productIds)]
  const products = await prisma.product.findMany({
    where: {
      id: { in: uniqueIds },
      discount: { not: null },
    },
    select: {
      id: true,
      discount: true,
      discountDays: true,
      discountStartDate: true,
    },
  })

  const expiredIds = products.filter(discountIsExpired).map((p) => p.id)
  if (expiredIds.length === 0) return 0

  await prisma.product.updateMany({
    where: { id: { in: expiredIds } },
    data: {
      discount: null,
      discountDays: null,
      discountStartDate: null,
    },
  })

  return expiredIds.length
}
