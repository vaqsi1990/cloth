export type ShopPurchaseType = 'all' | 'rent-only' | 'sale-only' | 'rent-and-sale'

export type ShopSortBy = 'newest' | 'price-low' | 'price-high' | 'rating'

export type ShopListFilterParams = {
  color?: string | null
  sizes?: string[] | null
  sizeSystems?: string[] | null
  locations?: string[] | null
  priceMin?: number | null
  priceMax?: number | null
  purchaseType?: ShopPurchaseType | null
  sort?: ShopSortBy | null
}

export function parseShopListFilterParams(
  searchParams: URLSearchParams,
): ShopListFilterParams {
  const color = searchParams.get('color')?.trim() || null
  const sizesRaw = searchParams.get('sizes')?.trim()
  const sizeSystemsRaw = searchParams.get('sizeSystems')?.trim()
  const locationsRaw = searchParams.get('locations')?.trim()
  const priceMinRaw = searchParams.get('priceMin')
  const priceMaxRaw = searchParams.get('priceMax')
  const purchaseTypeRaw = searchParams.get('purchaseType')?.trim()
  const sortRaw = searchParams.get('sort')?.trim()

  const priceMin =
    priceMinRaw != null && priceMinRaw !== ''
      ? Number.parseFloat(priceMinRaw)
      : null
  const priceMax =
    priceMaxRaw != null && priceMaxRaw !== ''
      ? Number.parseFloat(priceMaxRaw)
      : null

  const purchaseType =
    purchaseTypeRaw === 'rent-only' ||
    purchaseTypeRaw === 'sale-only' ||
    purchaseTypeRaw === 'rent-and-sale'
      ? purchaseTypeRaw
      : null

  const sort =
    sortRaw === 'price-low' ||
    sortRaw === 'price-high' ||
    sortRaw === 'rating' ||
    sortRaw === 'newest'
      ? sortRaw
      : null

  return {
    color,
    sizes: sizesRaw ? sizesRaw.split(',').map((s) => s.trim()).filter(Boolean) : null,
    sizeSystems: sizeSystemsRaw
      ? sizeSystemsRaw.split(',').map((s) => s.trim()).filter(Boolean)
      : null,
    locations: locationsRaw
      ? locationsRaw.split(',').map((s) => s.trim()).filter(Boolean)
      : null,
    priceMin: priceMin != null && Number.isFinite(priceMin) ? priceMin : null,
    priceMax: priceMax != null && Number.isFinite(priceMax) ? priceMax : null,
    purchaseType,
    sort,
  }
}

export type ClientShopListFilters = {
  selectedColors: string[]
  selectedSizes: string[]
  selectedSizeSystems: string[]
  selectedLocations: string[]
  priceRange: [number, number]
  maxPrice: number
  purchaseType: ShopPurchaseType
  sortBy: ShopSortBy
}

export function appendShopListFilterParams(
  params: URLSearchParams,
  filters: ClientShopListFilters,
): void {
  if (filters.selectedColors.length === 1) {
    params.set('color', filters.selectedColors[0])
  }

  if (filters.selectedSizes.length > 0) {
    params.set('sizes', filters.selectedSizes.join(','))
  }

  if (filters.selectedSizeSystems.length > 0) {
    params.set('sizeSystems', filters.selectedSizeSystems.join(','))
  }

  if (filters.selectedLocations.length > 0) {
    params.set('locations', filters.selectedLocations.join(','))
  }

  const [priceMin, priceMax] = filters.priceRange
  const hasPriceFilter =
    priceMin > 0 ||
    (priceMax > 0 && (filters.maxPrice <= 0 || priceMax < filters.maxPrice))

  if (hasPriceFilter) {
    params.set('priceMin', String(priceMin))
    params.set('priceMax', String(priceMax))
  }

  if (filters.purchaseType !== 'all') {
    params.set('purchaseType', filters.purchaseType)
  }

  if (filters.sortBy !== 'newest') {
    params.set('sort', filters.sortBy)
  }
}
