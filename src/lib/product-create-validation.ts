import { z } from 'zod'
import { validateSkuVariantRows } from '@/lib/product-variants'
import {
  getProductDiscountBasePrice,
  salePriceFromDiscount,
} from '@/lib/discount-helpers'

export const PRODUCT_IMAGE_REQUIRED_MESSAGE =
  'სურათის ატვირთვა აუცილებელია'

export const PRODUCT_PRICE_REQUIRED_MESSAGE =
  'მინიმუმ ერთი ფასი უნდა იყოს მითითებული — ქირაობის (დღეში) ან გაყიდვის'

export const PRODUCT_PRICING_MODE_REQUIRED_MESSAGE =
  'აირჩიეთ გაქირავება ან გაყიდვა'

export const PRODUCT_PRICING_MODE_EXCLUSIVE_MESSAGE =
  'პროდუქტი ან იყიდება, ან იქირავება — ორივე ერთდროულად არ შეიძლება'

export const MIN_PRODUCT_PRICE = 15

export const PRODUCT_MIN_PRICE_MESSAGE = `პროდუქტის მინიმალური ფასი უნდა იყოს ${MIN_PRODUCT_PRICE} ₾`

export const RENTAL_MIN_PRICE_PER_DAY_MESSAGE = `დღის ფასი არ უნდა იყოს ${MIN_PRODUCT_PRICE} ₾-ზე ნაკლები`

export const PRODUCT_DISCOUNT_NOT_ALLOWED_MESSAGE = `₾${MIN_PRODUCT_PRICE}-იან ან მასზე ნაკლები ფასის პროდუქტზე ფასდაკლების დაყენება შეუძლებელია`

export const PRODUCT_DISCOUNT_MIN_SALE_PRICE_MESSAGE = `ახალი ფასი არ უნდა იყოს ₾${MIN_PRODUCT_PRICE}-ზე ნაკლები`

export function canApplyProductDiscount(basePrice: number): boolean {
  return basePrice > MIN_PRODUCT_PRICE
}

const PRODUCT_FORM_FIELD_LABELS: Record<string, string> = {
  name: 'სახელი',
  description: 'აღწერა',
  slug: 'Slug',
  imageUrls: 'სურათები',
  rentalPriceTiers: 'ფასის გეგმა',
  pricingMode: 'ფასდაკლება',
  discount: 'ფასდაკლება',
  photoBackgroundConsent: 'თანხმობა',
  variants: 'ვარიანტები',
}

export function formatProductFormFieldError(fieldPath: string, message: string): string {
  const sizeDetailMatch = fieldPath.match(/^variants\.(\d+)\.sizeDetails\.(\d+)\./)
  if (sizeDetailMatch) {
    return `ვარიანტი ${Number(sizeDetailMatch[1]) + 1}, ზომა ${Number(sizeDetailMatch[2]) + 1}: ${message}`
  }

  const variantMatch = fieldPath.match(/^variants\.(\d+)\./)
  if (variantMatch) {
    return `ვარიანტი ${Number(variantMatch[1]) + 1}: ${message}`
  }

  const tierMatch = fieldPath.match(/^rentalPriceTiers\.(\d+)\./)
  if (tierMatch) {
    return `ფასის გეგმა ${Number(tierMatch[1]) + 1}: ${message}`
  }

  const label = PRODUCT_FORM_FIELD_LABELS[fieldPath] ?? fieldPath
  return `${label}: ${message}`
}

export function formatProductFormFieldErrors(errors: Record<string, string>): string {
  return Object.entries(errors)
    .map(([path, message]) => formatProductFormFieldError(path, message))
    .join('; ')
}

export function mapZodIssuesToProductFormErrors(
  issues: Array<{ path: PropertyKey[]; message: string }>,
): Record<string, string> {
  const errors: Record<string, string> = {}

  for (const issue of issues) {
    if (issue.path.length === 0) {
      continue
    }
    const fieldPath = issue.path.map(String).join('.')
    errors[fieldPath] = issue.message
  }

  return errors
}

type SkuVariantValidationOptions = {
  requireVariantSalePrices?: boolean
  requireVariantSize?: boolean
}

function buildSkuVariantValidationOptions(
  data: SkuVariantValidationOptions,
): Parameters<typeof validateSkuVariantRows>[1] {
  return {
    requireSalePrices: data.requireVariantSalePrices,
    requireSize: data.requireVariantSize !== false,
  }
}

export const productImageUrlsField = z
  .array(z.string().min(1, 'არასწორი URL'))
  .min(1, PRODUCT_IMAGE_REQUIRED_MESSAGE)

export const productImageUrlsFieldWithUrlValidation = z
  .array(z.string().url('არასწორი URL'))
  .min(1, PRODUCT_IMAGE_REQUIRED_MESSAGE)

type ProductPricingInput = {
  pricePerDay?: number | null
  variants?: Array<{ price?: number | null }>
  rentalPriceTiers?: Array<{ minDays?: number; pricePerDay?: number | null }> | null
  discount?: number | null
  discountDays?: number | null
}

function collectDiscountFieldErrors(data: ProductPricingInput): Record<string, string> {
  const errors: Record<string, string> = {}
  const hasDiscount = typeof data.discount === 'number' && data.discount > 0

  if (!hasDiscount) {
    return errors
  }

  const { basePrice } = getProductDiscountBasePrice(
    data.variants || [],
    (data.rentalPriceTiers || []) as Array<{ minDays: number; pricePerDay: number }>,
  )

  if (!canApplyProductDiscount(basePrice)) {
    errors.discount = PRODUCT_DISCOUNT_NOT_ALLOWED_MESSAGE
    return errors
  }

  const salePrice = salePriceFromDiscount(basePrice, data.discount)
  if (salePrice !== undefined && salePrice < MIN_PRODUCT_PRICE) {
    errors.discount = PRODUCT_DISCOUNT_MIN_SALE_PRICE_MESSAGE
  }

  return errors
}

function collectMinPriceFieldErrors(data: ProductPricingInput): Record<string, string> {
  const errors: Record<string, string> = {}

  if ((data.pricePerDay ?? 0) > 0 && (data.pricePerDay ?? 0) < MIN_PRODUCT_PRICE) {
    errors.pricePerDay = RENTAL_MIN_PRICE_PER_DAY_MESSAGE
  }

  if (Array.isArray(data.variants)) {
    data.variants.forEach((variant, index) => {
      const price = variant.price ?? 0
      if (price > 0 && price < MIN_PRODUCT_PRICE) {
        errors[`variants.${index}.price`] = PRODUCT_MIN_PRICE_MESSAGE
      }
    })
  }

  if (Array.isArray(data.rentalPriceTiers)) {
    data.rentalPriceTiers.forEach((tier, index) => {
      const pricePerDay = tier.pricePerDay ?? 0
      if (pricePerDay > 0 && pricePerDay < MIN_PRODUCT_PRICE) {
        errors[`rentalPriceTiers.${index}.pricePerDay`] = RENTAL_MIN_PRICE_PER_DAY_MESSAGE
      }
    })
  }

  return errors
}

export function hasBothProductPricingModes(data: ProductPricingInput): boolean {
  const hasRentalPrice =
    Array.isArray(data.rentalPriceTiers) &&
    data.rentalPriceTiers.some((tier) => (tier.pricePerDay ?? 0) > 0)
  const hasSalePrice =
    Array.isArray(data.variants) &&
    data.variants.some((variant) => (variant.price ?? 0) > 0)

  return hasRentalPrice && hasSalePrice
}

export function hasProductPricing(data: ProductPricingInput): boolean {
  if ((data.pricePerDay ?? 0) > 0) {
    return true
  }

  const hasRentalPrice =
    Array.isArray(data.rentalPriceTiers) &&
    data.rentalPriceTiers.some((tier) => (tier.pricePerDay ?? 0) > 0)
  const hasSalePrice =
    Array.isArray(data.variants) &&
    data.variants.some((variant) => (variant.price ?? 0) > 0)

  return hasRentalPrice || hasSalePrice
}

export function getProductCreateFieldErrors(data: {
  imageUrls?: string[]
  stock?: number
  variants?: Array<{ color?: string; size?: string; imageUrl?: string; price?: number | null; stock?: number | null }>
  isSkuVariantProduct?: boolean
  requireVariantSalePrices?: boolean
  requireVariantSize?: boolean
  showPurchaseOptions?: boolean
  showRentalOptions?: boolean
} & ProductPricingInput): Record<string, string> {
  const errors: Record<string, string> = {}

  if (data.isSkuVariantProduct) {
    if (!data.showPurchaseOptions && !data.showRentalOptions) {
      errors.pricingMode = PRODUCT_PRICING_MODE_REQUIRED_MESSAGE
    } else if (data.showPurchaseOptions && data.showRentalOptions) {
      errors.pricingMode = PRODUCT_PRICING_MODE_EXCLUSIVE_MESSAGE
    }

    Object.assign(
      errors,
      validateSkuVariantRows(data.variants || [], buildSkuVariantValidationOptions(data)),
    )
  } else if (!data.imageUrls || data.imageUrls.length === 0) {
    errors.imageUrls = PRODUCT_IMAGE_REQUIRED_MESSAGE
  } else if (data.showPurchaseOptions && data.showRentalOptions) {
    errors.pricingMode = PRODUCT_PRICING_MODE_EXCLUSIVE_MESSAGE
  } else if (!data.showPurchaseOptions && !data.showRentalOptions) {
    errors.pricingMode = PRODUCT_PRICING_MODE_REQUIRED_MESSAGE
  }

  if (
    !data.isSkuVariantProduct &&
    data.showPurchaseOptions &&
    !data.showRentalOptions
  ) {
    const saleStock = data.variants?.[0]?.stock ?? data.stock ?? 0
    if (saleStock < 1) {
      errors['variants.0.stock'] = 'რაოდენობა უნდა იყოს მინიმუმ 1'
    }
  }

  const pricingCheckData: ProductPricingInput = { ...data }
  if (data.isSkuVariantProduct && !data.showPurchaseOptions) {
    pricingCheckData.variants = (data.variants || []).map((variant) => ({
      ...variant,
      price: 0,
    }))
  }
  if (data.isSkuVariantProduct && !data.showRentalOptions) {
    pricingCheckData.rentalPriceTiers = []
    pricingCheckData.pricePerDay = 0
  }

  if (!errors.pricingMode && !hasProductPricing(pricingCheckData)) {
    errors.rentalPriceTiers = PRODUCT_PRICE_REQUIRED_MESSAGE
  } else if (!errors.pricingMode) {
    Object.assign(errors, collectMinPriceFieldErrors(pricingCheckData))
  }

  Object.assign(errors, collectDiscountFieldErrors(data))

  return errors
}

export function refineProductImagesAndPricing(
  data: {
    imageUrls?: string[]
    variants?: Array<{ color?: string; size?: string; imageUrl?: string; price?: number | null }>
    isSkuVariantProduct?: boolean
    requireVariantSalePrices?: boolean
    requireVariantSize?: boolean
  } & ProductPricingInput,
  ctx: z.RefinementCtx,
) {
  if (data.isSkuVariantProduct) {
    const skuErrors = validateSkuVariantRows(
      data.variants || [],
      buildSkuVariantValidationOptions(data),
    )
    for (const [pathKey, message] of Object.entries(skuErrors)) {
      const path = pathKey.split('.')
      const numericIndex = path.findIndex((segment) => /^\d+$/.test(segment))
      const zodPath =
        numericIndex >= 0
          ? [
              ...path.slice(0, numericIndex),
              Number(path[numericIndex]),
              ...path.slice(numericIndex + 1),
            ]
          : path

      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message,
        path: zodPath,
      })
    }
  } else if (!data.imageUrls || data.imageUrls.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: PRODUCT_IMAGE_REQUIRED_MESSAGE,
      path: ['imageUrls'],
    })
  }

  if (!hasProductPricing(data)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: PRODUCT_PRICE_REQUIRED_MESSAGE,
      path: ['rentalPriceTiers'],
    })
    return
  }

  if (hasBothProductPricingModes(data)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: PRODUCT_PRICING_MODE_EXCLUSIVE_MESSAGE,
      path: ['rentalPriceTiers'],
    })
    return
  }

  const minPriceErrors = collectMinPriceFieldErrors(data)
  for (const [pathKey, message] of Object.entries(minPriceErrors)) {
    const path = pathKey.split('.')
    const numericIndex = path.findIndex((segment) => /^\d+$/.test(segment))
    const zodPath =
      numericIndex >= 0
        ? [
            ...path.slice(0, numericIndex),
            Number(path[numericIndex]),
            ...path.slice(numericIndex + 1),
          ]
        : path

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message,
      path: zodPath,
    })
  }

  for (const [pathKey, message] of Object.entries(collectDiscountFieldErrors(data))) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message,
      path: pathKey === 'discount' ? ['discount'] : [pathKey],
    })
  }
}
