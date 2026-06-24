import {
  DEFAULT_PRODUCT_CATEGORIES,
  findCategoryByParam,
  getFootwearGenderFromCategory,
  isChildrenProductCategory,
  isFootwearCategory,
  isFootwearCategoryId,
  productMatchesCategoryFilter,
  type ProductCategory,
} from '@/lib/product-categories'
import { resolveProductColorFilterId } from '@/lib/product-colors'

/** Adult clothing sizes (EU in parentheses). */
export const ADULT_CLOTHING_SIZES = [
  'XXS (32)',
  'XS (34)',
  'S (36)',
  'M (38)',
  'L (40–42)',
  'XL (44)',
  'XXL (46)',
  '3XL (48)',
  '4XL (50)',
  '5XL (52)',
  '6XL (54)',
] as const

export type AdultClothingSize = (typeof ADULT_CLOTHING_SIZES)[number]

/** @deprecated Use ADULT_CLOTHING_SIZES — kept for existing imports. */
export const PREDEFINED_LETTER_SIZES = [...ADULT_CLOTHING_SIZES]

/** Legacy short codes stored on older products → canonical label. */
export const LEGACY_ADULT_SIZE_TO_CANONICAL: Record<string, AdultClothingSize> = {
  XXS: 'XXS (32)',
  XS: 'XS (34)',
  S: 'S (36)',
  M: 'M (38)',
  L: 'L (40–42)',
  XL: 'XL (44)',
  XXL: 'XXL (46)',
  XXXL: '3XL (48)',
  '3XL': '3XL (48)',
  '4XL': '4XL (50)',
  '5XL': '5XL (52)',
  '6XL': '6XL (54)',
}

export function isAdultClothingSize(size: string): boolean {
  return ADULT_CLOTHING_SIZES.includes(size.trim() as AdultClothingSize)
}

export function normalizeAdultClothingSize(size: string): string {
  const trimmed = size.trim()
  if (isAdultClothingSize(trimmed)) return trimmed
  return LEGACY_ADULT_SIZE_TO_CANONICAL[trimmed.toUpperCase()] ?? trimmed
}

/** DB values that should match a shop filter size (includes legacy codes). */
export function getAdultSizeDbMatchValues(size: string): string[] {
  const canonical = normalizeAdultClothingSize(size)
  const values = new Set<string>([canonical])
  for (const [legacy, label] of Object.entries(LEGACY_ADULT_SIZE_TO_CANONICAL)) {
    if (label === canonical) values.add(legacy)
  }
  const euMatch = canonical.match(/\(([^)]+)\)/)
  if (euMatch?.[1]) {
    for (const part of euMatch[1].split(/[–-]/)) {
      const eu = part.trim()
      if (eu) values.add(eu)
    }
  }
  return [...values]
}

/** EU shoe sizes — women's footwear */
export const WOMEN_FOOTWEAR_SIZES = [
  '35.5',
  '36',
  '37',
  '38',
  '38.5',
  '39',
  '40',
] as const

/** EU shoe sizes — men's footwear */
export const MEN_FOOTWEAR_SIZES = [
  '39.5',
  '40',
  '41',
  '42',
  '43',
  '43.5',
  '44.5',
  '45',
  '46',
] as const

/** EU shoe sizes — children's footwear */
export const KIDS_FOOTWEAR_SIZES = [
  '20',
  '21',
  '22',
  '23',
  '24',
  '25',
  '26',
  '27',
  '28',
  '29',
  '30',
  '31',
] as const

export type FootwearGender = 'WOMEN' | 'MEN' | 'CHILDREN'

export function getFootwearSizesForGender(
  gender: 'MEN' | 'WOMEN' | 'CHILDREN' | 'UNISEX' | string,
): readonly string[] {
  if (gender === 'MEN') return MEN_FOOTWEAR_SIZES
  if (gender === 'CHILDREN') return KIDS_FOOTWEAR_SIZES
  return WOMEN_FOOTWEAR_SIZES
}

export function isFootwearSize(
  size: string,
  gender: 'MEN' | 'WOMEN' | 'CHILDREN' | 'UNISEX' | string,
): boolean {
  const normalized = size.trim()
  return getFootwearSizesForGender(gender).includes(normalized)
}

function sortFootwearSizes(sizes: string[]): string[] {
  const order = new Map<string, number>()
  for (const gender of ['WOMEN', 'MEN', 'CHILDREN'] as const) {
    getFootwearSizesForGender(gender).forEach((size, index) => {
      if (!order.has(size)) order.set(size, index)
    })
  }
  return sizes.sort((a, b) => {
    const aIndex = order.get(a) ?? Number.MAX_SAFE_INTEGER
    const bIndex = order.get(b) ?? Number.MAX_SAFE_INTEGER
    if (aIndex !== bIndex) return aIndex - bIndex
    return a.localeCompare(b, undefined, { numeric: true })
  })
}

/** Child age/size ranges — only for CHILDREN gender in forms and shop filter. */
export const CHILDREN_AGE_SIZES = [
  '0-3 თვე',
  '3-6 თვე',
  '6-9 თვე',
  '9-12 თვე',
  '1-2 წელი',
  '2-3 წელი',
  '3-4 წელი',
  '4-5 წელი',
  '5-6 წელი',
  '6-7 წელი',
  '7-8 წელი',
  '8-9 წელი',
  '9-10 წელი',
  '10-12 წელი',
  '12-14 წელი',
  '14-16 წელი',
] as const

export type ProductFormSizeSystem = 'EU' | 'US' | 'UK' | 'CN'

export type ProductFormSizeOption = {
  value: string
  label: string
  system?: ProductFormSizeSystem
  size: string
}

export function isChildrenAgeSize(size: string): boolean {
  const normalized = size.trim()
  return CHILDREN_AGE_SIZES.some((entry) => entry === normalized)
}

export function isChildrenShopGender(genderParam: string | null | undefined): boolean {
  return genderParam === 'children'
}

export type ShopGenderFilterValue = 'women' | 'men' | 'children'

export const SHOP_GENDER_FILTER_OPTIONS: Array<{
  value: ShopGenderFilterValue | null
  label: string
}> = [
  { value: null, label: 'ყველა' },
  { value: 'women', label: 'ქალი' },
  { value: 'men', label: 'კაცი' },
  { value: 'children', label: 'ბავშვი' },
]

export function isChildrenShopContext(input: {
  genderParam?: string | null
  categoryParam?: string | null
  selectedCategories?: string[]
  categories?: ProductCategory[]
}): boolean {
  const categories = input.categories ?? []

  if (isChildrenShopGender(input.genderParam)) {
    return true
  }

  if (isChildrenProductCategory(input.categoryParam, categories)) {
    return true
  }

  return (input.selectedCategories ?? []).some((category) =>
    isChildrenProductCategory(category, categories),
  )
}

export type ShopSizeDisplayContext = {
  isChildren?: boolean
  isFootwear?: boolean
  footwearGender?: FootwearGender | null
}

export function resolveFootwearGenderFromShopContext(input: {
  genderParam?: string | null
  categoryParam?: string | null
  selectedCategories?: string[]
  categories?: ProductCategory[]
}): FootwearGender | null {
  const categories = input.categories ?? DEFAULT_PRODUCT_CATEGORIES

  if (input.categoryParam) {
    const category = findCategoryByParam(input.categoryParam, categories)
    const fromCategory = getFootwearGenderFromCategory(category)
    if (fromCategory) return fromCategory
  }

  for (const selectedCategory of input.selectedCategories ?? []) {
    const category =
      categories.find((entry) => entry.name === selectedCategory) ??
      findCategoryByParam(selectedCategory, categories)
    const fromCategory = getFootwearGenderFromCategory(category)
    if (fromCategory) return fromCategory
  }

  if (input.genderParam === 'men') return 'MEN'
  if (input.genderParam === 'children') return 'CHILDREN'
  if (input.genderParam === 'women') return 'WOMEN'
  return null
}

export function isFootwearShopContext(input: {
  genderParam?: string | null
  categoryParam?: string | null
  selectedCategories?: string[]
  categories?: ProductCategory[]
}): boolean {
  const categories = input.categories ?? DEFAULT_PRODUCT_CATEGORIES

  if (input.categoryParam) {
    const category = findCategoryByParam(input.categoryParam, categories)
    if (category && isFootwearCategory(category)) return true
    if (input.categoryParam.includes('footwear')) return true
  }

  return (input.selectedCategories ?? []).some((selectedCategory) => {
    const category =
      categories.find((entry) => entry.name === selectedCategory) ??
      findCategoryByParam(selectedCategory, categories)
    if (category) return isFootwearCategory(category)
    const normalized = selectedCategory.toLowerCase()
    return (
      normalized.includes('ფეხსაცმ') ||
      normalized.includes('ტუფლ') ||
      normalized.includes('ბოტ') ||
      normalized.includes('სანდლ') ||
      normalized.includes('ჩუსტ') ||
      normalized.includes('ლოფერ') ||
      normalized.includes('ბალეტკ') ||
      normalized.includes('ჩექმ')
    )
  })
}

export function resolveShopDisplaySizes(
  apiSizes: string[],
  context: boolean | ShopSizeDisplayContext = false,
): string[] {
  const normalizedContext: ShopSizeDisplayContext =
    typeof context === 'boolean' ? { isChildren: context } : context

  if (normalizedContext.isFootwear && normalizedContext.footwearGender) {
    const base = [...getFootwearSizesForGender(normalizedContext.footwearGender)]
    for (const size of apiSizes) {
      const trimmed = size.trim()
      if (trimmed && !base.includes(trimmed)) {
        base.push(trimmed)
      }
    }
    return sortFootwearSizes(base)
  }

  if (normalizedContext.isChildren) {
    return sortChildrenAgeSizes([
      ...new Set([
        ...CHILDREN_AGE_SIZES,
        ...apiSizes.filter((size) => isChildrenAgeSize(size)),
      ]),
    ])
  }

  return [...PREDEFINED_LETTER_SIZES]
}

export function buildAdultProductFormSizeOptions(): ProductFormSizeOption[] {
  return ADULT_CLOTHING_SIZES.map((size) => ({
    value: size,
    label: size,
    system: 'EU' as const,
    size,
  }))
}

export type ProductFormSizeOptionsInput = {
  categoryId?: number
  categories?: ProductCategory[]
}

export function buildProductFormSizeOptions(
  gender: 'MEN' | 'WOMEN' | 'CHILDREN' | 'UNISEX' | string,
  options?: ProductFormSizeOptionsInput,
): ProductFormSizeOption[] {
  const categories = options?.categories ?? DEFAULT_PRODUCT_CATEGORIES
  const isFootwear = options?.categoryId
    ? isFootwearCategoryId(options.categoryId, categories)
    : false

  if (isFootwear) {
    return getFootwearSizesForGender(gender).map((size) => ({
      value: `EU:${size}`,
      label: size,
      system: 'EU' as const,
      size,
    }))
  }

  if (gender === 'CHILDREN') {
    return CHILDREN_AGE_SIZES.map((size) => ({
      value: size,
      label: size,
      size,
    }))
  }
  return buildAdultProductFormSizeOptions()
}

export function getProductFormSizeLabel(
  gender: 'MEN' | 'WOMEN' | 'CHILDREN' | 'UNISEX' | string,
  options?: ProductFormSizeOptionsInput,
): string {
  const categories = options?.categories ?? DEFAULT_PRODUCT_CATEGORIES
  const isFootwear = options?.categoryId
    ? isFootwearCategoryId(options.categoryId, categories)
    : false

  if (isFootwear) return 'ზომა (EU)'
  if (gender === 'CHILDREN') return 'ასაკი'
  return 'ზომა'
}

export function isValidProductFormSize(
  size: string,
  gender: 'MEN' | 'WOMEN' | 'CHILDREN' | 'UNISEX' | string,
  options?: ProductFormSizeOptionsInput,
): boolean {
  const normalized = size.trim()
  if (!normalized) return true

  const categories = options?.categories ?? DEFAULT_PRODUCT_CATEGORIES
  const isFootwear = options?.categoryId
    ? isFootwearCategoryId(options.categoryId, categories)
    : false

  if (isFootwear) return isFootwearSize(normalized, gender)
  if (gender === 'CHILDREN') return isChildrenAgeSize(normalized)
  return isAdultClothingSize(normalized)
}

export function parseProductFormSizeSelection(
  value: string,
  gender: 'MEN' | 'WOMEN' | 'CHILDREN' | 'UNISEX' | string,
): { sizeSystem?: ProductFormSizeSystem; size?: string } {
  if (!value) {
    return { sizeSystem: undefined, size: undefined }
  }

  if (gender === 'CHILDREN') {
    return { sizeSystem: undefined, size: value }
  }

  if (isAdultClothingSize(value)) {
    return { sizeSystem: 'EU', size: value }
  }

  const [system, ...sizeParts] = value.split(':')
  const nextSize = sizeParts.join(':')
  if (!system || !nextSize) {
    const legacy = LEGACY_ADULT_SIZE_TO_CANONICAL[value.trim().toUpperCase()]
    if (legacy) {
      return { sizeSystem: 'EU', size: legacy }
    }
    return { sizeSystem: undefined, size: undefined }
  }

  if (['EU', 'US', 'UK', 'CN'].includes(system)) {
    const legacy = LEGACY_ADULT_SIZE_TO_CANONICAL[nextSize.trim().toUpperCase()]
    if (legacy) {
      return { sizeSystem: 'EU', size: legacy }
    }
    if (isAdultClothingSize(nextSize)) {
      return { sizeSystem: 'EU', size: nextSize }
    }
    return {
      sizeSystem: system as ProductFormSizeSystem,
      size: nextSize,
    }
  }

  return { sizeSystem: undefined, size: undefined }
}

export function getProductFormSizeSelectValue(
  gender: 'MEN' | 'WOMEN' | 'CHILDREN' | 'UNISEX' | string,
  sizeSystem: string | undefined,
  size: string | undefined,
): string {
  if (!size?.trim()) return ''
  if (gender === 'CHILDREN') return size
  if (isAdultClothingSize(size)) return size
  const normalized = normalizeAdultClothingSize(size)
  if (isAdultClothingSize(normalized)) return normalized
  if (sizeSystem?.trim()) return `${sizeSystem}:${size}`
  return ''
}

/** Adult clothing filter → stored size values per measurement system. */
export const LETTER_SIZE_TO_SYSTEM_SIZES: Record<
  string,
  Partial<Record<'EU' | 'US' | 'UK' | 'CN', string[]>>
> = Object.fromEntries(
  ADULT_CLOTHING_SIZES.map((label) => {
    const matchValues = getAdultSizeDbMatchValues(label)
    return [label.toUpperCase(), { EU: matchValues, CN: matchValues }]
  }),
)

export function isLetterSize(size: string): boolean {
  const trimmed = size.trim()
  if (isAdultClothingSize(trimmed)) return true
  return Boolean(LEGACY_ADULT_SIZE_TO_CANONICAL[trimmed.toUpperCase()])
}

export function formatFilterCount(count: number): string {
  return String(count)
}

export function productMatchesColorFilter(
  productColor: string | null | undefined,
  selectedColorIds: string[],
): boolean {
  if (selectedColorIds.length === 0) return true

  const productNorm = productColor?.trim().toLowerCase()
  if (!productNorm) return false

  const productColorId = resolveProductColorFilterId(productColor)

  return selectedColorIds.some((selectedColorId) => {
    if (selectedColorId.startsWith('custom:')) {
      return productNorm === selectedColorId.slice('custom:'.length)
    }
    if (productColorId) return productColorId === selectedColorId
    return false
  })
}

export function productMatchesSizeFilter(
  productSize: string | null | undefined,
  selectedSizes: string[],
): boolean {
  if (selectedSizes.length === 0) return true
  if (!productSize?.trim()) return false

  const normalized = productSize.trim()
  const productUpper = normalized.toUpperCase()

  return selectedSizes.some((selectedSize) => {
    const sel = selectedSize.trim()
    if (normalized === sel || productUpper === sel.toUpperCase()) return true
    if (!isLetterSize(sel)) return false
    return getAdultSizeDbMatchValues(sel).some(
      (candidate) =>
        normalized === candidate || productUpper === candidate.toUpperCase(),
    )
  })
}

export function collectAvailableSizes(
  products: Array<{ size?: string | null }>,
  options?: ShopSizeDisplayContext,
): string[] {
  if (options?.isFootwear && options.footwearGender) {
    const sizes = new Set<string>(getFootwearSizesForGender(options.footwearGender))
    for (const product of products) {
      const normalized = product.size?.trim()
      if (normalized) sizes.add(normalized)
    }
    return sortFootwearSizes(Array.from(sizes))
  }

  if (options?.isChildren) {
    const sizes = new Set<string>(CHILDREN_AGE_SIZES)
    for (const product of products) {
      if (!product.size?.trim()) continue
      const normalized = product.size.trim()
      if (isChildrenAgeSize(normalized)) {
        sizes.add(normalized)
      }
    }
    return sortChildrenAgeSizes(Array.from(sizes))
  }

  return [...PREDEFINED_LETTER_SIZES]
}

export function buildShopFilterSizeOptions(
  rows: Array<{ sizeValue: string; sizeSystem: string | null }>,
  options?: ShopSizeDisplayContext,
): string[] {
  if (options?.isFootwear && options.footwearGender) {
    const sizes = new Set<string>(getFootwearSizesForGender(options.footwearGender))
    for (const row of rows) {
      const raw = row.sizeValue.trim()
      if (raw) sizes.add(raw)
    }
    return sortFootwearSizes(Array.from(sizes))
  }

  if (options?.isChildren) {
    const sizes = new Set<string>(CHILDREN_AGE_SIZES)
    for (const row of rows) {
      const raw = row.sizeValue.trim()
      if (raw && isChildrenAgeSize(raw)) {
        sizes.add(raw)
      }
    }
    return sortChildrenAgeSizes(Array.from(sizes))
  }

  return [...PREDEFINED_LETTER_SIZES]
}

function sortChildrenAgeSizes(sizes: string[]): string[] {
  const order = new Map<string, number>(
    CHILDREN_AGE_SIZES.map((size, index) => [size, index]),
  )
  return sizes.sort((a, b) => {
    const aIndex = order.get(a) ?? Number.MAX_SAFE_INTEGER
    const bIndex = order.get(b) ?? Number.MAX_SAFE_INTEGER
    if (aIndex !== bIndex) return aIndex - bIndex
    return a.localeCompare(b, 'ka')
  })
}

export function countProductsForColor(
  products: Array<{ color?: string | null }>,
  colorId: string,
): number {
  return products.filter((product) => productMatchesColorFilter(product.color, [colorId])).length
}

export function countProductsForCategory(
  products: Array<{
    categoryId?: number | null
    category?: { id?: number; name?: string; slug?: string } | null
  }>,
  category: ProductCategory,
  categories: ProductCategory[],
): number {
  return products.filter((product) =>
    productMatchesCategoryFilter(product, [category.name], categories),
  ).length
}
