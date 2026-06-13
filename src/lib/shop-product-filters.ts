import {
  productMatchesCategoryFilter,
  type ProductCategory,
} from '@/lib/product-categories'
import { resolveProductColorFilterId } from '@/lib/product-colors'

export const PREDEFINED_LETTER_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']

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

  return Array.from(sizes).sort((a, b) => {
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
