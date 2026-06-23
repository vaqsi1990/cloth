import { prisma } from '@/lib/prisma'
import { revalidateProductListCache } from '@/lib/product-list-query'
import { COMPLETED_SALE_ORDER_STATUSES } from '@/lib/sold-products'
import { restoreSaleItemStock } from '@/lib/order-out-of-stock'
import type { SoldSaleItem } from '@/utils/removePurchasedProducts'

const RESTORABLE_STATUSES = [...COMPLETED_SALE_ORDER_STATUSES] as const

export async function restoreOrderSaleItems(orderId: number) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      items: {
        where: { isRental: { not: true }, productId: { not: null } },
        select: {
          productId: true,
          variantId: true,
          quantity: true,
          color: true,
          size: true,
        },
      },
    },
  })

  if (!order) return

  for (const item of order.items) {
    if (item.productId == null) continue
    await restoreSaleItemStock({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity ?? 1,
      color: item.color,
      size: item.size,
    })
  }

  try {
    revalidateProductListCache()
  } catch {
    // non-fatal
  }
}

export function shouldRestoreStockOnCancel(
  previousStatus: string,
  nextStatus: string,
): boolean {
  const wasFulfilled = RESTORABLE_STATUSES.includes(
    previousStatus as (typeof RESTORABLE_STATUSES)[number],
  )
  return wasFulfilled && nextStatus === 'REFUNDED'
}

export function mapOrderItemsToSoldSaleItems(
  items: Array<{
    productId: number | null
    variantId: number | null
    quantity: number
    color: string | null
    size: string | null
    isRental?: boolean | null
  }>,
): SoldSaleItem[] {
  return items
    .filter((item) => !item.isRental && item.productId != null)
    .map((item) => ({
      productId: item.productId as number,
      variantId: item.variantId,
      quantity: item.quantity ?? 1,
      color: item.color,
      size: item.size,
    }))
}
