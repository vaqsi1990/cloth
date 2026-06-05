import { prisma } from '@/lib/prisma'

type DiscountFields = {
  discount: number | null
  discountDays: number | null
  discountStartDate: Date | null
}

function discountIsExpired(product: DiscountFields): boolean {
  if (!product.discount || !product.discountDays || !product.discountStartDate) {
    return false
  }
  const expiration = new Date(product.discountStartDate)
  expiration.setDate(expiration.getDate() + product.discountDays)
  return Date.now() > expiration.getTime()
}

/**
 * Checks if a product's discount has expired and clears it if necessary
 */
export async function checkAndClearExpiredDiscount(productId: number): Promise<boolean> {
  try {
    const product = await prisma.product.findUnique({
      // @ts-ignore - cacheStrategy is available with Prisma Accelerate
      cacheStrategy: {
        swr: 60,
        ttl: 60,
      },
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

/**
 * Processes a product to check if discount has expired (without database update)
 */
export function processExpiredDiscount<T extends DiscountFields>(product: T): T {
  if (!discountIsExpired(product)) {
    return product
  }

  return {
    ...product,
    discount: null,
    discountDays: null,
    discountStartDate: null,
  }
}
