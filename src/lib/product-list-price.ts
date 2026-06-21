import {
  formatBuyerProductPriceRange,
  getBuyerDisplayPrice,
  getOwnerProductRentalDisplayPrice,
  type DiscountFields,
} from '@/lib/discount-helpers'
import { getBuyerPrice } from '@/lib/platform-pricing'
import { formatVariantPriceRange, getVariantSalePrices } from '@/lib/product-variants'

export type ProductListPriceInput = DiscountFields & {
  variants?: Array<{ price?: number | null }> | null
  isRentable?: boolean
  rentalPriceTiers?: Array<{ minDays: number; pricePerDay: number }> | null
}

export function getProductListRentalPrice(
  product: Pick<ProductListPriceInput, 'isRentable' | 'rentalPriceTiers'>,
): number {
  if (!product.isRentable) return 0
  return getOwnerProductRentalDisplayPrice(product.rentalPriceTiers)
}

/** Seller-side list price: lowest sale variant price, or rental bundle price. */
export function getProductListDisplayPrice(product: ProductListPriceInput): number {
  const salePrices = getVariantSalePrices(product)
  if (salePrices.length > 0) {
    const minBuyPrice = Math.min(...salePrices)
    if (minBuyPrice > 0) return minBuyPrice
  }

  return getProductListRentalPrice(product)
}

/** Buyer-facing card label (discount applied when active). */
export function getProductListPriceLabel(product: ProductListPriceInput): string | null {
  const salePrices = getVariantSalePrices(product)
  if (salePrices.length === 0) {
    const rentalPrice = getProductListRentalPrice(product)
    return rentalPrice > 0
      ? `₾${getBuyerDisplayPrice(rentalPrice, product).toFixed(2)}`
      : null
  }

  return formatBuyerProductPriceRange(salePrices, product)
}

/** Buyer-facing original label for strikethrough when discounted. */
export function getProductListOriginalPriceLabel(product: ProductListPriceInput): string | null {
  const salePrices = getVariantSalePrices(product)
  if (salePrices.length === 0) {
    const rentalPrice = getProductListRentalPrice(product)
    return rentalPrice > 0 ? `₾${getBuyerPrice(rentalPrice).toFixed(2)}` : null
  }

  return formatVariantPriceRange(salePrices, getBuyerPrice)
}
