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

export function getRentalBasePrice(
  tiers: Array<{ minDays: number; pricePerDay: number }>,
): number {
  const validTiers = tiers.filter(
    (tier) => tier.pricePerDay > 0 && tier.minDays > 0,
  )

  if (validTiers.length === 0) {
    return 0
  }

  const sortedTiers = [...validTiers].sort((a, b) => a.minDays - b.minDays)
  const firstTier = sortedTiers[0]
  return firstTier.minDays * firstTier.pricePerDay
}

export function getProductDiscountBasePrice(
  variants: Array<{ price?: number | null }>,
  rentalPriceTiers?: Array<{ minDays: number; pricePerDay: number }> | null,
): { basePrice: number; priceType: 'buy' | 'rental' | null } {
  const buyPrice = getProductBasePrice(variants)
  if (buyPrice > 0) {
    return { basePrice: buyPrice, priceType: 'buy' }
  }

  const rentalPrice = getRentalBasePrice(rentalPriceTiers || [])
  if (rentalPrice > 0) {
    return { basePrice: rentalPrice, priceType: 'rental' }
  }

  return { basePrice: 0, priceType: null }
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
