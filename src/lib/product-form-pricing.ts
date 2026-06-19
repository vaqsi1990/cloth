import type { ProductVariantFormRow } from '@/lib/product-variants'

export type RentalPriceTierFormRow = {
  minDays: number
  pricePerDay: number
}

export function productVariantsHaveSalePrice(
  variants: Array<{ price?: number | null }>,
): boolean {
  return variants.some((variant) => (variant.price ?? 0) > 0)
}

export function productHasRentalPricing(
  rentalPriceTiers?: Array<{ pricePerDay?: number | null }> | null,
): boolean {
  return Boolean(rentalPriceTiers?.some((tier) => (tier.pricePerDay ?? 0) > 0))
}

export function deriveShowPurchaseOptionsFromVariants(
  variants: Array<{ price?: number | null }>,
): boolean {
  return productVariantsHaveSalePrice(variants)
}

export function deriveShowRentalOptionsFromProduct(input: {
  isRentable?: boolean
  rentalPriceTiers?: Array<{ pricePerDay?: number | null }> | null
}): boolean {
  return Boolean(input.isRentable && productHasRentalPricing(input.rentalPriceTiers))
}

export function prepareProductPricingSubmit(input: {
  showVariantOptions: boolean
  showPurchaseOptions: boolean
  showRentalOptions?: boolean
  variants: Array<ProductVariantFormRow & { discount?: number }>
  rentalPriceTiers?: RentalPriceTierFormRow[] | null
}) {
  const rentalEnabled = !input.showVariantOptions || Boolean(input.showRentalOptions)
  const hasRentalPrice =
    rentalEnabled && productHasRentalPricing(input.rentalPriceTiers)
  const saleEnabled = input.showPurchaseOptions

  let variantsToSubmit: Array<ProductVariantFormRow & { discount?: number }>
  if (input.showVariantOptions) {
    variantsToSubmit = input.variants.map((variant) => ({
      ...variant,
      price: saleEnabled ? (variant.price ?? 0) : 0,
    }))
  } else {
    variantsToSubmit =
      saleEnabled && productVariantsHaveSalePrice(input.variants)
        ? input.variants
        : []
  }

  const hasSalePrice = productVariantsHaveSalePrice(variantsToSubmit)

  return {
    hasRentalPrice,
    hasSalePrice,
    isRentable: hasRentalPrice,
    variantsToSubmit,
    rentalPriceTiers: hasRentalPrice
      ? (input.rentalPriceTiers || []).map((tier) => ({
          ...tier,
          minDays: tier.minDays < 1 ? 1 : tier.minDays,
        }))
      : input.showVariantOptions
        ? []
        : undefined,
  }
}
