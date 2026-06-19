import { getBuyerPrice, getSellerPriceFromBuyer, roundMoney } from '@/lib/platform-pricing'

export type CartPricingProduct = {
  variants?: Array<{ id?: number; price: number }> | null
  rentalPriceTiers?: Array<{ minDays: number; pricePerDay: number }> | null
}

export function computeRentalSellerTotal(
  days: number,
  tiers: Array<{ minDays: number; pricePerDay: number }>,
): number {
  if (!days || days <= 0 || tiers.length === 0) return 0

  const sortedDesc = [...tiers].sort((a, b) => b.minDays - a.minDays)
  const tier =
    sortedDesc.find((t) => days >= t.minDays) ||
    [...tiers].sort((a, b) => a.minDays - b.minDays)[0]

  return tier ? roundMoney(tier.pricePerDay * days) : 0
}

/** Current seller list price (X) from live product data. */
export function resolveSellerListPriceFromProduct(
  product: CartPricingProduct | null | undefined,
  options: { isRental: boolean; rentalDays: number | null; variantId?: number | null },
): number | null {
  if (!product) return null

  if (options.isRental) {
    const days = options.rentalDays
    if (!days || days <= 0) return null
    const total = computeRentalSellerTotal(days, product.rentalPriceTiers || [])
    return total > 0 ? total : null
  }

  const variants = product.variants || []
  if (variants.length === 0) return null

  const selected =
    options.variantId != null
      ? variants.find((variant) => variant.id === options.variantId)
      : variants[0]

  const price = selected?.price ?? variants[0]?.price
  return price != null && price > 0 ? roundMoney(price) : null
}

/** Old carts stored seller price; newer carts store buyer list price. */
export function normalizeLegacyStoredCartPrice(storedPrice: number): number {
  if (!Number.isFinite(storedPrice) || storedPrice <= 0) return 0

  const sellerFromBuyer = getSellerPriceFromBuyer(storedPrice)
  const roundTripBuyer = getBuyerPrice(sellerFromBuyer)

  if (Math.abs(storedPrice - roundTripBuyer) < 0.02) {
    return storedPrice
  }

  return getBuyerPrice(storedPrice)
}

/** Buyer list price (before product discount) — always derived from product when possible. */
export function resolveCartItemBuyerListPrice(input: {
  storedPrice: number
  isRental: boolean
  rentalDays: number | null
  variantId?: number | null
  product: CartPricingProduct | null | undefined
}): number {
  const sellerFromProduct = resolveSellerListPriceFromProduct(input.product, {
    isRental: input.isRental,
    rentalDays: input.rentalDays,
    variantId: input.variantId,
  })

  if (sellerFromProduct != null && sellerFromProduct > 0) {
    return getBuyerPrice(sellerFromProduct)
  }

  return normalizeLegacyStoredCartPrice(input.storedPrice)
}

export function cartPricesDiffer(stored: number, resolved: number): boolean {
  return Math.abs(stored - resolved) >= 0.01
}

export const cartProductPricingSelect = {
  discount: true,
  discountDays: true,
  discountStartDate: true,
  pricePerDay: true,
  variants: {
    select: { id: true, price: true },
    orderBy: { id: 'asc' as const },
  },
  rentalPriceTiers: {
    select: { minDays: true, pricePerDay: true },
    orderBy: { minDays: 'asc' as const },
  },
} as const
