import type { Prisma, SizeSystem } from '@prisma/client'
import { z } from 'zod'
import {
  ADULT_CLOTHING_SIZES,
  isAdultClothingSize,
  normalizeAdultClothingSize,
} from '@/lib/shop-product-filters'

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

export type ProductWithVariantsAndImages = ProductWithVariants & {
  images?: Array<{ url: string; position?: number | null }> | null
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

export function variantHasSkuFields(variant: ProductVariantSkuLike & { sizes?: string[] | null }): boolean {
  return Boolean(
    variant.color?.trim() ||
      variant.size?.trim() ||
      (variant.sizes || []).some((entry) => entry.trim()),
  )
}

export function productHasSkuVariants(product: { variants?: ProductVariantSkuLike[] | null }): boolean {
  const variants = product.variants || []
  return variants.some(variantHasSkuFields)
}

/** Prisma filter for products with color/size SKU variants. */
export function buildProductHasSkuVariantsWhere(): Prisma.ProductWhereInput {
  return {
    variants: {
      some: {
        OR: [
          { AND: [{ color: { not: null } }, { NOT: { color: '' } }] },
          { AND: [{ size: { not: null } }, { NOT: { size: '' } }] },
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
  return getVariantSizeOptions(product, color).map((option) => option.value)
}

export type VariantSizeOption = {
  value: string
  label: string
  disabled: boolean
  inStock: boolean
}

const SIZE_OPTION_ORDER = [...ADULT_CLOTHING_SIZES]

function compareVariantSizeOptions(a: VariantSizeOption, b: VariantSizeOption): number {
  const rank = (size: string) => {
    const normalized = normalizeAdultClothingSize(size.trim())
    const index = SIZE_OPTION_ORDER.indexOf(normalized as (typeof ADULT_CLOTHING_SIZES)[number])
    return index === -1 ? SIZE_OPTION_ORDER.length : index
  }

  const rankDiff = rank(a.value) - rank(b.value)
  if (rankDiff !== 0) return rankDiff
  return a.value.localeCompare(b.value, 'ka')
}

export function getVariantSizeOptions(
  product: ProductWithVariants,
  color?: string | null,
): VariantSizeOption[] {
  const normalizedColor = color?.trim() || null
  const sizeStock = new Map<string, number>()

  for (const variant of getNormalizedVariants(product)) {
    if (!variant.size) continue
    if (normalizedColor && variant.color !== normalizedColor) continue

    const currentStock = sizeStock.get(variant.size) ?? 0
    if ((variant.stock ?? 0) > currentStock) {
      sizeStock.set(variant.size, variant.stock ?? 0)
    }
  }

  return Array.from(sizeStock.entries())
    .map(([size, stock]) => {
      const label = normalizeAdultClothingSize(size)
      return {
        value: size,
        label: isAdultClothingSize(label) ? label : size,
        disabled: stock <= 0,
        inStock: stock > 0,
      }
    })
    .sort(compareVariantSizeOptions)
}

export function getInStockVariantSizes(
  product: ProductWithVariants,
  color?: string | null,
): string[] {
  return getVariantSizeOptions(product, color)
    .filter((option) => option.inStock)
    .map((option) => option.value)
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

export function getDefaultVariantSelection(
  product: ProductWithVariants,
): { color: string; size: string } {
  const variants = getNormalizedVariants(product)
  if (variants.length === 0) {
    return { color: '', size: '' }
  }

  const preferred =
    variants.find((variant) => (variant.stock ?? 0) > 0 && (variant.price ?? 0) > 0) ??
    variants.find((variant) => (variant.price ?? 0) > 0) ??
    variants[0]

  return {
    color: preferred.color?.trim() || '',
    size: preferred.size?.trim() || '',
  }
}

export type ProductVariantSizeDetail = {
  size: string
  price: number
  stock: number
}

export type ProductVariantFormRow = {
  color?: string
  size?: string
  /** Multiple sizes for the same color/image row in the form UI. */
  sizes?: string[]
  /** Per-size price and stock when multiple sizes are selected for one color. */
  sizeDetails?: ProductVariantSizeDetail[]
  sizeSystem?: SizeSystem
  price: number
  stock: number
  imageUrl?: string
}

export function getFormRowSizes(
  row: Pick<ProductVariantFormRow, 'sizeDetails' | 'sizes'> & { size?: string | null },
): string[] {
  const fromDetails = (row.sizeDetails || [])
    .map((entry) => entry.size.trim())
    .filter(Boolean)
  if (fromDetails.length > 0) {
    return fromDetails
  }

  const fromArray = (row.sizes || []).map((entry) => entry.trim()).filter(Boolean)
  if (fromArray.length > 0) {
    return fromArray
  }

  const single = row.size?.trim()
  return single ? [single] : []
}

export function getFormRowSizeDetails(
  row: {
    sizeDetails?: ProductVariantSizeDetail[]
    sizes?: string[]
    size?: string | null
    price?: number | null
    stock?: number | null
  },
): ProductVariantSizeDetail[] {
  if (row.sizeDetails?.length) {
    return row.sizeDetails
  }

  const sizes = getFormRowSizes(row)
  if (sizes.length === 0) {
    return []
  }

  return sizes.map((size) => ({
    size,
    price: row.price ?? 0,
    stock: row.stock ?? 0,
  }))
}

export function buildSizeDetailsForSelection(
  currentDetails: ProductVariantSizeDetail[] | undefined,
  selectedSizes: string[],
  fallback: { price: number; stock: number },
): ProductVariantSizeDetail[] {
  const detailBySize = new Map(
    (currentDetails || []).map((detail) => [detail.size, detail]),
  )

  return selectedSizes.map((size) => {
    const existing = detailBySize.get(size)
    if (existing) return existing
    return {
      size,
      price: fallback.price,
      stock: fallback.stock,
    }
  })
}

export function expandVariantFormRows(
  rows: ProductVariantFormRow[],
  options?: { perSizeSalePricing?: boolean },
): ProductVariantFormRow[] {
  const perSizeSalePricing = options?.perSizeSalePricing ?? true
  const expanded: ProductVariantFormRow[] = []

  for (const row of rows) {
    const shared = {
      color: row.color,
      sizeSystem: row.sizeSystem,
      imageUrl: row.imageUrl,
    }
    const sizes = getFormRowSizes(row)

    if (sizes.length === 0) {
      expanded.push({ ...shared, price: row.price, stock: row.stock })
      continue
    }

    if (!perSizeSalePricing) {
      for (const size of sizes) {
        expanded.push({
          ...shared,
          size,
          price: row.price,
          stock: row.stock,
        })
      }
      continue
    }

    const details = row.sizeDetails?.length ? row.sizeDetails : getFormRowSizeDetails(row)
    for (const detail of details) {
      expanded.push({
        ...shared,
        size: detail.size,
        price: detail.price,
        stock: detail.stock,
      })
    }
  }

  return expanded
}

function formRowGroupKey(
  row: {
    color?: string | null
    imageUrl?: string | null
    price?: number | null
    stock?: number | null
    sizeSystem?: SizeSystem | null
  },
  options?: { perSizeSalePricing?: boolean },
): string {
  const color = row.color?.trim() || ''
  const imageUrl = row.imageUrl?.trim() || ''
  const sizeSystem = row.sizeSystem || ''

  if (options?.perSizeSalePricing ?? true) {
    return [color, imageUrl, sizeSystem].join('\0')
  }

  return [color, imageUrl, String(row.price ?? 0), String(row.stock ?? 0), sizeSystem].join('\0')
}

export function groupSkuVariantsToFormRows(
  variants: Array<{
    color?: string | null
    size?: string | null
    sizeSystem?: SizeSystem | null
    price?: number | null
    stock?: number | null
    imageUrl?: string | null
  }>,
  options?: { perSizeSalePricing?: boolean },
): ProductVariantFormRow[] {
  const perSizeSalePricing = options?.perSizeSalePricing ?? true

  if (!perSizeSalePricing) {
    const groupMap = new Map<string, ProductVariantFormRow & { sizes: string[] }>()

    for (const variant of variants) {
      const color = variant.color?.trim() || undefined
      const size = variant.size?.trim()
      const key = formRowGroupKey(variant, { perSizeSalePricing: false })
      const existing = groupMap.get(key)

      if (existing) {
        if (size && !existing.sizes.includes(size)) {
          existing.sizes.push(size)
        }
        continue
      }

      groupMap.set(key, {
        color,
        sizeSystem: variant.sizeSystem || undefined,
        price: variant.price ?? 0,
        stock: variant.stock ?? 0,
        imageUrl: variant.imageUrl?.trim() || undefined,
        sizes: size ? [size] : [],
      })
    }

    return Array.from(groupMap.values()).map(({ sizes, ...row }) => ({
      ...row,
      sizes: sizes.length > 1 ? sizes : undefined,
      size: sizes.length === 1 ? sizes[0] : undefined,
    }))
  }

  const groupMap = new Map<
    string,
    ProductVariantFormRow & { sizeDetails: ProductVariantSizeDetail[] }
  >()

  for (const variant of variants) {
    const color = variant.color?.trim() || undefined
    const size = variant.size?.trim()
    const key = formRowGroupKey(variant, { perSizeSalePricing: true })
    const existing = groupMap.get(key)
    const detail: ProductVariantSizeDetail = {
      size: size || '',
      price: variant.price ?? 0,
      stock: variant.stock ?? 0,
    }

    if (existing) {
      if (size && !existing.sizeDetails.some((entry) => entry.size === size)) {
        existing.sizeDetails.push(detail)
      }
      continue
    }

    groupMap.set(key, {
      color,
      sizeSystem: variant.sizeSystem || undefined,
      price: variant.price ?? 0,
      stock: variant.stock ?? 0,
      imageUrl: variant.imageUrl?.trim() || undefined,
      sizeDetails: size ? [detail] : [],
    })
  }

  return Array.from(groupMap.values()).map(({ sizeDetails, ...row }) => {
    const sizes = sizeDetails.map((detail) => detail.size).filter(Boolean)
    const hasSizes = sizes.length > 0

    return {
      ...row,
      sizeDetails: hasSizes ? sizeDetails : undefined,
      sizes: sizes.length > 1 ? sizes : undefined,
      size: sizes.length === 1 ? sizes[0] : undefined,
      price: hasSizes ? (sizeDetails[0]?.price ?? row.price) : row.price,
      stock: hasSizes ? (sizeDetails[0]?.stock ?? row.stock) : row.stock,
    }
  })
}

export function patchVariantFormRow<T extends { variants: ProductVariantFormRow[] }>(
  state: T,
  index: number,
  patch: Partial<ProductVariantFormRow>,
): T {
  return {
    ...state,
    variants: state.variants.map((variant, variantIndex) =>
      variantIndex === index ? { ...variant, ...patch } : variant,
    ),
  }
}

export function validateSkuVariantRowSizesUniqueness(
  variants: Array<{
    color?: string | null
    size?: string | null
    sizes?: string[]
  }>,
): Record<string, string> {
  const errors: Record<string, string> = {}
  const colorSizeToIndex = new Map<string, number>()

  variants.forEach((variant, index) => {
    const color = variant.color?.trim().toLowerCase() || ''
    for (const size of getFormRowSizes(variant)) {
      const key = `${color}\0${size.trim().toLowerCase()}`
      const existingIndex = colorSizeToIndex.get(key)
      if (existingIndex !== undefined) {
        const message = 'ეს ზომა უკვე არჩეულია ამ ფერისთვის'
        errors[`variants.${index}.size`] = message
        if (!errors[`variants.${existingIndex}.size`]) {
          errors[`variants.${existingIndex}.size`] = message
        }
      } else {
        colorSizeToIndex.set(key, index)
      }
    }
  })

  return errors
}

export function getVariantImageUrls(variants: Array<{ imageUrl?: string | null }>): string[] {
  const seen = new Set<string>()
  const urls: string[] = []

  for (const variant of variants) {
    const url = variant.imageUrl?.trim()
    if (url && !seen.has(url)) {
      seen.add(url)
      urls.push(url)
    }
  }

  return urls
}

type VariantImageWriteRow = { imageUrl?: string | null }

export function isSkuVariantProductForWrite(input: {
  isSkuVariantProduct?: boolean
  variants?: VariantImageWriteRow[] | null
}): boolean {
  return input.isSkuVariantProduct ?? productHasSkuVariants({ variants: input.variants })
}

export function resolveProductImagesForWrite<T extends VariantImageWriteRow>(input: {
  isSkuVariantProduct?: boolean
  imageUrls: string[]
  variants: T[]
}): { imageUrls: string[]; variants: T[] } {
  const isSkuProduct = isSkuVariantProductForWrite(input)

  if (isSkuProduct) {
    return {
      imageUrls: getVariantImageUrls(input.variants),
      variants: input.variants,
    }
  }

  const imageUrls = input.imageUrls
    .map((url) => url.trim())
    .filter(Boolean)

  if (imageUrls.length === 0) {
    return { imageUrls, variants: input.variants }
  }

  const primaryImage = imageUrls[0]
  const variants = input.variants.map((variant) => ({
    ...variant,
    imageUrl: variant.imageUrl?.trim() || primaryImage,
  }))

  return { imageUrls, variants }
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
  stock?: number | null
  sizes?: string[]
  sizeDetails?: ProductVariantSizeDetail[]
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
  const displayPrice = Math.min(...formatted)

  return `₾${displayPrice.toFixed(2)}`
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
    if (requireSize && getFormRowSizes(variant).length === 0) {
      errors[`variants.${index}.size`] = 'ზომა აუცილებელია'
    }
    if (!variant.imageUrl?.trim()) {
      errors[`variants.${index}.imageUrl`] = 'სურათი აუცილებელია'
    }

    const sizeDetails = getFormRowSizeDetails(variant)
    if (requireSalePrices) {
      if (sizeDetails.length > 0) {
        sizeDetails.forEach((detail, detailIndex) => {
          if ((detail.price ?? 0) <= 0) {
            errors[`variants.${index}.sizeDetails.${detailIndex}.price`] = 'ფასი აუცილებელია'
          }
        })
      } else if ((variant.price ?? 0) <= 0) {
        errors[`variants.${index}.price`] = 'ფასი აუცილებელია'
      }
    }
  })

  Object.assign(errors, validateSkuVariantRowSizesUniqueness(variants))

  return errors
}

export function getOrderedProductImageUrls(
  product: ProductWithVariantsAndImages,
): string[] {
  const images = product.images || []
  return [...images]
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((image) => image.url.trim())
    .filter(Boolean)
}

/** Fill missing variant imageUrl values from product-level images (edit form / legacy rows). */
export function hydrateVariantRowsWithProductImages(
  rows: ProductVariantFormRow[],
  productImageUrls: string[],
): ProductVariantFormRow[] {
  if (productImageUrls.length === 0) {
    return rows
  }

  const imageByColor = new Map<string, string>()
  let nextImageIndex = 0

  return rows.map((row) => {
    const existingUrl = row.imageUrl?.trim()
    if (existingUrl) {
      return row
    }

    const color = row.color?.trim()
    if (color && imageByColor.has(color)) {
      return { ...row, imageUrl: imageByColor.get(color) }
    }

    const url =
      productImageUrls[nextImageIndex] ??
      productImageUrls[productImageUrls.length - 1]
    nextImageIndex += 1

    if (color) {
      imageByColor.set(color, url)
    }

    return { ...row, imageUrl: url }
  })
}

export function skuVariantsUsePerSizeSalePricing(
  variants: Array<{ price?: number | null }>,
): boolean {
  return variants.some((variant) => (variant.price ?? 0) > 0)
}

export function mapProductVariantsToFormRows(
  product: ProductWithVariantsAndImages,
): ProductVariantFormRow[] {
  const variants = product.variants || []
  const productImageUrls = getOrderedProductImageUrls(product)

  if (productHasSkuVariants(product)) {
    const perSizeSalePricing = skuVariantsUsePerSizeSalePricing(variants)
    return hydrateVariantRowsWithProductImages(
      groupSkuVariantsToFormRows(
        variants.map((variant) => ({
          color: variant.color?.trim() || undefined,
          size: variant.size?.trim() || undefined,
          sizeSystem: variant.sizeSystem || undefined,
          price: variant.price ?? 0,
          stock: variant.stock ?? 0,
          imageUrl: variant.imageUrl?.trim() || undefined,
        })),
        { perSizeSalePricing },
      ),
      productImageUrls,
    )
  }

  const pricedVariants = variants.filter((variant) => (variant.price ?? 0) > 0)
  if (pricedVariants.length > 1) {
    return hydrateVariantRowsWithProductImages(
      pricedVariants.map((variant, index) => ({
        color: index === 0 ? product.color?.trim() || undefined : undefined,
        size: index === 0 ? product.size?.trim() || undefined : undefined,
        sizeSystem: index === 0 ? product.sizeSystem || undefined : undefined,
        price: variant.price ?? 0,
        stock: index === 0 ? (product.stock ?? 0) : 0,
        imageUrl: variant.imageUrl?.trim() || undefined,
      })),
      productImageUrls,
    )
  }

  const basePrice = pricedVariants[0]?.price ?? variants[0]?.price ?? 0
  if (product.color || product.size || basePrice > 0) {
    return hydrateVariantRowsWithProductImages(
      [{
        color: product.color?.trim() || undefined,
        size: product.size?.trim() || undefined,
        sizeSystem: product.sizeSystem || undefined,
        price: basePrice,
        stock: product.stock ?? 0,
        imageUrl: variants[0]?.imageUrl?.trim() || undefined,
      }],
      productImageUrls,
    )
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
    imageUrl: base?.imageUrl,
  }]
}

/** Convert simple-product form state into the first multi-variant row (keeps price, stock, image). */
export function convertSimpleToMultiVariantRows(input: {
  color?: string
  size?: string
  sizeSystem?: SizeSystem
  stock?: number
  imageUrls?: string[]
  variants: ProductVariantFormRow[]
}): ProductVariantFormRow[] {
  const seeded = seedVariantRowsFromLegacyProduct({
    color: input.color,
    size: input.size,
    sizeSystem: input.sizeSystem,
    stock: input.stock,
    variants:
      input.variants.length > 0
        ? input.variants
        : [{ price: 0, stock: input.stock || 1 }],
  })

  const fallbackImage = input.imageUrls?.map((url) => url.trim()).find(Boolean)

  return seeded.map((variant, index) => ({
    ...variant,
    imageUrl:
      variant.imageUrl?.trim() ||
      (index === 0 ? fallbackImage : undefined) ||
      undefined,
  }))
}

/** Convert multi-variant form state back to a simple single-color product. */
export function convertMultiToSimpleFormState(input: {
  variants: ProductVariantFormRow[]
  imageUrls: string[]
  color?: string
  size?: string
  sizeSystem?: SizeSystem
  stock?: number
}): {
  color?: string
  size?: string
  sizeSystem?: SizeSystem
  stock: number
  imageUrls: string[]
  variants: ProductVariantFormRow[]
} {
  if (input.variants.length === 0) {
    return {
      color: input.color,
      size: input.size,
      sizeSystem: input.sizeSystem,
      stock: input.stock ?? 0,
      imageUrls: input.imageUrls,
      variants: [{ price: 0, stock: input.stock ?? 0 }],
    }
  }

  const first = input.variants[0]
  const variantImageUrls = getVariantImageUrls(input.variants)
  const fallbackImageUrls = input.imageUrls.map((url) => url.trim()).filter(Boolean)
  const imageUrls = variantImageUrls.length > 0 ? variantImageUrls : fallbackImageUrls
  const totalStock = sumVariantStock(input.variants) || input.stock || 0
  const salePrice =
    input.variants.find((variant) => (variant.price ?? 0) > 0)?.price ?? 0

  return {
    color: first.color?.trim() || input.color,
    size: first.size?.trim() || input.size,
    sizeSystem: first.sizeSystem || input.sizeSystem,
    stock: totalStock,
    imageUrls,
    variants: [{
      price: salePrice,
      stock: totalStock,
    }],
  }
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

export function formVariantRowsHaveSalePrice(variants: ProductVariantFormRow[]): boolean {
  return expandVariantFormRows(variants).some((variant) => (variant.price ?? 0) > 0)
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
