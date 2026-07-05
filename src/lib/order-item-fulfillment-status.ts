import type { OrderItemSaleStatusFields } from '@/components/OrderItemSaleStatusActions'

/** UI label for sellerCanceledItem — not OrderStatus.CANCELED / REFUNDED. */
export const ORDER_ITEM_RETURNED_STATUS_LABEL = 'უკან დაბრუნებული'

export const ORDER_ITEM_RETURNED_AT_LABEL = 'დაბრუნების თარიღი'

/** UI tri-state for seller/admin item fulfillment (OrderItem fields in schema). */
export type OrderItemFulfillmentStatus = 'PENDING' | 'TRANSFERRED' | 'CANCELED'

export const ORDER_ITEM_FULFILLMENT_STATUS_LABELS: Record<
  OrderItemFulfillmentStatus,
  string
> = {
  PENDING: 'მოლოდინში',
  TRANSFERRED: 'გაცემული',
  CANCELED: ORDER_ITEM_RETURNED_STATUS_LABEL,
}

/**
 * Maps OrderItem DB fields to UI status:
 * - sellerMarkedTransferred → გაცემული
 * - sellerCanceledItem → უკან დაბრუნებული
 * - both false → მოლოდინში
 *
 * Not related to RentalInquiryStatus.CANCELLED or OrderStatus.CANCELED/REFUNDED.
 */
export function getOrderItemFulfillmentStatus(
  item: OrderItemSaleStatusFields,
): OrderItemFulfillmentStatus {
  if (item.sellerMarkedTransferred === true) return 'TRANSFERRED'
  if (item.sellerCanceledItem === true) return 'CANCELED'
  return 'PENDING'
}

export type OrderItemFulfillmentDbUpdate = {
  sellerMarkedTransferred: boolean
  sellerMarkedTransferredAt: Date | null
  sellerCanceledItem: boolean
  sellerCanceledAt: Date | null
}

/** Writes seller/admin fulfillment status to OrderItem columns. */
export function buildOrderItemFulfillmentUpdate(
  status: OrderItemFulfillmentStatus,
  at: Date = new Date(),
): OrderItemFulfillmentDbUpdate {
  return {
    sellerMarkedTransferred: status === 'TRANSFERRED',
    sellerMarkedTransferredAt: status === 'TRANSFERRED' ? at : null,
    sellerCanceledItem: status === 'CANCELED',
    sellerCanceledAt: status === 'CANCELED' ? at : null,
  }
}

export function toOrderItemFulfillmentClientPatch(
  status: OrderItemFulfillmentStatus,
  item?: {
    sellerMarkedTransferredAt?: string | Date | null
    sellerCanceledAt?: string | Date | null
  },
): Pick<
  OrderItemSaleStatusFields,
  | 'sellerMarkedTransferred'
  | 'sellerMarkedTransferredAt'
  | 'sellerCanceledItem'
  | 'sellerCanceledAt'
> {
  const now = new Date().toISOString()
  return {
    sellerMarkedTransferred: status === 'TRANSFERRED',
    sellerMarkedTransferredAt:
      status === 'TRANSFERRED'
        ? item?.sellerMarkedTransferredAt
          ? String(item.sellerMarkedTransferredAt)
          : now
        : null,
    sellerCanceledItem: status === 'CANCELED',
    sellerCanceledAt:
      status === 'CANCELED'
        ? item?.sellerCanceledAt
          ? String(item.sellerCanceledAt)
          : now
        : null,
  }
}
