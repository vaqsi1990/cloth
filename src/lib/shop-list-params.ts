export type ShopPurchaseType = 'all' | 'rent-only' | 'sale-only' | 'rent-and-sale'

export type ShopSortBy = 'newest' | 'price-low' | 'price-high' | 'rating'

export type ShopListFilterParams = {
  color?: string | null
  colors?: string[] | null
  colorSearch?: string | null
  categorySlugs?: string[] | null
  sizes?: string[] | null
  sizeSystems?: string[] | null
  locations?: string[] | null
  priceMin?: number | null
  priceMax?: number | null
  purchaseType?: ShopPurchaseType | null
  sort?: ShopSortBy | null
}

function splitCsvParam(value: string | null): string[] | null {
  if (!value?.trim()) return null
  const items = value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
  return items.length > 0 ? items : null
}

export function parseShopListFilterParams(
  searchParams: URLSearchParams,
): ShopListFilterParams {
  const color = searchParams.get('color')?.trim() || null
  const colors = splitCsvParam(searchParams.get('colors'))
  const colorSearch = searchParams.get('colorSearch')?.trim() || null
  const category = searchParams.get('category')?.trim() || null
  const categories = splitCsvParam(searchParams.get('categories'))
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

  const normalizedColors =
    colors ?? (color ? [color] : null)

  const categorySlugs =
    categories ?? (category ? [category] : null)

  return {
    color,
    colors: normalizedColors,
    colorSearch,
    categorySlugs,
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
  colorSearch?: string
  selectedCategorySlugs?: string[]
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
  if (filters.selectedColors.length > 1) {
    params.set('colors', filters.selectedColors.join(','))
  } else if (filters.selectedColors.length === 1) {
    params.set('color', filters.selectedColors[0])
  }

  const colorSearch = filters.colorSearch?.trim()
  if (colorSearch) {
    params.set('colorSearch', colorSearch)
  }

  const categorySlugs = filters.selectedCategorySlugs?.filter(Boolean) ?? []
  if (categorySlugs.length > 1) {
    params.set('categories', categorySlugs.join(','))
  } else if (categorySlugs.length === 1) {
    params.set('category', categorySlugs[0])
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
