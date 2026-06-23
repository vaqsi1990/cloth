import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { revalidateProductCaches } from '@/lib/product-cache-revalidation'
import { cancelSaleOrder } from '@/lib/cancel-sale-order'
import { COMPLETED_SALE_ORDER_STATUSES } from '@/lib/sold-products'
import {
  productHasSkuVariants,
  sumVariantStock,
} from '@/lib/product-variants'
import { resolveVariantIdForSaleItem } from '@/lib/sale-stock'
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

  const defaultVariant = await tx.productVariant.findFirst({
    where: { productId },
    orderBy: { id: 'asc' },
    select: { id: true },
  })

  if (defaultVariant) {
    await tx.productVariant.update({
      where: { id: defaultVariant.id },
      data: { stock: { increment: quantity } },
    })
  }
}

export async function restoreSaleItemStock(item: SoldSaleItem) {
  const product = await prisma.product.findUnique({
    where: { id: item.productId },
    select: {
      userId: true,
      stock: true,
      variants: {
        select: { id: true, color: true, size: true, stock: true },
      },
    },
  })

  if (!product) return

  const quantity = item.quantity ?? 1

  if (productHasSkuVariants(product)) {
    const variantId = resolveVariantIdForSaleItem(product, item)
    if (variantId) {
      const variantExists = product.variants.some((v) => v.id === variantId)
      if (!variantExists) return

      await prisma.$transaction(async (tx) => {
        await restoreVariantStockInTx(tx, item.productId, variantId, quantity)
      })

      revalidateProductCaches(item.productId, { authorId: product.userId ?? undefined })
      return
    }
  }

  await prisma.$transaction(async (tx) => {
    await restoreSimpleProductStockInTx(tx, item.productId, quantity)
  })

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

  const result = await cancelSaleOrder(orderId)
  if (!result.ok) {
    return result
  }

  return {
    ok: true as const,
    status: 200,
    message: 'შეკვეთა გადავიდა გაუქმებულებში',
  }
}
