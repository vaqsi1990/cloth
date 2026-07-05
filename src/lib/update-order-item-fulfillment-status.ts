import { prisma } from '@/lib/prisma'
import { isSaleOrderItem } from '@/lib/order-item-snapshot'
import { restoreSaleItemStock } from '@/lib/order-out-of-stock'
import { REPORTABLE_SALE_ORDER_STATUSES } from '@/lib/order-out-of-stock'
import type { COMPLETED_SALE_ORDER_STATUSES } from '@/lib/sold-products'
import {
  buildOrderItemFulfillmentUpdate,
  ORDER_ITEM_RETURNED_STATUS_LABEL,
  type OrderItemFulfillmentStatus,
} from '@/lib/order-item-fulfillment-status'

const STATUS_MESSAGES: Record<OrderItemFulfillmentStatus, string> = {
  PENDING: 'სტატუსი შეიცვალა: მოლოდინში',
  TRANSFERRED: 'სტატუსი შეიცვალა: გაცემული',
  CANCELED: `სტატუსი შეიცვალა: ${ORDER_ITEM_RETURNED_STATUS_LABEL}`,
}

export async function updateOrderItemFulfillmentStatus(
  itemId: number,
  status: OrderItemFulfillmentStatus,
) {
  const orderItem = await prisma.orderItem.findUnique({
    where: { id: itemId },
    include: {
      order: { select: { id: true, status: true } },
    },
  })

  if (!orderItem) {
    return {
      ok: false as const,
      status: 404,
      message: 'შეკვეთის პროდუქტი ვერ მოიძებნა',
    }
  }

  if (
    !REPORTABLE_SALE_ORDER_STATUSES.includes(
      orderItem.order.status as (typeof COMPLETED_SALE_ORDER_STATUSES)[number],
    )
  ) {
    return {
      ok: false as const,
      status: 400,
      message: 'შეკვეთა უკვე გაუქმებულია ან ჯერ არ არის გადახდილი',
    }
  }

  const wasCanceled = orderItem.sellerCanceledItem

  const updated = await prisma.orderItem.update({
    where: { id: itemId },
    data: buildOrderItemFulfillmentUpdate(status),
    select: {
      id: true,
      sellerMarkedTransferred: true,
      sellerMarkedTransferredAt: true,
      sellerCanceledItem: true,
      sellerCanceledAt: true,
    },
  })

  if (
    status === 'CANCELED' &&
    !wasCanceled &&
    isSaleOrderItem(orderItem.isRental) &&
    orderItem.productId != null
  ) {
    await restoreSaleItemStock({
      productId: orderItem.productId,
      variantId: orderItem.variantId,
      quantity: orderItem.quantity ?? 1,
      color: orderItem.color,
      size: orderItem.size,
    })
  }

  return {
    ok: true as const,
    message: STATUS_MESSAGES[status],
    status,
    item: updated,
  }
}
