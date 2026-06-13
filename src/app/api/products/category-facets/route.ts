import { NextRequest, NextResponse } from 'next/server'
import { buildShopCategoryFacetCounts } from '@/lib/product-categories'
import { getPurposeIdBySlug } from '@/lib/purpose-ids'
import {
  getHttpCacheControl,
  getProductCategoryCounts,
  type PublicListFilters,
} from '@/lib/product-list-query'
import { parseShopListFilterParams } from '@/lib/shop-list-params'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const gender = searchParams.get('gender')
    const purpose = searchParams.get('purpose')
    const search = searchParams.get('search')?.trim()
    const hasDiscount = searchParams.get('hasDiscount')
    const isVip = searchParams.get('isVip')
    const shopFilters = parseShopListFilterParams(searchParams)

    const purposeId = purpose
      ? await getPurposeIdBySlug(purpose).catch(() => null)
      : null

    const genderEnum =
      gender && gender !== 'ALL'
        ? gender === 'women'
          ? ('WOMEN' as const)
          : gender === 'men'
            ? ('MEN' as const)
            : gender === 'children'
              ? ('CHILDREN' as const)
              : undefined
        : undefined

    const listFilters: Omit<
      PublicListFilters,
      'skip' | 'take' | 'categoryIds' | 'categoryId'
    > = {
      purposeId,
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
      priceMin: shopFilters.priceMin,
      priceMax: shopFilters.priceMax,
      purchaseType: shopFilters.purchaseType,
    }

    const categoryRows = await getProductCategoryCounts(listFilters)
    const counts = buildShopCategoryFacetCounts(categoryRows)

    const response = NextResponse.json({ success: true, counts })
    response.headers.set(
      'Cache-Control',
      getHttpCacheControl({ ...listFilters, skip: 0, take: 0 }),
    )
    return response
  } catch (error) {
    console.error('Error fetching category facets:', error)
    return NextResponse.json(
      { success: false, counts: {} },
      { status: 500 },
    )
  }
}
