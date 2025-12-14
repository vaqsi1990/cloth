import { prisma } from '@/lib/prisma'

/**
 * Checks if a product's discount has expired and clears it if necessary
 * @param product Product with discount, discountDays, and discountStartDate
 * @returns true if discount was expired and cleared, false otherwise
 */
export async function checkAndClearExpiredDiscount(productId: number): Promise<boolean> {
  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        discount: true,
        discountDays: true,
        discountStartDate: true,
      },
    })

    if (!product || !product.discount || !product.discountDays || !product.discountStartDate) {
      return false
    }

    // Calculate expiration date
    const expirationDate = new Date(product.discountStartDate)
    expirationDate.setDate(expirationDate.getDate() + product.discountDays)

    // Check if discount has expired
    const now = new Date()
    if (now > expirationDate) {
      // Clear expired discount
      await prisma.product.update({
        where: { id: productId },
        data: {
          discount: null,
          discountDays: null,
          discountStartDate: null,
        },
      })
      return true
    }

    return false
  } catch (error) {
    console.error('Error checking expired discount:', error)
    return false
  }
}

/**
 * Checks and clears expired discounts for multiple products
 * @param productIds Array of product IDs to check
 * @returns Number of discounts cleared
 */
export async function checkAndClearExpiredDiscounts(productIds: number[]): Promise<number> {
  let clearedCount = 0
  for (const productId of productIds) {
    if (await checkAndClearExpiredDiscount(productId)) {
      clearedCount++
    }
  }
  return clearedCount
}

/**
 * Processes a product to check if discount has expired (without database update)
 * This is useful for checking before returning data to client
 * @param product Product object
 * @returns Product with discount cleared if expired, or original product
 */
export function processExpiredDiscount(product: any): any {
  if (!product.discount || !product.discountDays || !product.discountStartDate) {
    return product
  }

  // Calculate expiration date
  const discountStartDate = new Date(product.discountStartDate)
  const expirationDate = new Date(discountStartDate)
  expirationDate.setDate(expirationDate.getDate() + product.discountDays)

  // Check if discount has expired
  const now = new Date()
  if (now > expirationDate) {
    // Return product with discount cleared (but don't update DB yet)
    return {
      ...product,
      discount: null,
      discountDays: null,
      discountStartDate: null,
    }
  }

  return product
}
