import { prisma } from '@/lib/prisma'
import { revalidateProductListCache } from '@/lib/product-list-query'
import { isSaleOrderItem } from '@/lib/order-item-snapshot'
import { updateProductStatus } from '@/lib/update-product-status'

export async function finalizeCanceledSaleProducts(orderId: number) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: { select: { id: true, userId: true } },
        },
      },
    },
  })

  if (!order) return

  const damagedProductIds = new Set<number>()

  for (const item of order.items) {
    if (!isSaleOrderItem(item.isRental) || item.productId == null) continue

    if (item.sellerReportedDamaged) {
      damagedProductIds.add(item.productId)
    }
  }

  for (const productId of damagedProductIds) {
    try {
      await updateProductStatus(productId, 'DAMAGED')
    } catch (error) {
      console.error(
        `[finalizeCanceledSaleProducts] Failed to mark product ${productId} as DAMAGED:`,
        error,
      )
    }
  }

  try {
    revalidateProductListCache()
  } catch {
    // non-fatal
  }
}
