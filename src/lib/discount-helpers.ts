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

export function getProductBasePrice(variants: Array<{ price?: number | null }>): number {
  const prices = variants
    .map((variant) => variant.price ?? 0)
    .filter((price) => price > 0)

  return prices.length > 0 ? Math.min(...prices) : 0
}

export function getDiscountedPrice(
  basePrice: number,
  discount?: number | null,
): number {
  if (!discount || discount <= 0) {
    return basePrice
  }

  return Math.max(0, basePrice - discount)
}

export function discountFromSalePrice(
  basePrice: number,
  salePrice?: number | null,
): number | undefined {
  if (!basePrice || basePrice <= 0 || salePrice === undefined || salePrice === null) {
    return undefined
  }

  if (Number.isNaN(salePrice) || salePrice <= 0 || salePrice >= basePrice) {
    return undefined
  }

  return Math.round((basePrice - salePrice) * 100) / 100
}

export function salePriceFromDiscount(
  basePrice: number,
  discount?: number | null,
): number | undefined {
  if (!basePrice || basePrice <= 0 || !discount || discount <= 0) {
    return undefined
  }

  return Math.round((basePrice - discount) * 100) / 100
}
