import type { SizeSystem } from '@prisma/client'
import type { ProductListingType } from '@/components/ProductTypeSelector'
import { productVariantsHaveSalePrice } from '@/lib/product-form-pricing'
import {
  convertMultiToSimpleFormState,
  convertSimpleToMultiVariantRows,
  type ProductVariantFormRow,
} from '@/lib/product-variants'

export type ProductListingFormSlice = {
  color?: string
  size?: string
  sizeSystem?: SizeSystem
  stock?: number
  imageUrls: string[]
  variants: ProductVariantFormRow[]
  isRentable?: boolean
  rentalPriceTiers?: Array<{ minDays: number; pricePerDay: number }>
}

function hasSalePricing(variants: ProductVariantFormRow[]): boolean {
  return productVariantsHaveSalePrice(variants)
}

function hasRentalPricing(input: {
  isRentable?: boolean
  rentalPriceTiers?: Array<{ pricePerDay?: number | null }> | null
}): boolean {
  return Boolean(
    input.isRentable &&
    input.rentalPriceTiers?.some((tier) => (tier.pricePerDay ?? 0) > 0),
  )
}

export function applyProductListingTypeChange(input: {
  type: ProductListingType
  formData: ProductListingFormSlice
  color: string
  showPurchaseOptions: boolean
  showRentalOptions: boolean
}): {
  showVariantOptions: boolean
  showPurchaseOptions: boolean
  showRentalOptions: boolean
  formData: ProductListingFormSlice
} {
  const isMulti = input.type === 'multi'

  if (!isMulti) {
    const simple = convertMultiToSimpleFormState({
      variants: input.formData.variants,
      imageUrls: input.formData.imageUrls,
      color: input.color,
      size: input.formData.size,
      sizeSystem: input.formData.sizeSystem,
      stock: input.formData.stock,
    })

    return {
      showVariantOptions: false,
      showPurchaseOptions:
        input.showPurchaseOptions && !input.showRentalOptions
          ? true
          : hasSalePricing(simple.variants) && !hasRentalPricing(input.formData),
      showRentalOptions:
        input.showRentalOptions && !input.showPurchaseOptions
          ? true
          : hasRentalPricing(input.formData) && !hasSalePricing(simple.variants),
      formData: {
        ...input.formData,
        color: simple.color ?? input.color,
        size: simple.size,
        sizeSystem: simple.sizeSystem,
        stock: simple.stock,
        imageUrls: simple.imageUrls,
        variants: simple.variants,
      },
    }
  }

  const multiVariants = convertSimpleToMultiVariantRows({
    color: input.color,
    size: input.formData.size,
    sizeSystem: input.formData.sizeSystem,
    stock: input.formData.stock,
    imageUrls: input.formData.imageUrls,
    variants: input.formData.variants,
  })

  return {
    showVariantOptions: true,
    showPurchaseOptions:
      input.showPurchaseOptions && !input.showRentalOptions
        ? true
        : hasSalePricing(multiVariants) && !hasRentalPricing(input.formData),
    showRentalOptions:
      input.showRentalOptions && !input.showPurchaseOptions
        ? true
        : hasRentalPricing(input.formData) && !hasSalePricing(multiVariants),
    formData: {
      ...input.formData,
      variants: multiVariants,
      imageUrls: [],
    },
  }
}
