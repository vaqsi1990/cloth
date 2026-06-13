import {
  productMatchesCategoryFilter,
  type ProductCategory,
} from '@/lib/product-categories'
import { resolveProductColorFilterId } from '@/lib/product-colors'

export const PREDEFINED_LETTER_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']

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
): string[] {
  const sizes = new Set<string>(PREDEFINED_LETTER_SIZES)

  for (const product of products) {
    if (!product.size?.trim()) continue
    const normalized = product.size.trim()
    const upper = normalized.toUpperCase()
    sizes.add(PREDEFINED_LETTER_SIZES.includes(upper) ? upper : normalized)
  }

  return sortShopFilterSizes(Array.from(sizes))
}

export function buildShopFilterSizeOptions(
  rows: Array<{ sizeValue: string; sizeSystem: string | null }>,
): string[] {
  const sizes = new Set<string>(PREDEFINED_LETTER_SIZES)

  for (const row of rows) {
    const raw = row.sizeValue.trim()
    if (!raw) continue
    const upper = raw.toUpperCase()
    if (PREDEFINED_LETTER_SIZES.includes(upper)) continue
    sizes.add(raw)
  }

  return sortShopFilterSizes(Array.from(sizes))
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
