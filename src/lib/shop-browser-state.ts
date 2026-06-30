import {
  appendShopListFilterParams,
  parseShopListFilterParams,
  type ClientShopListFilters,
  type ShopPurchaseType,
  type ShopSortBy,
} from '@/lib/shop-list-params'

export const SHOP_PAGE_STATE_KEY = 'shopPageState'
export const HOME_PAGE_STATE_KEY = 'homePageState'
export const SHOP_RETURN_URL_KEY = 'shopReturnUrl'

export type PersistedShopPageState = {
  selectedCategories: string[]
  priceRange: [number, number]
  selectedSizeSystems: string[]
  selectedSizes: string[]
  selectedColors: string[]
  selectedLocations: string[]
  rentalStartDate: string | null
  rentalEndDate: string | null
  sortBy: ShopSortBy
  purchaseType: ShopPurchaseType
  onlyDiscounted: boolean
  onlyVip: boolean
  currentPage: number
  scrollY: number
}

export function loadPersistedShopState(
  storageKey: string,
): PersistedShopPageState | null {
  if (typeof window === 'undefined') return null

  const saved = sessionStorage.getItem(storageKey)
  if (!saved) return null

  try {
    const parsed = JSON.parse(saved) as Partial<PersistedShopPageState>
    return {
      selectedCategories: parsed.selectedCategories ?? [],
      priceRange: parsed.priceRange ?? [0, 0],
      selectedSizeSystems: parsed.selectedSizeSystems ?? [],
      selectedSizes: parsed.selectedSizes ?? [],
      selectedColors: parsed.selectedColors ?? [],
      selectedLocations: parsed.selectedLocations ?? [],
      rentalStartDate: parsed.rentalStartDate ?? null,
      rentalEndDate: parsed.rentalEndDate ?? null,
      sortBy: parsed.sortBy ?? 'newest',
      purchaseType: parsed.purchaseType ?? 'all',
      onlyDiscounted: Boolean(parsed.onlyDiscounted),
      onlyVip: Boolean(parsed.onlyVip),
      currentPage: parsed.currentPage ?? 1,
      scrollY: typeof parsed.scrollY === 'number' ? parsed.scrollY : 0,
    }
  } catch {
    return null
  }
}

export function mergeShopStateWithUrl(
  persisted: PersistedShopPageState,
  searchParams: URLSearchParams,
  options: {
    discountParam: string | null
    vipParam: string | null
    categoryNames: string[] | null
  },
): PersistedShopPageState {
  const urlFilters = parseShopListFilterParams(searchParams)
  const pageRaw = searchParams.get('page')
  const urlPage =
    pageRaw != null ? Math.max(1, parseInt(pageRaw, 10) || 1) : persisted.currentPage

  const priceRange: [number, number] =
    urlFilters.priceMin != null || urlFilters.priceMax != null
      ? [
          urlFilters.priceMin ?? persisted.priceRange[0],
          urlFilters.priceMax ?? persisted.priceRange[1],
        ]
      : persisted.priceRange

  return {
    ...persisted,
    selectedCategories: options.categoryNames ?? persisted.selectedCategories,
    selectedColors: urlFilters.color ? [urlFilters.color] : persisted.selectedColors,
    selectedSizes: urlFilters.sizes ?? persisted.selectedSizes,
    selectedSizeSystems: urlFilters.sizeSystems ?? persisted.selectedSizeSystems,
    selectedLocations: urlFilters.locations ?? persisted.selectedLocations,
    priceRange,
    purchaseType: urlFilters.purchaseType ?? persisted.purchaseType,
    sortBy: urlFilters.sort ?? persisted.sortBy,
    onlyDiscounted:
      options.discountParam === 'true' ? true : persisted.onlyDiscounted,
    onlyVip: options.vipParam === 'true' ? true : persisted.onlyVip,
    currentPage: urlPage,
  }
}

type BuildShopBrowserUrlOptions = {
  basePath: string
  currentSearchParams: URLSearchParams
  categoryParam: string | null
  categorySlug: string | null
  currentPage: number
  onlyDiscounted: boolean
  onlyVip: boolean
  filters: ClientShopListFilters
}

export function buildShopBrowserUrl({
  basePath,
  currentSearchParams,
  categoryParam,
  categorySlug,
  currentPage,
  onlyDiscounted,
  onlyVip,
  filters,
}: BuildShopBrowserUrlOptions): string {
  const params = new URLSearchParams(currentSearchParams.toString())

  params.delete('color')
  params.delete('sizes')
  params.delete('sizeSystems')
  params.delete('locations')
  params.delete('priceMin')
  params.delete('priceMax')
  params.delete('purchaseType')
  params.delete('sort')
  params.delete('hasDiscount')
  params.delete('isVip')
  params.delete('page')
  params.delete('limit')
  params.delete('featuredFirst')
  params.delete('fresh')

  if (!categoryParam) {
    if (categorySlug) {
      params.set('category', categorySlug)
    } else {
      params.delete('category')
    }
  }

  if (onlyDiscounted) {
    params.set('discount', 'true')
  } else {
    params.delete('discount')
  }

  if (onlyVip) {
    params.set('vip', 'true')
  } else {
    params.delete('vip')
  }

  if (currentPage > 1) {
    params.set('page', String(currentPage))
  }

  appendShopListFilterParams(params, filters)

  const query = params.toString()
  return query ? `${basePath}?${query}` : basePath
}

export function isShopReturnUrl(url: string): boolean {
  return url === '/' || url.startsWith('/shop') || url.startsWith('/?')
}
