import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { revalidateProductListCache } from '@/lib/product-list-query'
import { revalidateProductCaches } from '@/lib/product-cache-revalidation'
import {
  productHasSkuVariants,
  sumVariantStock,
} from '@/lib/product-variants'

type RemovalContext = {
  orderId?: number
}

export type SoldSaleItem = {
  productId: number
  variantId: number | null
  quantity: number
  color?: string | null
  size?: string | null
}

type TransactionClient = Prisma.TransactionClient

async function deleteEntireProductInTx(tx: TransactionClient, productId: number) {
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
}

/**
 * Removes a single sold SKU variant and keeps the product when others remain.
 */
async function removeSoldSkuVariantInTx(
  tx: TransactionClient,
  productId: number,
  variantId: number,
) {
  await tx.cartItem.deleteMany({
    where: { variantId },
  })

  await tx.productVariant.delete({
    where: { id: variantId },
  })

  const remainingVariants = await tx.productVariant.findMany({
    where: { productId },
    select: { stock: true },
  })

  if (remainingVariants.length === 0) {
    await deleteEntireProductInTx(tx, productId)
    return { deletedProduct: true as const, productId }
  }

  await tx.product.update({
    where: { id: productId },
    data: {
      stock: sumVariantStock(remainingVariants),
    },
  })

  return { deletedProduct: false as const, productId }
}

function resolveVariantIdForSaleItem(
  product: { variants: Array<{ id: number; color: string | null; size: string | null }> },
  item: SoldSaleItem,
): number | null {
  if (item.variantId) {
    return item.variantId
  }

  const color = item.color?.trim() || null
  const size = item.size?.trim() || null
  if (!color && !size) {
    return null
  }

  const match = product.variants.find((variant) => {
    const variantColor = variant.color?.trim() || null
    const variantSize = variant.size?.trim() || null
    return (color ? variantColor === color : true) && (size ? variantSize === size : true)
  })

  return match?.id ?? null
}

async function fulfillSoldSaleItem(item: SoldSaleItem, context: RemovalContext = {}) {
  const product = await prisma.product.findUnique({
    where: { id: item.productId },
    select: {
      userId: true,
      variants: {
        select: {
          id: true,
          color: true,
          size: true,
          imageUrl: true,
        },
      },
    },
  })

  if (!product) {
    return
  }

  const isSkuProduct = productHasSkuVariants(product)

  try {
    if (isSkuProduct) {
      const variantId = resolveVariantIdForSaleItem(product, item)
      if (!variantId) {
        console.warn(
          `[fulfillSoldSaleItem] Could not resolve variant for product ${item.productId}${
            context.orderId ? ` (order ${context.orderId})` : ''
          }`,
        )
        await removePurchasedProducts([item.productId], context)
        return
      }

      const variantExists = product.variants.some((variant) => variant.id === variantId)
      if (!variantExists) {
        return
      }

      const result = await prisma.$transaction(async (tx) =>
        removeSoldSkuVariantInTx(tx, item.productId, variantId),
      )

      if (!result.deletedProduct) {
        revalidateProductCaches(item.productId, { authorId: product.userId ?? undefined })
      }
      return
    }

    await removePurchasedProducts([item.productId], context)
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      console.warn(
        `[fulfillSoldSaleItem] Already fulfilled product ${item.productId}${
          context.orderId ? ` (order ${context.orderId})` : ''
        }`,
      )
      return
    }

    console.error(
      `[fulfillSoldSaleItem] Failed for product ${item.productId}${
        context.orderId ? ` (order ${context.orderId})` : ''
      }:`,
      error,
    )
  }
}

/**
 * After a sale payment: remove only the purchased variant(s), keep the listing when others remain.
 */
export async function fulfillSoldSaleItems(
  items: SoldSaleItem[],
  context: RemovalContext = {},
) {
  const seen = new Set<string>()

  for (const item of items) {
    const key = `${item.productId}:${item.variantId ?? `${item.color ?? ''}:${item.size ?? ''}`}`
    if (seen.has(key)) {
      continue
    }
    seen.add(key)

    await fulfillSoldSaleItem(item, context)
  }
}

/**
 * Legacy full-product removal for simple (single-item) listings.
 */
export async function removePurchasedProducts(
  productIds: number[],
  context: RemovalContext = {},
) {
  const uniqueIds = [...new Set(productIds)].filter(
    (id): id is number => typeof id === 'number',
  )

  for (const productId of uniqueIds) {
    try {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { userId: true },
      })

      await prisma.$transaction(async (tx) => {
        await deleteEntireProductInTx(tx, productId)
      })

      if (product?.userId) {
        revalidateProductCaches(productId, { authorId: product.userId })
      }
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        console.warn(
          `[removePurchasedProducts] Product ${productId} already removed${
            context.orderId ? ` (order ${context.orderId})` : ''
          }`,
        )
        continue
      }

      console.error(
        `[removePurchasedProducts] Failed to remove product ${productId}${
          context.orderId ? ` (order ${context.orderId})` : ''
        }:`,
        error,
      )
    }
  }
}

/** Fulfill legacy/pending sold order lines without deleting entire multi-variant products. */
export async function purgeSoldProductsStillInDatabase() {
  const soldItems = await prisma.orderItem.findMany({
    where: {
      isRental: false,
      productId: { not: null },
      order: {
        status: { in: ['PAID', 'SHIPPED'] },
      },
    },
    select: {
      productId: true,
      variantId: true,
      quantity: true,
      color: true,
      size: true,
    },
  })

  if (soldItems.length === 0) {
    return 0
  }

  await fulfillSoldSaleItems(
    soldItems
      .filter((item): item is typeof item & { productId: number } => item.productId != null)
      .map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity ?? 1,
        color: item.color,
        size: item.size,
      })),
  )

  try {
    revalidateProductListCache()
  } catch (error) {
    console.warn('[purgeSoldProductsStillInDatabase] Cache revalidation skipped:', error)
  }

  return soldItems.length
}
