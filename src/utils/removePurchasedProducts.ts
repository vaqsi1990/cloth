import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { revalidateProductListCache } from '@/lib/product-list-query'
import { revalidateProductCaches } from '@/lib/product-cache-revalidation'
import {
  productHasSkuVariants,
  sumVariantStock,
} from '@/lib/product-variants'
import { resolveVariantIdForSaleItem } from '@/lib/sale-stock'

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

/**
 * Marks a sold SKU variant as out of stock and keeps the row so the shop can show it disabled.
 * Uses conditional update so concurrent payments cannot oversell the same variant.
 */
async function markSoldSkuVariantInTx(
  tx: TransactionClient,
  productId: number,
  variantId: number,
): Promise<'fulfilled' | 'already_sold'> {
  await tx.cartItem.deleteMany({
    where: { variantId },
  })

  const updated = await tx.productVariant.updateMany({
    where: { id: variantId, stock: { gt: 0 } },
    data: { stock: 0 },
  })

  if (updated.count === 0) {
    return 'already_sold'
  }

  const remainingVariants = await tx.productVariant.findMany({
    where: { productId },
    select: { stock: true },
  })

  await tx.product.update({
    where: { id: productId },
    data: {
      stock: sumVariantStock(remainingVariants),
    },
  })

  return 'fulfilled'
}

/** Simple listing: zero stock instead of deleting the product so inventory can be restored. */
async function markSoldSimpleProductInTx(
  tx: TransactionClient,
  productId: number,
): Promise<'fulfilled' | 'already_sold'> {
  await tx.cartItem.deleteMany({
    where: { productId },
  })

  const updated = await tx.product.updateMany({
    where: { id: productId, stock: { gt: 0 } },
    data: { stock: 0 },
  })

  if (updated.count === 0) {
    return 'already_sold'
  }

  await tx.productVariant.updateMany({
    where: { productId },
    data: { stock: 0 },
  })

  return 'fulfilled'
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
          stock: true,
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
        return
      }

      const variantExists = product.variants.some((variant) => variant.id === variantId)
      if (!variantExists) {
        return
      }

      const result = await prisma.$transaction(async (tx) =>
        markSoldSkuVariantInTx(tx, item.productId, variantId),
      )

      if (result === 'already_sold') {
        console.warn(
          `[fulfillSoldSaleItem] Variant ${variantId} already sold for product ${item.productId}${
            context.orderId ? ` (order ${context.orderId})` : ''
          }`,
        )
      }

      revalidateProductCaches(item.productId, { authorId: product.userId ?? undefined })
      return
    }

    const result = await prisma.$transaction(async (tx) =>
      markSoldSimpleProductInTx(tx, item.productId),
    )

    if (result === 'already_sold') {
      console.warn(
        `[fulfillSoldSaleItem] Product ${item.productId} already sold${
          context.orderId ? ` (order ${context.orderId})` : ''
        }`,
      )
    }

    revalidateProductCaches(item.productId, { authorId: product.userId ?? undefined })
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
 * Legacy helper — now zeros stock instead of deleting products.
 */
export async function removePurchasedProducts(
  productIds: number[],
  context: RemovalContext = {},
) {
  const uniqueIds = [...new Set(productIds)].filter(
    (id): id is number => typeof id === 'number',
  )

  for (const productId of uniqueIds) {
    await fulfillSoldSaleItem(
      { productId, variantId: null, quantity: 1 },
      context,
    )
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
