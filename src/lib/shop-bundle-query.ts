import { buildShopColorFacets } from '@/lib/product-colors'
import { buildShopCategoryFacetCounts } from '@/lib/product-categories'
import { resolveCategoryIdsForFilter } from '@/lib/product-category-resolve'
import {
  getCategoryIdBySlugParam,
  isChildrenProductCategory,
  resolveCategorySlugParam,
} from '@/lib/product-categories'
import {
  countActiveDiscountProducts,
  countActiveVipProducts,
  finalizeProductListResponse,
  getHttpCacheControl,
  getProductCategoryCounts,
  getProductColorCounts,
  getProductSizeCounts,
  getShopCatalogPriceMax,
  loadPublicProductList,
  type PublicListFilters,
} from '@/lib/product-list-query'
import { fetchBatchRentalStatus, type BatchRentalStatusMap } from '@/lib/product-rental-status-batch'
import { buildShopFilterSizeOptions } from '@/lib/shop-product-filters'
import { parseShopListFilterParams } from '@/lib/shop-list-params'
import {
  convertBuyerPriceFiltersToSeller,
  getBuyerPrice,
} from '@/lib/platform-pricing'
import type { ProductColorFacet } from '@/lib/product-colors'

import type { ShopPriceRange } from '@/types/shop-data'

type ProductWithPricing = {
  isRentable?: boolean
  variants?: Array<{ price: number }>
  rentalPriceTiers?: Array<{ minDays: number; pricePerDay: number }>
}

export function computeShopPriceRangeMax(products: ProductWithPricing[]): number {
  const allPrices = products.flatMap((product) => {
    const prices: number[] = []
    if (product.variants?.length) {
      prices.push(...product.variants.map((v) => v.price))
    }
    if (product.isRentable && product.rentalPriceTiers?.length) {
      const sorted = [...product.rentalPriceTiers].sort((a, b) => a.minDays - b.minDays)
      const tier0 = sorted[0]
      prices.push(tier0.pricePerDay * tier0.minDays)
    }
    return prices
  })
  return allPrices.length > 0 ? Math.max(...allPrices) : 200
}

export type ShopBundleResult = {
  products: ReturnType<typeof finalizeProductListResponse>['products']
  hasMore: boolean
  page: number
  limit: number
  priceRange: ShopPriceRange
  facets: {
    colors: ProductColorFacet[]
    categoryCounts: Record<string, number>
    sizes: string[]
    vipCount: number
    discountCount: number
  }
  rentalStatus: BatchRentalStatusMap
  cacheSource?: string
  listMs?: number
}

type ShopBundleInput = {
  searchParams: URLSearchParams
  forceFresh?: boolean
}

function parseGenderEnum(
  gender: string | null,
): PublicListFilters['gender'] | undefined {
  if (!gender || gender === 'ALL') return undefined
  if (gender === 'women') return 'WOMEN'
  if (gender === 'men') return 'MEN'
  if (gender === 'children') return 'CHILDREN'
  return undefined
}

/** Resolve shared shop context once for list + facet queries. */
async function resolveShopContext(searchParams: URLSearchParams) {
  const category = searchParams.get('category')
  const gender = searchParams.get('gender')
  const search = searchParams.get('search')?.trim()
  const hasDiscount = searchParams.get('hasDiscount')
  const isVip = searchParams.get('isVip')
  const featuredFirst = searchParams.get('featuredFirst') === 'true'
  const shopFilters = parseShopListFilterParams(searchParams)
  const sellerPriceFilters = convertBuyerPriceFiltersToSeller(shopFilters)

  const resolvedCategorySlug =
    category && category !== 'ALL' ? resolveCategorySlugParam(category) : null

  const [categoryIds] = await Promise.all([
    resolvedCategorySlug && category
      ? resolveCategoryIdsForFilter(category).catch(() => {
          const fallbackId = getCategoryIdBySlugParam(category)
          return fallbackId != null ? [fallbackId] : []
        })
      : Promise.resolve([] as number[]),
  ])

  const genderEnum = parseGenderEnum(gender)

  const scopedBase = {
    categoryIds: categoryIds.length > 0 ? categoryIds : null,
    gender: genderEnum,
    isNew: false,
    isSecondHand: false,
    search: search || undefined,
  }

  const listFilters: PublicListFilters = {
    ...scopedBase,
    hasDiscount: hasDiscount === 'true',
    isVip: isVip === 'true',
    featuredFirst,
    color: shopFilters.color,
    sizes: shopFilters.sizes,
    sizeSystems: shopFilters.sizeSystems,
    locations: shopFilters.locations,
    priceMin: sellerPriceFilters.priceMin,
    priceMax: sellerPriceFilters.priceMax,
    purchaseType: shopFilters.purchaseType,
    sort: shopFilters.sort,
    skip: 0,
    take: 0,
  }

  const colorSizeFacetFilters: Omit<PublicListFilters, 'skip' | 'take'> = {
    ...scopedBase,
    hasDiscount: false,
    isVip: false,
  }

  const categoryFacetFilters: Omit<
    PublicListFilters,
    'skip' | 'take' | 'categoryIds' | 'categoryId'
  > = {
    gender: genderEnum,
    isNew: false,
    isSecondHand: false,
    hasDiscount: hasDiscount === 'true',
    isVip: isVip === 'true',
    search: search || undefined,
    color: shopFilters.color,
    sizes: shopFilters.sizes,
    sizeSystems: shopFilters.sizeSystems,
    locations: shopFilters.locations,
    priceMin: sellerPriceFilters.priceMin,
    priceMax: sellerPriceFilters.priceMax,
    purchaseType: shopFilters.purchaseType,
  }

  const countFilters: Omit<PublicListFilters, 'skip' | 'take' | 'isVip' | 'hasDiscount'> =
    {
      ...scopedBase,
    }

  return {
    listFilters,
    colorSizeFacetFilters,
    categoryFacetFilters,
    countFilters,
    shopFilters,
    genderEnum,
    search,
    category,
    gender,
    hasDiscount,
    isVip,
    featuredFirst,
  }
}

/**
 * Single server orchestration: products, facets, counts, and rental status.
 * Replaces 5–6 separate client-side API calls with one round-trip.
 */
export async function loadShopBundle(input: ShopBundleInput): Promise<ShopBundleResult> {
  const { searchParams, forceFresh = false } = input
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const pageLimit = Math.min(
    Math.max(parseInt(searchParams.get('limit') || '16', 10) || 16, 1),
    50,
  )
  const listTake = pageLimit + 1

  const ctx = await resolveShopContext(searchParams)

  const combinedFilters: PublicListFilters = {
    ...ctx.listFilters,
    skip: (page - 1) * pageLimit,
    take: listTake,
  }

  const [
    { payload, cacheSource, listMs },
    colorRows,
    categoryRows,
    sizeRows,
    vipCount,
    discountCount,
    catalogMaxPrice,
  ] = await Promise.all([
    loadPublicProductList(combinedFilters, { forceFresh }),
    getProductColorCounts(ctx.colorSizeFacetFilters),
    getProductCategoryCounts(ctx.categoryFacetFilters),
    getProductSizeCounts(ctx.colorSizeFacetFilters),
    countActiveVipProducts(ctx.countFilters),
    countActiveDiscountProducts(ctx.countFilters),
    getShopCatalogPriceMax(ctx.listFilters),
  ])

  const finalized = finalizeProductListResponse(payload)
  const products = finalized.products
  const hasMore = finalized.hasMore

  const rentableIds = products.filter((p) => p.isRentable).map((p) => p.id)
  const rentalStatus = await fetchBatchRentalStatus(rentableIds)
  const isChildrenShop =
    ctx.genderEnum === 'CHILDREN' ||
    isChildrenProductCategory(searchParams.get('category'))

  return {
    products,
    hasMore,
    page,
    limit: pageLimit,
    priceRange: {
      min: 0,
      max: Math.max(1, Math.ceil(getBuyerPrice(catalogMaxPrice))),
    },
    facets: {
      colors: buildShopColorFacets(colorRows),
      categoryCounts: buildShopCategoryFacetCounts(categoryRows),
      sizes: buildShopFilterSizeOptions(sizeRows, {
        isChildren: isChildrenShop,
      }),
      vipCount,
      discountCount,
    },
    rentalStatus,
    cacheSource,
    listMs,
  }
}

export function getShopBundleCacheControl(searchParams: URLSearchParams): string {
  const shopFilters = parseShopListFilterParams(searchParams)
  const search = searchParams.get('search')?.trim()
  const gender = searchParams.get('gender')
  const hasDiscount = searchParams.get('hasDiscount')
  const isVip = searchParams.get('isVip')

  return getHttpCacheControl({
    categoryIds: null,
    gender: parseGenderEnum(gender),
    isNew: false,
    isSecondHand: false,
    hasDiscount: hasDiscount === 'true',
    isVip: isVip === 'true',
    search: search || undefined,
    color: shopFilters.color,
    sizes: shopFilters.sizes,
    sizeSystems: shopFilters.sizeSystems,
    locations: shopFilters.locations,
    priceMin: shopFilters.priceMin,
    priceMax: shopFilters.priceMax,
    purchaseType: shopFilters.purchaseType,
    sort: shopFilters.sort,
    skip: 0,
    take: 0,
  })
}
