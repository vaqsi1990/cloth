import { NextRequest, NextResponse } from 'next/server'
import { buildShopColorFacets } from '@/lib/product-colors'
import { resolveCategorySlugParam } from '@/lib/product-categories'
import { resolveCategoryIdsForFilter } from '@/lib/product-category-resolve'
import { getPurposeIdBySlug } from '@/lib/purpose-ids'
import {
  getHttpCacheControl,
  getProductColorCounts,
  type PublicListFilters,
} from '@/lib/product-list-query'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const gender = searchParams.get('gender')
    const purpose = searchParams.get('purpose')
    const search = searchParams.get('search')?.trim()

    const resolvedCategorySlug =
      category && category !== 'ALL' ? resolveCategorySlugParam(category) : null
    const categoryIds =
      resolvedCategorySlug && category
        ? await resolveCategoryIdsForFilter(category)
        : []

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

    const listFilters: Omit<PublicListFilters, 'skip' | 'take'> = {
      categoryIds: categoryIds.length > 0 ? categoryIds : null,
      purposeId,
      gender: genderEnum,
      isNew: false,
      isSecondHand: false,
      hasDiscount: false,
      isVip: false,
      search: search || undefined,
    }

    const colorRows = await getProductColorCounts(listFilters)
    const colors = buildShopColorFacets(colorRows)

    const response = NextResponse.json({ success: true, colors })
    response.headers.set(
      'Cache-Control',
      getHttpCacheControl({ ...listFilters, skip: 0, take: 0 }),
    )
    return response
  } catch (error) {
    console.error('Error fetching color facets:', error)
    return NextResponse.json(
      { success: false, colors: [] },
      { status: 500 },
    )
  }
}
