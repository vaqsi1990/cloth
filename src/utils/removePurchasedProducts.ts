import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

type RemovalContext = {
  orderId?: number
}

/**
 * Cleans up sold products:
 * - Detaches order items from the product record to avoid FK conflicts
 * - Clears the product from every cart
 * - Deletes the product entry (cascade removes images, variants, tiers, etc.)
 */
export async function removePurchasedProducts(
  productIds: number[],
  context: RemovalContext = {}
) {
  const uniqueIds = [...new Set(productIds)].filter(
    (id): id is number => typeof id === 'number'
  )

  for (const productId of uniqueIds) {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.orderItem.updateMany({
          where: { productId },
          data: { productId: null },
        })

        await tx.cartItem.deleteMany({
          where: { productId },
        })

        await tx.product.delete({
          where: { id: productId },
        })
      })
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        console.warn(
          `[removePurchasedProducts] Product ${productId} already removed${
            context.orderId ? ` (order ${context.orderId})` : ''
          }`
        )
        continue
      }

      console.error(
        `[removePurchasedProducts] Failed to remove product ${productId}${
          context.orderId ? ` (order ${context.orderId})` : ''
        }:`,
        error
      )
    }
  }
}


