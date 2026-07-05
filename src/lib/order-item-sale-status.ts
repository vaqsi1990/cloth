export type OrderItemSaleStatus = {
  sellerCanceledItem?: boolean | null
  sellerReportedOutOfStock?: boolean | null
  sellerReportedDamaged?: boolean | null
  sellerMarkedTransferred?: boolean | null
}

export function isFulfilledSaleItem(item: OrderItemSaleStatus): boolean {
  return item.sellerMarkedTransferred === true
}

export function isNegativeTerminalSaleItem(item: OrderItemSaleStatus): boolean {
  return (
    item.sellerCanceledItem === true ||
    item.sellerReportedOutOfStock === true ||
    item.sellerReportedDamaged === true
  )
}

/** Remaining sale items that still need fulfillment action. */
export function getPendingFulfillmentSaleItems<T extends OrderItemSaleStatus>(
  items: T[],
): T[] {
  return items.filter(
    (item) => !isFulfilledSaleItem(item) && !isNegativeTerminalSaleItem(item),
  )
}

/** Close the order only when nothing is left to fulfill. */
export function shouldCloseOrderAfterSaleItemChanges(
  items: OrderItemSaleStatus[],
): boolean {
  if (items.length === 0) return false

  const pendingItems = getPendingFulfillmentSaleItems(items)
  if (pendingItems.length > 0) return false

  return items.some(isNegativeTerminalSaleItem)
}

export function getSaleItemFulfillmentLabel(
  item: OrderItemSaleStatus,
): string | null {
  if (item.sellerMarkedTransferred) return 'გაცემული'
  if (item.sellerCanceledItem) return 'გაუქმებული'
  if (item.sellerReportedOutOfStock) return 'მარაგში არ მაქვს'
  if (item.sellerReportedDamaged) return 'დაზიანებულია'
  return null
}
