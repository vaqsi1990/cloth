import { z } from 'zod'

export const PRODUCT_IMAGE_REQUIRED_MESSAGE =
  'სურათის ატვირთვა აუცილებელია'

export const PRODUCT_PRICE_REQUIRED_MESSAGE =
  'მინიმუმ ერთი ფასი უნდა იყოს მითითებული — ქირაობის (დღეში) ან გაყიდვის'

export const productImageUrlsField = z
  .array(z.string().min(1, 'არასწორი URL'))
  .min(1, PRODUCT_IMAGE_REQUIRED_MESSAGE)

export const productImageUrlsFieldWithUrlValidation = z
  .array(z.string().url('არასწორი URL'))
  .min(1, PRODUCT_IMAGE_REQUIRED_MESSAGE)

type ProductPricingInput = {
  pricePerDay?: number | null
  variants?: Array<{ price?: number | null }>
  rentalPriceTiers?: Array<{ pricePerDay?: number | null }> | null
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
} & ProductPricingInput): Record<string, string> {
  const errors: Record<string, string> = {}

  if (!data.imageUrls || data.imageUrls.length === 0) {
    errors.imageUrls = PRODUCT_IMAGE_REQUIRED_MESSAGE
  }

  if (!hasProductPricing(data)) {
    errors.rentalPriceTiers = PRODUCT_PRICE_REQUIRED_MESSAGE
  }

  return errors
}

export function refineProductImagesAndPricing(
  data: { imageUrls?: string[] } & ProductPricingInput,
  ctx: z.RefinementCtx,
) {
  if (!data.imageUrls || data.imageUrls.length === 0) {
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
  }
}
