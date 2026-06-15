import {
  isChildrenProductCategory,
  productMatchesCategoryFilter,
  type ProductCategory,
} from '@/lib/product-categories'
import { resolveProductColorFilterId } from '@/lib/product-colors'

export const PREDEFINED_LETTER_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']

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

export function resolveShopDisplaySizes(
  apiSizes: string[],
  isChildren: boolean,
): string[] {
  if (isChildren) {
    return sortChildrenAgeSizes([
      ...new Set([
        ...CHILDREN_AGE_SIZES,
        ...apiSizes.filter((size) => isChildrenAgeSize(size)),
      ]),
    ])
  }

  const fallback = apiSizes.length > 0 ? apiSizes : [...PREDEFINED_LETTER_SIZES]
  return sortShopFilterSizes(fallback.filter((size) => !isChildrenAgeSize(size)))
}

export function buildAdultProductFormSizeOptions(): ProductFormSizeOption[] {
  const options: ProductFormSizeOption[] = []
  const measurementSystems: ProductFormSizeSystem[] = ['EU', 'US', 'UK']

  measurementSystems.forEach((system) => {
    const sizes = Array.from(
      new Set(
        Object.values(LETTER_SIZE_TO_SYSTEM_SIZES)
          .map((entry) => entry[system]?.map((value) => String(value)) ?? [])
          .flat()
          .filter(Boolean),
      ),
    )

    sizes.forEach((size) => {
      options.push({
        value: `${system}:${size}`,
        label: `${system} - ${size}`,
        system,
        size,
      })
    })
  })

  PREDEFINED_LETTER_SIZES.forEach((sizeKey) => {
    options.push({
      value: `CN:${sizeKey}`,
      label: `CN - ${sizeKey}`,
      system: 'CN',
      size: sizeKey,
    })
  })

  return options
}

export function buildProductFormSizeOptions(
  gender: 'MEN' | 'WOMEN' | 'CHILDREN' | 'UNISEX' | string,
): ProductFormSizeOption[] {
  if (gender === 'CHILDREN') {
    return CHILDREN_AGE_SIZES.map((size) => ({
      value: size,
      label: size,
      size,
    }))
  }
  return buildAdultProductFormSizeOptions()
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

  const [system, ...sizeParts] = value.split(':')
  const nextSize = sizeParts.join(':')
  if (!system || !nextSize) {
    return { sizeSystem: undefined, size: undefined }
  }

  return {
    sizeSystem: system as ProductFormSizeSystem,
    size: nextSize,
  }
}

export function getProductFormSizeSelectValue(
  gender: 'MEN' | 'WOMEN' | 'CHILDREN' | 'UNISEX' | string,
  sizeSystem: string | undefined,
  size: string | undefined,
): string {
  if (!size?.trim()) return ''
  if (gender === 'CHILDREN') return size
  if (sizeSystem?.trim()) return `${sizeSystem}:${size}`
  return ''
}

/** Letter size → numeric (or CN letter) values per measurement system — matches product form. */
export const LETTER_SIZE_TO_SYSTEM_SIZES: Record<
  string,
  Partial<Record<'EU' | 'US' | 'UK' | 'CN', string[]>>
> = {
  XS: { EU: ['32', '34'], UK: ['4', '6'], US: ['0', '2'], CN: ['XS'] },
  S: { EU: ['36', '38'], UK: ['8', '10'], US: ['4', '6'], CN: ['S'] },
  M: { EU: ['40'], UK: ['12'], US: ['8'], CN: ['M'] },
  L: { EU: ['42'], UK: ['14'], US: ['10'], CN: ['L'] },
  XL: { EU: ['44'], UK: ['16'], US: ['12'], CN: ['XL'] },
  XXL: { EU: ['46'], UK: ['18'], US: ['14'], CN: ['XXL'] },
  XXXL: { EU: ['48'], UK: ['20'], US: ['16'], CN: ['XXXL'] },
}

export function isLetterSize(size: string): boolean {
  return PREDEFINED_LETTER_SIZES.includes(size.trim().toUpperCase())
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
    return normalized === sel || productUpper === sel.toUpperCase()
  })
}

export function collectAvailableSizes(
  products: Array<{ size?: string | null }>,
  options?: { isChildren?: boolean },
): string[] {
  const isChildren = options?.isChildren ?? false

  if (isChildren) {
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

  const sizes = new Set<string>(PREDEFINED_LETTER_SIZES)

  for (const product of products) {
    if (!product.size?.trim()) continue
    const normalized = product.size.trim()
    if (isChildrenAgeSize(normalized)) continue
    const upper = normalized.toUpperCase()
    sizes.add(PREDEFINED_LETTER_SIZES.includes(upper) ? upper : normalized)
  }

  return sortShopFilterSizes(Array.from(sizes))
}

export function buildShopFilterSizeOptions(
  rows: Array<{ sizeValue: string; sizeSystem: string | null }>,
  options?: { isChildren?: boolean },
): string[] {
  const isChildren = options?.isChildren ?? false

  if (isChildren) {
    const sizes = new Set<string>(CHILDREN_AGE_SIZES)
    for (const row of rows) {
      const raw = row.sizeValue.trim()
      if (raw && isChildrenAgeSize(raw)) {
        sizes.add(raw)
      }
    }
    return sortChildrenAgeSizes(Array.from(sizes))
  }

  const sizes = new Set<string>(PREDEFINED_LETTER_SIZES)

  for (const row of rows) {
    const raw = row.sizeValue.trim()
    if (!raw) continue
    if (isChildrenAgeSize(raw)) continue
    const upper = raw.toUpperCase()
    if (PREDEFINED_LETTER_SIZES.includes(upper)) continue
    sizes.add(raw)
  }

  return sortShopFilterSizes(Array.from(sizes))
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

function sortShopFilterSizes(sizes: string[]): string[] {
  return sizes.sort((a, b) => {
    const aIndex = PREDEFINED_LETTER_SIZES.indexOf(a.toUpperCase())
    const bIndex = PREDEFINED_LETTER_SIZES.indexOf(b.toUpperCase())
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
    if (aIndex !== -1) return -1
    if (bIndex !== -1) return 1
    return a.localeCompare(b, undefined, { numeric: true })
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
