import { NextRequest, NextResponse } from 'next/server'
import { countActiveDiscountProducts, countActiveVipProducts } from '@/lib/product-list-query'
import { syncPendingVipPayments } from '@/lib/product-vip-payment'
import { resolveCategorySlugParam } from '@/lib/product-categories'
import { resolveCategoryIdsForFilter } from '@/lib/product-category-resolve'
import { getPurposeIdBySlug } from '@/lib/purpose-ids'

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

    const purposeId = purpose ? await getPurposeIdBySlug(purpose).catch(() => null) : null

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

    await Promise.race([
      syncPendingVipPayments(),
      new Promise((resolve) => setTimeout(resolve, 8000)),
    ])

    const [vipCount, discountCount] = await Promise.all([
      countActiveVipProducts({
        categoryIds: categoryIds.length > 0 ? categoryIds : null,
        purposeId,
        gender: genderEnum,
        isNew: false,
        isSecondHand: false,
        hasDiscount: false,
        search: search || undefined,
      }),
      countActiveDiscountProducts({
        categoryIds: categoryIds.length > 0 ? categoryIds : null,
        purposeId,
        gender: genderEnum,
        isNew: false,
        isSecondHand: false,
        isVip: false,
        search: search || undefined,
      }),
    ])

    return NextResponse.json({ success: true, vipCount, discountCount })
  } catch (error) {
    console.error('Error fetching filter counts:', error)
    return NextResponse.json({ success: false, vipCount: 0, discountCount: 0 }, { status: 500 })
  }
}
