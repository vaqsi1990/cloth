import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { revalidateProductListCache } from '@/lib/product-list-query'
import { revalidateProductCaches } from '@/lib/product-cache-revalidation'
import { COMPLETED_SALE_ORDER_STATUSES } from '@/lib/sold-products'
import {
  productHasSkuVariants,
  sumVariantStock,
} from '@/lib/product-variants'
import type { SoldSaleItem } from '@/utils/removePurchasedProducts'

export const REPORTABLE_SALE_ORDER_STATUSES = [...COMPLETED_SALE_ORDER_STATUSES] as const

export function orderHasOutOfStockReport(
  items: Array<{ sellerReportedOutOfStock?: boolean | null; isRental?: boolean | null }>,
): boolean {
  return items.some(
    (item) => !item.isRental && item.sellerReportedOutOfStock === true,
  )
}

async function restoreVariantStockInTx(
  tx: Prisma.TransactionClient,
  productId: number,
  variantId: number,
  quantity: number,
) {
  await tx.productVariant.update({
    where: { id: variantId },
    data: { stock: { increment: quantity } },
  })

  const remainingVariants = await tx.productVariant.findMany({
    where: { productId },
    select: { stock: true },
  })

  await tx.product.update({
    where: { id: productId },
    data: { stock: sumVariantStock(remainingVariants) },
  })
}

async function restoreSimpleProductStockInTx(
  tx: Prisma.TransactionClient,
  productId: number,
  quantity: number,
) {
  await tx.product.update({
    where: { id: productId },
    data: { stock: { increment: quantity } },
  })
}

export async function restoreSaleItemStock(item: SoldSaleItem) {
  const product = await prisma.product.findUnique({
    where: { id: item.productId },
    select: {
      userId: true,
      variants: {
        select: { id: true, color: true, size: true, imageUrl: true },
      },
    },
  })

  if (!product) return

  const quantity = item.quantity ?? 1

  if (productHasSkuVariants(product) && item.variantId) {
    const variantExists = product.variants.some((v) => v.id === item.variantId)
    if (!variantExists) return

    await prisma.$transaction(async (tx) => {
      await restoreVariantStockInTx(tx, item.productId, item.variantId!, quantity)
    })
  } else {
    await prisma.$transaction(async (tx) => {
      await restoreSimpleProductStockInTx(tx, item.productId, quantity)
    })
  }

  revalidateProductCaches(item.productId, { authorId: product.userId ?? undefined })
}

export async function cancelOrderForOutOfStock(orderId: number) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        where: { isRental: { not: true } },
        select: {
          id: true,
          productId: true,
          variantId: true,
          quantity: true,
          color: true,
          size: true,
          sellerReportedOutOfStock: true,
        },
      },
    },
  })

  if (!order) {
    return { ok: false as const, status: 404, message: 'შეკვეთა ვერ მოიძებნა' }
  }

  if (!REPORTABLE_SALE_ORDER_STATUSES.includes(order.status as (typeof REPORTABLE_SALE_ORDER_STATUSES)[number])) {
    return {
      ok: false as const,
      status: 400,
      message: 'გაუქმება შესაძლებელია მხოლოდ გადახდილი ან გაგზავნილი შეკვეთისთვის',
    }
  }

  if (!orderHasOutOfStockReport(order.items)) {
    return {
      ok: false as const,
      status: 400,
      message: 'შეკვეთაზე არ არის მითითებული „მარაგში არ მაქვს“',
    }
  }

  const saleItems = order.items
    .filter((item) => item.productId != null)
    .map((item) => ({
      productId: item.productId as number,
      variantId: item.variantId,
      quantity: item.quantity ?? 1,
      color: item.color,
      size: item.size,
    }))

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: { status: 'CANCELED', updatedAt: new Date() },
    })

    await tx.transaction.deleteMany({
      where: { orderId, type: 'SALE' },
    })
  })

  for (const item of saleItems) {
    await restoreSaleItemStock(item)
  }

  try {
    revalidateProductListCache()
  } catch {
    // non-fatal
  }

  return { ok: true as const, status: 200, message: 'შეკვეთა გადავიდა გაუქმებულებში' }
}
