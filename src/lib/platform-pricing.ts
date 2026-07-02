import { getDiscountedPrice } from '@/lib/discount-helpers'

export const PLATFORM_COMMISSION_RATE = 0.1

export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100
}

/** Seller-listed price X → buyer pays X × 1.10 */
export function getBuyerPrice(sellerPrice: number): number {
  if (!Number.isFinite(sellerPrice) || sellerPrice <= 0) return 0
  return roundMoney(sellerPrice * (1 + PLATFORM_COMMISSION_RATE))
}

/** Buyer total → seller share (X) */
export function getSellerPriceFromBuyer(buyerPrice: number): number {
  if (!Number.isFinite(buyerPrice) || buyerPrice <= 0) return 0
  return roundMoney(buyerPrice / (1 + PLATFORM_COMMISSION_RATE))
}

/** Commission on seller price: X × 10% */
export function getCommissionFromSellerPrice(sellerPrice: number): number {
  if (!Number.isFinite(sellerPrice) || sellerPrice <= 0) return 0
  return roundMoney(sellerPrice * PLATFORM_COMMISSION_RATE)
}

export function getBuyerPriceAfterSellerDiscount(
  sellerPrice: number,
  sellerDiscount?: number | null,
): number {
  const discountedSeller = getDiscountedPrice(sellerPrice, sellerDiscount)
  return getBuyerPrice(discountedSeller)
}

/** Savings shown to buyers when seller discount is D (seller currency). */
export function getBuyerSavingsFromSellerDiscount(sellerDiscount: number): number {
  if (!Number.isFinite(sellerDiscount) || sellerDiscount <= 0) return 0
  return roundMoney(sellerDiscount * (1 + PLATFORM_COMMISSION_RATE))
}

export function buyerFilterMinToSeller(buyerMin: number): number {
  if (!Number.isFinite(buyerMin) || buyerMin <= 0) return 0
  return Math.ceil((buyerMin / (1 + PLATFORM_COMMISSION_RATE)) * 100 - 1e-9) / 100
}

export function buyerFilterMaxToSeller(buyerMax: number): number {
  if (!Number.isFinite(buyerMax) || buyerMax <= 0) return 0
  return Math.floor((buyerMax / (1 + PLATFORM_COMMISSION_RATE)) * 100 + 1e-9) / 100
}

export function convertBuyerPriceFiltersToSeller(filters: {
  priceMin?: number | null
  priceMax?: number | null
}): { priceMin: number | null; priceMax: number | null } {
  return {
    priceMin:
      filters.priceMin != null && Number.isFinite(filters.priceMin)
        ? buyerFilterMinToSeller(filters.priceMin)
        : null,
    priceMax:
      filters.priceMax != null && Number.isFinite(filters.priceMax)
        ? buyerFilterMaxToSeller(filters.priceMax)
        : null,
  }
}

/** BOG split percents for a mixed order (products + optional delivery to platform). */
export function computePaymentSplitPercents(
  totalAmount: number,
  productBuyerSubtotal: number,
  deliveryFee: number,
): { platformPercent: number; sellerPercent: number } | null {
  if (totalAmount <= 0 || productBuyerSubtotal < 0) return null

  const sellerAmount = getSellerPriceFromBuyer(productBuyerSubtotal)
  const platformAmount = roundMoney(
    productBuyerSubtotal - sellerAmount + Math.max(0, deliveryFee),
  )

  let platformPercent = roundMoney((platformAmount / totalAmount) * 100)
  let sellerPercent = roundMoney((sellerAmount / totalAmount) * 100)
  const drift = roundMoney(100 - platformPercent - sellerPercent)

  if (drift !== 0) {
    platformPercent = roundMoney(platformPercent + drift)
  }

  return { platformPercent, sellerPercent }
}

/** BOG split amounts for a mixed order (products + optional delivery to platform). */
export function computePaymentSplitAmounts(
  totalAmount: number,
  productBuyerSubtotal: number,
  deliveryFee: number,
): { platformAmount: number; sellerAmount: number } | null {
  if (totalAmount <= 0 || productBuyerSubtotal < 0) return null

  const sellerAmount = getSellerPriceFromBuyer(productBuyerSubtotal)
  let platformAmount = roundMoney(
    productBuyerSubtotal - sellerAmount + Math.max(0, deliveryFee),
  )
  const drift = roundMoney(totalAmount - platformAmount - sellerAmount)
  if (drift !== 0) {
    platformAmount = roundMoney(platformAmount + drift)
  }

  if (roundMoney(platformAmount + sellerAmount) !== roundMoney(totalAmount)) {
    return null
  }

  return { platformAmount, sellerAmount }
}
