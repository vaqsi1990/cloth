export type ProductStatusValue =
  | 'AVAILABLE'
  | 'RENTED'
  | 'RESERVED'
  | 'MAINTENANCE'
  | 'DAMAGED'

export const PRODUCT_STATUS_UPDATED_EVENT = 'dressla:product-status-updated'

export type ProductStatusUpdateDetail = {
  productId: number
  status: ProductStatusValue
}

export function broadcastProductStatusUpdate(detail: ProductStatusUpdateDetail): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent<ProductStatusUpdateDetail>(PRODUCT_STATUS_UPDATED_EVENT, {
      detail,
    }),
  )
}

/** Statuses hidden from public shop listing. */
export function isProductHiddenFromShop(status: string): boolean {
  return status === 'MAINTENANCE' || status === 'DAMAGED' || status === 'RESERVED'
}
