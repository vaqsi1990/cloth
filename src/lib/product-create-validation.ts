import { z } from 'zod'
import { validateSkuVariantRows } from '@/lib/product-variants'

export const PRODUCT_IMAGE_REQUIRED_MESSAGE =
  'სურათის ატვირთვა აუცილებელია'

export const PRODUCT_PRICE_REQUIRED_MESSAGE =
  'მინიმუმ ერთი ფასი უნდა იყოს მითითებული — ქირაობის (დღეში) ან გაყიდვის'

export const MIN_PRODUCT_PRICE = 15

export const PRODUCT_MIN_PRICE_MESSAGE = `პროდუქტის მინიმალური ფასი უნდა იყოს ${MIN_PRODUCT_PRICE} ₾`

export const RENTAL_MIN_PRICE_PER_DAY_MESSAGE = `დღის ფასი არ უნდა იყოს ${MIN_PRODUCT_PRICE} ₾-ზე ნაკლები`

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
  variants?: Array<{ size?: string; imageUrl?: string; price?: number | null }>
  isSkuVariantProduct?: boolean
} & ProductPricingInput): Record<string, string> {
  const errors: Record<string, string> = {}

  if (data.isSkuVariantProduct) {
    Object.assign(errors, validateSkuVariantRows(data.variants || []))
  } else if (!data.imageUrls || data.imageUrls.length === 0) {
    errors.imageUrls = PRODUCT_IMAGE_REQUIRED_MESSAGE
  }

  if (!hasProductPricing(data)) {
    errors.rentalPriceTiers = PRODUCT_PRICE_REQUIRED_MESSAGE
  } else {
    Object.assign(errors, collectMinPriceFieldErrors(data))
  }

  return errors
}

export function refineProductImagesAndPricing(
  data: { imageUrls?: string[]; variants?: Array<{ size?: string; imageUrl?: string }>; isSkuVariantProduct?: boolean } & ProductPricingInput,
  ctx: z.RefinementCtx,
) {
  if (data.isSkuVariantProduct) {
    const skuErrors = validateSkuVariantRows(data.variants || [])
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
}
