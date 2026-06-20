import type { ProductVariantFormRow } from '@/lib/product-variants'

export type RentalPriceTierFormRow = {
  minDays: number
  pricePerDay: number
}

export type ProductPricingMode = 'purchase' | 'rental'

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

export function productPricingModeToFlags(mode: ProductPricingMode): {
  showPurchaseOptions: boolean
  showRentalOptions: boolean
} {
  return {
    showPurchaseOptions: mode === 'purchase',
    showRentalOptions: mode === 'rental',
  }
}

export function flagsToProductPricingMode(
  showPurchaseOptions: boolean,
  showRentalOptions: boolean,
): ProductPricingMode | null {
  if (showPurchaseOptions && showRentalOptions) return 'purchase'
  if (showPurchaseOptions) return 'purchase'
  if (showRentalOptions) return 'rental'
  return null
}

export function resolveExclusivePricingFlagsFromProduct(input: {
  variants: Array<{ price?: number | null }>
  isRentable?: boolean
  rentalPriceTiers?: Array<{ pricePerDay?: number | null }> | null
}): { showPurchaseOptions: boolean; showRentalOptions: boolean } {
  const showPurchaseOptions = deriveShowPurchaseOptionsFromVariants(input.variants)
  const showRentalOptions = deriveShowRentalOptionsFromProduct(input)

  if (showPurchaseOptions && showRentalOptions) {
    return { showPurchaseOptions: true, showRentalOptions: false }
  }

  return { showPurchaseOptions, showRentalOptions }
}

export function buildPricingModeFormPatch(
  mode: ProductPricingMode,
  input: {
    variants: ProductVariantFormRow[]
    rentalPriceTiers?: RentalPriceTierFormRow[] | null
  },
): {
  isRentable: boolean
  rentalPriceTiers: RentalPriceTierFormRow[]
  variants: ProductVariantFormRow[]
} {
  if (mode === 'purchase') {
    return {
      isRentable: false,
      rentalPriceTiers: [{ minDays: 1, pricePerDay: 0 }],
      variants: input.variants.map((variant) => ({ ...variant })),
    }
  }

  return {
    isRentable: true,
    rentalPriceTiers: productHasRentalPricing(input.rentalPriceTiers)
      ? (input.rentalPriceTiers || [{ minDays: 1, pricePerDay: 0 }])
      : [{ minDays: 1, pricePerDay: 0 }],
    variants: input.variants.map((variant) => ({ ...variant, price: 0 })),
  }
}

export function prepareProductPricingSubmit(input: {
  showVariantOptions: boolean
  showPurchaseOptions: boolean
  showRentalOptions?: boolean
  variants: Array<ProductVariantFormRow & { discount?: number }>
  rentalPriceTiers?: RentalPriceTierFormRow[] | null
}) {
  const saleEnabled = Boolean(input.showPurchaseOptions && !input.showRentalOptions)
  const rentalEnabled = input.showVariantOptions
    ? Boolean(input.showRentalOptions && !input.showPurchaseOptions)
    : Boolean(input.showRentalOptions && !input.showPurchaseOptions)
  const hasRentalPrice =
    rentalEnabled && productHasRentalPricing(input.rentalPriceTiers)

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

  const hasSalePrice = saleEnabled && productVariantsHaveSalePrice(variantsToSubmit)

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
