import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { revalidateProductListCache } from '@/lib/product-list-query'

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
        const rentals = await tx.rental.findMany({
          where: { productId },
          select: { id: true },
        })
        const rentalIds = rentals.map((rental) => rental.id)

        if (rentalIds.length > 0) {
          await tx.transaction.deleteMany({
            where: { rentalId: { in: rentalIds } },
          })
          await tx.rental.deleteMany({
            where: { id: { in: rentalIds } },
          })
        }

        await tx.rentalInquiry.deleteMany({
          where: { productId },
        })

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

/** Remove products that were sold in completed orders but still exist in the database. */
export async function purgeSoldProductsStillInDatabase() {
  const soldItems = await prisma.orderItem.findMany({
    where: {
      isRental: false,
      productId: { not: null },
      order: {
        status: { in: ['PAID', 'SHIPPED'] },
      },
    },
    select: { productId: true },
    distinct: ['productId'],
  })

  const productIds = soldItems
    .map((item) => item.productId)
    .filter((id): id is number => typeof id === 'number')

  if (productIds.length === 0) {
    return 0
  }

  await removePurchasedProducts(productIds)
  try {
    revalidateProductListCache()
  } catch (error) {
    console.warn('[purgeSoldProductsStillInDatabase] Cache revalidation skipped:', error)
  }
  return productIds.length
}


