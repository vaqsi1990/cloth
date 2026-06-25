import type { ProductVariantFormRow } from '@/lib/product-variants'
import {
  buildSizeDetailsForSelection,
  expandVariantFormRows,
  getFormRowSizes,
} from '@/lib/product-variants'

export type RentalPriceTierFormRow = {
  minDays: number
  pricePerDay: number
}

export type ProductPricingMode = 'purchase' | 'rental'

export function productVariantsHaveSalePrice(
  variants: Array<{
    price?: number | null
    sizeDetails?: Array<{ price?: number | null }> | null
  }>,
): boolean {
  return variants.some((variant) => {
    if ((variant.price ?? 0) > 0) return true
    return (variant.sizeDetails || []).some((detail) => (detail.price ?? 0) > 0)
  })
}

export function productHasRentalPricing(
  rentalPriceTiers?: Array<{ pricePerDay?: number | null }> | null,
): boolean {
  return Boolean(rentalPriceTiers?.some((tier) => (tier.pricePerDay ?? 0) > 0))
}

export function deriveShowPurchaseOptionsFromVariants(
  variants: Array<{
    price?: number | null
    sizeDetails?: Array<{ price?: number | null }> | null
    size?: string | null
    sizes?: string[] | null
    stock?: number | null
  }>,
): boolean {
  const asFormRows = variants as ProductVariantFormRow[]
  if (asFormRows.some((variant) => variant.sizeDetails?.length || variant.sizes?.length || variant.size)) {
    return expandVariantFormRows(asFormRows).some((variant) => (variant.price ?? 0) > 0)
  }
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
    variants: input.variants.map((variant) => {
      const sizes = getFormRowSizes(variant)
      const sizeDetails =
        variant.sizeDetails?.length
          ? variant.sizeDetails.map((detail) => ({ ...detail, price: 0 }))
          : sizes.length > 0
            ? buildSizeDetailsForSelection(undefined, sizes, {
                price: 0,
                stock: variant.stock ?? 0,
              })
            : undefined

      return {
        ...variant,
        price: 0,
        sizeDetails,
        sizes: sizes.length > 1 ? sizes : undefined,
        size: sizes.length === 1 ? sizes[0] : variant.size,
      }
    }),
  }
}

export function getSimpleSaleStockValue(input: {
  stock?: number
  variants?: Array<{ stock?: number | null }>
}): number {
  return input.variants?.[0]?.stock ?? input.stock ?? 0
}

export function patchSimpleSaleFormState<
  T extends { stock?: number; variants: ProductVariantFormRow[] },
>(prev: T, patch: { price?: number; stock?: number }): T {
  const currentVariant = prev.variants[0]
  const resolvedStock =
    patch.stock !== undefined
      ? patch.stock
      : (currentVariant?.stock ?? prev.stock ?? 0)
  const resolvedPrice =
    patch.price !== undefined ? patch.price : (currentVariant?.price ?? 0)

  return {
    ...prev,
    stock: resolvedStock,
    variants: [
      {
        ...(currentVariant ?? {}),
        price: resolvedPrice,
        stock: resolvedStock,
      },
    ],
  }
}

export function prepareProductPricingSubmit(input: {
  showVariantOptions: boolean
  showPurchaseOptions: boolean
  showRentalOptions?: boolean
  productStock?: number
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
    variantsToSubmit = expandVariantFormRows(
      input.variants.map((variant) => ({
        ...variant,
        price: saleEnabled ? (variant.price ?? 0) : 0,
      })),
      { perSizeSalePricing: saleEnabled },
    )
  } else {
    const simpleSaleVariant = input.variants.find((variant) => (variant.price ?? 0) > 0) ?? input.variants[0]
    const resolvedStock = getSimpleSaleStockValue({
      stock: input.productStock,
      variants: simpleSaleVariant ? [simpleSaleVariant] : input.variants,
    })
    variantsToSubmit =
      saleEnabled && simpleSaleVariant && productVariantsHaveSalePrice([simpleSaleVariant])
        ? [{
            ...simpleSaleVariant,
            price: simpleSaleVariant.price ?? 0,
            stock: resolvedStock,
          }]
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
