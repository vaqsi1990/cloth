export type DiscountFields = {
  discount?: number | null
  discountDays?: number | null
  discountStartDate?: string | Date | null
}

export function discountIsExpired(product: DiscountFields): boolean {
  if (!product.discount || !product.discountDays || !product.discountStartDate) {
    return false
  }
  const expiration = new Date(product.discountStartDate)
  expiration.setDate(expiration.getDate() + product.discountDays)
  return Date.now() > expiration.getTime()
}

export function processExpiredDiscount<T extends DiscountFields>(product: T): T {
  if (!discountIsExpired(product)) {
    return product
  }

  return {
    ...product,
    discount: null,
    discountDays: null,
    discountStartDate: null,
  }
}

export function productHasActiveDiscount(product: DiscountFields): boolean {
  const processed = processExpiredDiscount(product)
  return typeof processed.discount === 'number' && processed.discount > 0
}
