import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

type DbClient = Prisma.TransactionClient | typeof prisma

export async function removeCartItemsForVariant(
  variantId: number,
  client: DbClient = prisma,
) {
  return client.cartItem.deleteMany({ where: { variantId } })
}

export async function removeCartItemsForProduct(
  productId: number,
  client: DbClient = prisma,
) {
  return client.cartItem.deleteMany({ where: { productId } })
}

export async function removeCartItemsForProducts(
  productIds: number[],
  client: DbClient = prisma,
) {
  const uniqueIds = [...new Set(productIds)].filter(
    (id): id is number => typeof id === 'number' && Number.isFinite(id),
  )
  if (uniqueIds.length === 0) {
    return { count: 0 }
  }
  return client.cartItem.deleteMany({
    where: { productId: { in: uniqueIds } },
  })
}

/**
 * Drop cart lines that no longer reference a live product.
 * Covers legacy rows left by ON DELETE SET NULL on CartItem.productId.
 */
export async function purgeInvalidCartItems(cartId?: number) {
  const cartFilter = cartId ? { cartId } : {}

  const deletedWithoutProductId = await prisma.cartItem.deleteMany({
    where: {
      ...cartFilter,
      productId: null,
    },
  })

  const danglingItems = await prisma.cartItem.findMany({
    where: {
      ...cartFilter,
      productId: { not: null },
      product: { is: null },
    },
    select: { id: true },
  })

  let deletedDangling = { count: 0 }
  if (danglingItems.length > 0) {
    deletedDangling = await prisma.cartItem.deleteMany({
      where: { id: { in: danglingItems.map((item) => item.id) } },
    })
  }

  return deletedWithoutProductId.count + deletedDangling.count
}
