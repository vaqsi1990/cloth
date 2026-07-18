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

/** BOG split percents: owner gets 100% of listed item prices; platform gets 10% commission + delivery. */
export function computePaymentSplitPercents(
  totalAmount: number,
  productBuyerSubtotal: number,
  deliveryFee: number,
): { platformPercent: number; sellerPercent: number } | null {
  const ownerItemsSubtotal = getOwnerItemsSubtotalFromBuyer(productBuyerSubtotal)
  const splitAmounts = computePaymentSplitAmounts(
    totalAmount,
    ownerItemsSubtotal,
    deliveryFee,
  )
  if (!splitAmounts) return null

  let platformPercent = roundMoney((splitAmounts.platformAmount / totalAmount) * 100)
  let sellerPercent = roundMoney((splitAmounts.sellerAmount / totalAmount) * 100)
  const drift = roundMoney(100 - platformPercent - sellerPercent)

  if (drift !== 0) {
    platformPercent = roundMoney(platformPercent + drift)
  }

  return { platformPercent, sellerPercent }
}

/** BOG split amounts: owner gets 100% of listed item prices; platform gets 10% commission + delivery. */
export function computePaymentSplitAmounts(
  totalAmount: number,
  ownerItemsSubtotal: number,
  deliveryFee: number,
): { platformAmount: number; sellerAmount: number } | null {
  if (totalAmount <= 0 || ownerItemsSubtotal < 0) return null

  // After a voucher, seller share may be 0 (full product covered; only delivery left).
  const sellerAmount = roundMoney(Math.max(0, ownerItemsSubtotal))
  const platformCommission = getCommissionFromSellerPrice(sellerAmount)
  let platformAmount = roundMoney(platformCommission + Math.max(0, deliveryFee))

  const drift = roundMoney(totalAmount - platformAmount - sellerAmount)
  if (drift !== 0) {
    // Prefer absorbing rounding/voucher remainder on the platform side.
    platformAmount = roundMoney(platformAmount + drift)
  }

  if (platformAmount < 0) {
    return null
  }

  if (roundMoney(platformAmount + sellerAmount) !== roundMoney(totalAmount)) {
    return null
  }

  return { platformAmount, sellerAmount }
}

/** Derive owner item subtotal from buyer-facing item total (after voucher). */
export function getOwnerItemsSubtotalFromBuyer(productBuyerSubtotal: number): number {
  return getSellerPriceFromBuyer(productBuyerSubtotal)
}
