import type { Prisma, SizeSystem } from '@prisma/client'
import { z } from 'zod'

export type ProductVariantSkuLike = {
  color?: string | null
  size?: string | null
  imageUrl?: string | null
}

export type ProductVariantRecord = ProductVariantSkuLike & {
  id: number
  sizeSystem?: SizeSystem | null
  stock?: number | null
  price: number
  sku?: string | null
}

export type ProductWithVariants = {
  color?: string | null
  size?: string | null
  sizeSystem?: SizeSystem | null
  stock?: number | null
  variants?: ProductVariantRecord[] | null
}

export const productVariantInputSchema = z.object({
  color: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.string().optional(),
  ),
  size: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.string().optional(),
  ),
  sizeSystem: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.enum(['EU', 'US', 'UK', 'CN']).optional(),
  ),
  price: z.number().min(0, 'ფასი უნდა იყოს დადებითი'),
  stock: z.number().int().min(0).default(0),
  imageUrl: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.string().url('არასწორი URL').optional(),
  ),
})

export type ProductVariantInput = z.infer<typeof productVariantInputSchema>

export function variantHasSkuFields(variant: ProductVariantSkuLike): boolean {
  return Boolean(variant.color?.trim() || variant.size?.trim() || variant.imageUrl?.trim())
}

export function productHasSkuVariants(product: { variants?: ProductVariantSkuLike[] | null }): boolean {
  const variants = product.variants || []
  return variants.some(variantHasSkuFields)
}

/** Prisma filter for products with color/size/image SKU variants. */
export function buildProductHasSkuVariantsWhere(): Prisma.ProductWhereInput {
  return {
    variants: {
      some: {
        OR: [
          { AND: [{ color: { not: null } }, { NOT: { color: '' } }] },
          { AND: [{ size: { not: null } }, { NOT: { size: '' } }] },
          { AND: [{ imageUrl: { not: null } }, { NOT: { imageUrl: '' } }] },
        ],
      },
    },
  }
}

export function hasPurchasableSaleVariants(
  variants: Array<{ stock?: number | null; price?: number | null }>,
): boolean {
  return variants.some((variant) => (variant.stock ?? 0) > 0 && (variant.price ?? 0) > 0)
}

export function sumVariantStock(
  variants: Array<{ stock?: number | null }>,
): number {
  return variants.reduce((total, variant) => total + (variant.stock ?? 0), 0)
}

export function normalizeVariantRecord(
  variant: ProductVariantRecord,
  product: ProductWithVariants,
): Required<Pick<ProductVariantRecord, 'color' | 'size' | 'sizeSystem' | 'stock' | 'price'>> & {
  id: number
  imageUrl: string | null
} {
  return {
    id: variant.id,
    color: variant.color?.trim() || product.color?.trim() || null,
    size: variant.size?.trim() || product.size?.trim() || null,
    sizeSystem: variant.sizeSystem || product.sizeSystem || null,
    stock: variant.stock ?? product.stock ?? 0,
    imageUrl: variant.imageUrl?.trim() || null,
    price: variant.price ?? 0,
  }
}

export function getNormalizedVariants(product: ProductWithVariants): Array<
  ReturnType<typeof normalizeVariantRecord>
> {
  const variants = product.variants || []
  if (variants.length === 0) {
    if (!product.size && !product.color) return []
    return [
      {
        id: 0,
        color: product.color?.trim() || null,
        size: product.size?.trim() || null,
        sizeSystem: product.sizeSystem || null,
        stock: product.stock ?? 0,
        price: 0,
        imageUrl: null,
      },
    ]
  }

  return variants.map((variant) => normalizeVariantRecord(variant, product))
}

export function getVariantColors(product: ProductWithVariants): string[] {
  const colors = new Set<string>()
  for (const variant of getNormalizedVariants(product)) {
    if (variant.color) colors.add(variant.color)
  }
  return Array.from(colors)
}

export function getVariantSizes(product: ProductWithVariants, color?: string | null): string[] {
  const sizes = new Set<string>()
  const normalizedColor = color?.trim() || null

  for (const variant of getNormalizedVariants(product)) {
    if (!variant.size) continue
    if (normalizedColor && variant.color !== normalizedColor) continue
    sizes.add(variant.size)
  }

  return Array.from(sizes)
}

export function findVariantBySelection(
  product: ProductWithVariants,
  selection: { color?: string | null; size?: string | null },
): ReturnType<typeof normalizeVariantRecord> | null {
  const color = selection.color?.trim() || null
  const size = selection.size?.trim() || null

  const variants = getNormalizedVariants(product)
  if (variants.length === 0) return null

  if (productHasSkuVariants(product)) {
    const exact = variants.find(
      (variant) =>
        (color ? variant.color === color : true) &&
        (size ? variant.size === size : true),
    )
    return exact || null
  }

  if (size) {
    return variants.find((variant) => variant.size === size) || variants[0] || null
  }

  return variants[0] || null
}

export type ProductVariantFormRow = {
  color?: string
  size?: string
  sizeSystem?: SizeSystem
  price: number
  stock: number
  imageUrl?: string
}

export function getVariantImageUrls(variants: Array<{ imageUrl?: string | null }>): string[] {
  return variants
    .map((variant) => variant.imageUrl?.trim())
    .filter((url): url is string => Boolean(url))
}

/** Unique variant image URLs for the current color/size selection (color alone is enough to switch gallery). */
export function getVariantImagesForSelection(
  product: ProductWithVariants,
  selection: { color?: string | null; size?: string | null },
): string[] {
  const color = selection.color?.trim() || null
  const size = selection.size?.trim() || null
  const urls: string[] = []
  const seen = new Set<string>()

  for (const variant of getNormalizedVariants(product)) {
    if (color && variant.color !== color) continue
    if (size && variant.size !== size) continue
    const url = variant.imageUrl?.trim()
    if (url && !seen.has(url)) {
      seen.add(url)
      urls.push(url)
    }
  }

  return urls
}

/** Sale prices for variants matching the current color/size selection. */
export function getVariantSalePricesForSelection(
  product: ProductWithVariants,
  selection: { color?: string | null; size?: string | null },
): number[] {
  const color = selection.color?.trim() || null
  const size = selection.size?.trim() || null
  const prices = new Set<number>()

  for (const variant of getNormalizedVariants(product)) {
    if (color && variant.color !== color) continue
    if (size && variant.size !== size) continue
    const price = variant.price ?? 0
    if (price > 0) prices.add(price)
  }

  return Array.from(prices)
}

export type ProductVariantSkuFormRow = ProductVariantSkuLike & {
  price?: number | null
}

export function getVariantSalePrices(
  product: { variants?: Array<{ price?: number | null }> | null },
): number[] {
  return (product.variants || [])
    .map((variant) => variant.price ?? 0)
    .filter((price) => price > 0)
}

export function formatVariantPriceRange(
  prices: number[],
  formatPrice: (price: number) => number = (price) => price,
): string | null {
  if (prices.length === 0) return null

  const formatted = prices.map((price) => formatPrice(price))
  const min = Math.min(...formatted)
  const max = Math.max(...formatted)

  if (min === max) {
    return `₾${min.toFixed(2)}`
  }

  return `₾${min.toFixed(2)} - ₾${max.toFixed(2)}`
}

export function validateSkuVariantRows(
  variants: ProductVariantSkuFormRow[],
  options?: {
    requireSalePrices?: boolean
    requireSize?: boolean
    requireColor?: boolean
  },
): Record<string, string> {
  const errors: Record<string, string> = {}

  if (variants.length === 0) {
    errors.variants = 'დაამატეთ მინიმუმ ერთი ვარიანტი'
    return errors
  }

  const requireSalePrices =
    options?.requireSalePrices ??
    variants.some((variant) => (variant.price ?? 0) > 0)
  const requireSize = options?.requireSize !== false
  const requireColor = options?.requireColor !== false

  variants.forEach((variant, index) => {
    if (requireColor && !variant.color?.trim()) {
      errors[`variants.${index}.color`] = 'ფერი აუცილებელია'
    }
    if (requireSize && !variant.size?.trim()) {
      errors[`variants.${index}.size`] = 'ზომა აუცილებელია'
    }
    if (!variant.imageUrl?.trim()) {
      errors[`variants.${index}.imageUrl`] = 'სურათი აუცილებელია'
    }
    if (requireSalePrices && (variant.price ?? 0) <= 0) {
      errors[`variants.${index}.price`] = 'ფასი აუცილებელია'
    }
  })

  return errors
}

export function mapProductVariantsToFormRows(
  product: ProductWithVariants,
): ProductVariantFormRow[] {
  const variants = product.variants || []

  if (productHasSkuVariants(product)) {
    return variants.map((variant) => ({
      color: variant.color?.trim() || undefined,
      size: variant.size?.trim() || undefined,
      sizeSystem: variant.sizeSystem || undefined,
      price: variant.price ?? 0,
      stock: variant.stock ?? 0,
      imageUrl: variant.imageUrl?.trim() || undefined,
    }))
  }

  const pricedVariants = variants.filter((variant) => (variant.price ?? 0) > 0)
  if (pricedVariants.length > 1) {
    return pricedVariants.map((variant, index) => ({
      color: index === 0 ? product.color?.trim() || undefined : undefined,
      size: index === 0 ? product.size?.trim() || undefined : undefined,
      sizeSystem: index === 0 ? product.sizeSystem || undefined : undefined,
      price: variant.price ?? 0,
      stock: index === 0 ? (product.stock ?? 0) : 0,
    }))
  }

  const basePrice = pricedVariants[0]?.price ?? variants[0]?.price ?? 0
  if (product.color || product.size || basePrice > 0) {
    return [{
      color: product.color?.trim() || undefined,
      size: product.size?.trim() || undefined,
      sizeSystem: product.sizeSystem || undefined,
      price: basePrice,
      stock: product.stock ?? 0,
    }]
  }

  return []
}

export function seedVariantRowsFromLegacyProduct(input: {
  color?: string
  size?: string
  sizeSystem?: SizeSystem
  stock?: number
  variants: ProductVariantFormRow[]
}): ProductVariantFormRow[] {
  const existing = input.variants
  if (existing.some((variant) => variant.color || variant.size)) {
    return existing
  }

  if (existing.length > 1) {
    return existing.map((variant, index) => ({
      ...variant,
      color: index === 0 ? input.color : variant.color,
      size: index === 0 ? input.size : variant.size,
      sizeSystem: index === 0 ? input.sizeSystem : variant.sizeSystem,
      stock: index === 0 ? (input.stock ?? variant.stock ?? 1) : (variant.stock ?? 0),
    }))
  }

  const base = existing[0]
  return [{
    color: input.color,
    size: input.size,
    sizeSystem: input.sizeSystem,
    price: base?.price ?? 0,
    stock: input.stock ?? base?.stock ?? 1,
  }]
}

export function mapVariantInputForCreate(variant: ProductVariantInput) {
  return {
    color: variant.color?.trim() || null,
    size: variant.size?.trim() || null,
    sizeSystem: variant.sizeSystem || null,
    price: variant.price,
    stock: variant.stock ?? 0,
    imageUrl: variant.imageUrl?.trim() || null,
  }
}

export function deriveProductFieldsFromVariants(
  variants: ProductVariantInput[],
  fallback: { color?: string; size?: string; sizeSystem?: SizeSystem; stock?: number },
) {
  const skuVariants = variants.filter(
    (variant) => Boolean(variant.color?.trim() || variant.size?.trim()),
  )

  if (skuVariants.length === 0) {
    return fallback
  }

  const first = skuVariants[0]
  return {
    color: fallback.color || first.color?.trim() || undefined,
    size: fallback.size || first.size?.trim() || undefined,
    sizeSystem: fallback.sizeSystem || first.sizeSystem || undefined,
    stock: skuVariants.reduce((sum, variant) => sum + (variant.stock ?? 0), 0),
  }
}

export function formatVariantLabel(variant: {
  color?: string | null
  size?: string | null
  sizeSystem?: SizeSystem | null
}): string {
  const parts: string[] = []
  if (variant.color) parts.push(variant.color)
  if (variant.size) {
    parts.push(variant.sizeSystem ? `${variant.size} (${variant.sizeSystem})` : variant.size)
  }
  return parts.join(' / ') || '—'
}
