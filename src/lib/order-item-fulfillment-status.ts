import type { OrderItemSaleStatusFields } from '@/components/OrderItemSaleStatusActions'

export type OrderItemFulfillmentStatus = 'PENDING' | 'TRANSFERRED' | 'CANCELED'

export const ORDER_ITEM_FULFILLMENT_STATUS_LABELS: Record<
  OrderItemFulfillmentStatus,
  string
> = {
  PENDING: 'მოლოდინში',
  TRANSFERRED: 'გაცემული',
  CANCELED: 'გაუქმებული',
}

export function getOrderItemFulfillmentStatus(
  item: OrderItemSaleStatusFields,
): OrderItemFulfillmentStatus {
  if (item.sellerMarkedTransferred) return 'TRANSFERRED'
  if (item.sellerCanceledItem) return 'CANCELED'
  return 'PENDING'
}
