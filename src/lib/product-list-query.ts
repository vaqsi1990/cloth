import { Prisma } from '@prisma/client'
import { unstable_cache } from 'next/cache'
import { revalidateTag } from 'next/cache'
import { prisma } from '@/lib/prisma'
import {
  compareVipProductPriority,
  isProductVipActive,
} from '@/lib/product-vip'
import { resolveCanonicalCategory } from '@/lib/product-categories'
import { getDbColorMatchValues, resolveProductColorFilterId, PRODUCT_COLORS, PRODUCT_COLOR_FILTER_MAPPING } from '@/lib/product-colors'
import {
  getAdultSizeDbMatchValues,
  isLetterSize,
  LETTER_SIZE_TO_SYSTEM_SIZES,
} from '@/lib/shop-product-filters'
import type { ShopPurchaseType, ShopSortBy } from '@/lib/shop-list-params'
import {
  buildExcludeSoldProductsWhere,
  buildSaleStockAvailabilitySql,
  buildSoldProductSqlExclusion,
} from '@/lib/sold-products'

export const PRODUCT_LIST_CACHE_TAG = 'product-list'

export type PublicListFilters = {
  categoryId?: number | null
  categoryIds?: number[] | null
  gender?: 'WOMEN' | 'MEN' | 'CHILDREN'
  isNew?: boolean
  isSecondHand?: boolean
  hasDiscount?: boolean
  isVip?: boolean
  featuredFirst?: boolean
  featuredOnly?: boolean
  search?: string
  color?: string | null
  colorSearch?: string | null
  sizes?: string[] | null
  sizeSystems?: string[] | null
  locations?: string[] | null
  priceMin?: number | null
  priceMax?: number | null
  purchaseType?: ShopPurchaseType | null
  sort?: ShopSortBy | null
  skip: number
  take: number
}

type CombinedListRow = {
  id: number
  name: string
  slug: string
  brand: string | null
  gender: string
  color: string | null
  location: string | null
  isNew: boolean
  isSecondHand: boolean
  isVip: boolean
  vipExpiresAt: Date | null
  discount: number | null
  discountDays: number | null
  discountStartDate: Date | null
  rating: number | null
  categoryId: number | null
  sizeSystem: string | null
  size: string | null
  isRentable: boolean
  createdAt: Date
  image_url: string | null
  min_price: number | null
  max_price: number | null
  tier_min_days: number | null
  tier_price_per_day: number | null
  cat_id: number | null
  cat_name: string | null
  cat_slug: string | null
}

const ALL_SIZE_SYSTEMS = ['EU', 'US', 'UK', 'CN'] as const

function buildColorWhere(colorId: string): Prisma.Sql {
  const values = getDbColorMatchValues(colorId).map((v) => v.toLowerCase())
  return Prisma.sql`LOWER(TRIM(p.color)) IN (${Prisma.join(values)})`
}

function buildColorSearchWhere(query: string): Prisma.Sql {
  const trimmed = query.trim()
  if (!trimmed) return Prisma.sql`TRUE`

  const exactFilterId = resolveProductColorFilterId(trimmed)
  if (exactFilterId) {
    return buildColorWhere(exactFilterId)
  }

  const pattern = `%${trimmed}%`
  const matchingValues = new Set<string>()
  const needle = trimmed.toLowerCase()

  for (const color of PRODUCT_COLORS) {
    if (
      color.id.toLowerCase().includes(needle) ||
      color.label.toLowerCase().includes(needle)
    ) {
      for (const value of getDbColorMatchValues(color.id)) {
        matchingValues.add(value.toLowerCase())
      }
    }
  }

  for (const [id, variations] of Object.entries(PRODUCT_COLOR_FILTER_MAPPING)) {
    if (id.toLowerCase().includes(needle)) {
      for (const value of getDbColorMatchValues(id)) {
        matchingValues.add(value.toLowerCase())
      }
      continue
    }
    for (const variation of variations) {
      if (variation.toLowerCase().includes(needle)) {
        for (const value of getDbColorMatchValues(id)) {
          matchingValues.add(value.toLowerCase())
        }
      }
    }
  }

  if (matchingValues.size > 0) {
    const values = [...matchingValues]
    return Prisma.sql`(LOWER(TRIM(p.color)) IN (${Prisma.join(values)}) OR p.color ILIKE ${pattern})`
  }

  return Prisma.sql`p.color ILIKE ${pattern}`
}

function buildSizeWhere(filters: PublicListFilters): Prisma.Sql | null {
  if (!filters.sizes?.length) return null

  const activeSystems =
    filters.sizeSystems?.length && filters.sizeSystems.length > 0
      ? filters.sizeSystems
      : [...ALL_SIZE_SYSTEMS]

  const perSelectedSize = filters.sizes
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((selectedSize) => {
      if (isLetterSize(selectedSize)) {
        const matchValues = getAdultSizeDbMatchValues(selectedSize)
        const parts: Prisma.Sql[] = matchValues.map(
          (value) =>
            Prisma.sql`(TRIM(p.size) = ${value} OR UPPER(TRIM(p.size)) = ${value.toUpperCase()})`,
        )

        for (const system of activeSystems) {
          const mapping = LETTER_SIZE_TO_SYSTEM_SIZES[selectedSize.toUpperCase()]
          const values = mapping?.[system as keyof typeof mapping]
          if (!values?.length) continue

          parts.push(
            Prisma.sql`(p."sizeSystem"::text = ${system} AND TRIM(p.size) IN (${Prisma.join(
              values,
            )}))`,
          )
        }

        return Prisma.sql`(${Prisma.join(parts, ' OR ')})`
      }

      if (filters.sizeSystems?.length) {
        return Prisma.sql`(TRIM(p.size) = ${selectedSize} AND p."sizeSystem"::text IN (${Prisma.join(
          filters.sizeSystems,
        )}))`
      }

      return Prisma.sql`TRIM(p.size) = ${selectedSize}`
    })

  if (perSelectedSize.length === 0) return null
  return Prisma.sql`(${Prisma.join(perSelectedSize, ' OR ')})`
}

function buildPurchaseTypeWhere(purchaseType: ShopPurchaseType): Prisma.Sql {
  const hasSalePrice = Prisma.sql`EXISTS (
    SELECT 1 FROM "ProductVariant" pv
    WHERE pv."productId" = p.id AND pv.price > 0
  )`

  switch (purchaseType) {
    case 'rent-only':
      return Prisma.sql`p."isRentable" = true AND NOT ${hasSalePrice}`
    case 'sale-only':
      return Prisma.sql`(p."isRentable" = false OR p."isRentable" IS NULL) AND ${hasSalePrice}`
    case 'rent-and-sale':
      return Prisma.sql`p."isRentable" = true AND ${hasSalePrice}`
    default:
      return Prisma.sql`TRUE`
  }
}

const ACTIVE_PRODUCT_DISCOUNT = Prisma.sql`(
  p.discount IS NOT NULL AND p.discount > 0 AND (
    p."discountStartDate" IS NULL OR p."discountDays" IS NULL OR
    (p."discountStartDate" + (p."discountDays" || ' days')::interval) > NOW()
  )
)`

function effectiveVariantPriceSql(): Prisma.Sql {
  return Prisma.sql`GREATEST(
    pv.price::float8 - CASE WHEN ${ACTIVE_PRODUCT_DISCOUNT} THEN COALESCE(p.discount, 0)::float8 ELSE 0::float8 END,
    0::float8
  )`
}

function effectiveRentalTotalSql(rptAlias: string): Prisma.Sql {
  return Prisma.sql`GREATEST(
    (${Prisma.raw(`"${rptAlias}"`)}."pricePerDay" * ${Prisma.raw(`"${rptAlias}"`)}."minDays")::float8
    - CASE WHEN ${ACTIVE_PRODUCT_DISCOUNT} THEN COALESCE(p.discount, 0)::float8 ELSE 0::float8 END,
    0::float8
  )`
}

function buildPriceRangeWhere(priceMin: number, priceMax: number): Prisma.Sql {
  const rentalTotal = Prisma.sql`(
    SELECT ${effectiveRentalTotalSql('rpt')}
    FROM "RentalPriceTier" rpt
    WHERE rpt."productId" = p.id
    ORDER BY rpt."minDays" ASC
    LIMIT 1
  )`

  const minBuyPrice = Prisma.sql`(
    SELECT MIN(${effectiveVariantPriceSql()})::float8
    FROM "ProductVariant" pv
    WHERE pv."productId" = p.id AND pv.price > 0
  )`

  const maxBuyPrice = Prisma.sql`(
    SELECT MAX(${effectiveVariantPriceSql()})::float8
    FROM "ProductVariant" pv
    WHERE pv."productId" = p.id AND pv.price > 0
  )`

  return Prisma.sql`(
    EXISTS (
      SELECT 1 FROM "ProductVariant" pv
      WHERE pv."productId" = p.id
        AND pv.price > 0
        AND ${effectiveVariantPriceSql()} >= ${priceMin}
        AND ${effectiveVariantPriceSql()} <= ${priceMax}
    )
    OR EXISTS (
      SELECT 1 FROM "RentalPriceTier" rpt
      WHERE rpt."productId" = p.id
        AND ${effectiveRentalTotalSql('rpt')} >= ${priceMin}
        AND ${effectiveRentalTotalSql('rpt')} <= ${priceMax}
    )
    OR (
      COALESCE(${minBuyPrice}, ${rentalTotal}, 0) >= ${priceMin}
      AND COALESCE(${maxBuyPrice}, ${rentalTotal}, 0) <= ${priceMax}
    )
    OR (
      COALESCE(${minBuyPrice}, ${rentalTotal}, 999999999) <= ${priceMin}
      AND COALESCE(${maxBuyPrice}, ${rentalTotal}, 0) >= ${priceMax}
    )
  )`
}

function buildOrderByClause(
  sort?: ShopSortBy | null,
  options?: { featuredFirst?: boolean },
): Prisma.Sql {
  const vipOrder = Prisma.sql`(p."isVip" = true AND p."vipExpiresAt" IS NOT NULL AND p."vipExpiresAt" > NOW()) DESC`
  const featuredOrder = options?.featuredFirst
    ? Prisma.sql`p."featuredOnHomepage" DESC, p."homepageFeaturedAt" DESC NULLS LAST,`
    : Prisma.empty

  switch (sort) {
    case 'price-low':
      return Prisma.sql`${vipOrder}, ${featuredOrder} (
        SELECT MIN(${effectiveVariantPriceSql()}) FROM "ProductVariant" pv
        WHERE pv."productId" = p.id AND pv.price > 0
      ) ASC NULLS LAST, p."createdAt" DESC, p.id DESC`
    case 'price-high':
      return Prisma.sql`${vipOrder}, ${featuredOrder} (
        SELECT MAX(${effectiveVariantPriceSql()}) FROM "ProductVariant" pv
        WHERE pv."productId" = p.id AND pv.price > 0
      ) DESC NULLS LAST, p."createdAt" DESC, p.id DESC`
    case 'rating':
      return Prisma.sql`${vipOrder}, ${featuredOrder} COALESCE(p.rating, 0) DESC, p."createdAt" DESC, p.id DESC`
    case 'newest':
    default:
      return Prisma.sql`${vipOrder}, ${featuredOrder} p."createdAt" DESC, p.id DESC`
  }
}

function buildWhere(filters: PublicListFilters): Prisma.Sql {
  const parts: Prisma.Sql[] = [
    Prisma.sql`p.status NOT IN ('MAINTENANCE', 'DAMAGED', 'RESERVED')`,
    Prisma.sql`p."approvalStatus" = 'APPROVED'`,
    Prisma.sql`p."userId" IS NOT NULL`,
    buildSoldProductSqlExclusion(),
    buildSaleStockAvailabilitySql(),
  ]

  if (filters.categoryIds?.length) {
    parts.push(
      Prisma.sql`p."categoryId" IN (${Prisma.join(filters.categoryIds)})`,
    )
  } else   if (filters.categoryId) {
    parts.push(Prisma.sql`p."categoryId" = ${filters.categoryId}`)
  }
  if (filters.gender) {
    parts.push(Prisma.sql`p.gender = ${filters.gender}::"Gender"`)
  }
  if (filters.isNew) {
    parts.push(Prisma.sql`p."isNew" = true`)
  }
  if (filters.isSecondHand) {
    parts.push(Prisma.sql`p."isSecondHand" = true`)
  }
  if (filters.hasDiscount) {
    parts.push(
      Prisma.sql`p.discount IS NOT NULL AND p.discount > 0 AND (
        p."discountStartDate" IS NULL OR p."discountDays" IS NULL OR
        (p."discountStartDate" + (p."discountDays" || ' days')::interval) > NOW()
      )`,
    )
  }
  if (filters.isVip) {
    parts.push(
      Prisma.sql`p."isVip" = true AND p."vipExpiresAt" IS NOT NULL AND p."vipExpiresAt" > NOW()`,
    )
  }
  if (filters.featuredOnly) {
    parts.push(Prisma.sql`p."featuredOnHomepage" = true`)
  }
  if (filters.search) {
    const pattern = `%${filters.search}%`
    parts.push(
      Prisma.sql`(p.name ILIKE ${pattern} OR p.brand ILIKE ${pattern})`,
    )
  }
  if (filters.colorSearch) {
    parts.push(buildColorSearchWhere(filters.colorSearch))
  } else if (filters.color) {
    parts.push(buildColorWhere(filters.color))
  }
  const sizeWhere = buildSizeWhere(filters)
  if (sizeWhere) {
    parts.push(sizeWhere)
  }
  if (filters.sizeSystems?.length) {
    parts.push(
      Prisma.sql`p."sizeSystem"::text IN (${Prisma.join(filters.sizeSystems)})`,
    )
  }
  if (filters.locations?.length) {
    parts.push(
      Prisma.sql`p.location IN (${Prisma.join(filters.locations)})`,
    )
  }
  if (
    filters.priceMin != null &&
    filters.priceMax != null &&
    Number.isFinite(filters.priceMin) &&
    Number.isFinite(filters.priceMax) &&
    filters.priceMax > 0
  ) {
    parts.push(buildPriceRangeWhere(filters.priceMin, filters.priceMax))
  }
  if (filters.purchaseType && filters.purchaseType !== 'all') {
    parts.push(buildPurchaseTypeWhere(filters.purchaseType))
  }

  return Prisma.join(parts, ' AND ')
}

export async function countActiveVipProducts(
  filters: Omit<PublicListFilters, 'skip' | 'take' | 'isVip'>,
): Promise<number> {
  const where = buildWhere({ ...filters, isVip: true, skip: 0, take: 0 })
  const rows = await prisma.$queryRaw<[{ count: number }]>(Prisma.sql`
    SELECT COUNT(*)::int AS count
    FROM "Product" p
    WHERE ${where}
  `)
  return rows[0]?.count ?? 0
}

export async function countActiveDiscountProducts(
  filters: Omit<PublicListFilters, 'skip' | 'take' | 'hasDiscount'>,
): Promise<number> {
  const where = buildWhere({ ...filters, hasDiscount: true, skip: 0, take: 0 })
  const rows = await prisma.$queryRaw<[{ count: number }]>(Prisma.sql`
    SELECT COUNT(*)::int AS count
    FROM "Product" p
    WHERE ${where}
  `)
  return rows[0]?.count ?? 0
}

/** Catalog-wide max price for slider ceiling (ignores priceMin/priceMax). */
export async function getShopCatalogPriceMax(
  filters: Omit<PublicListFilters, 'skip' | 'take' | 'priceMin' | 'priceMax'>,
): Promise<number> {
  const where = buildWhere({ ...filters, priceMin: null, priceMax: null, skip: 0, take: 0 })
  const rows = await prisma.$queryRaw<[{ max_price: number | null }]>(Prisma.sql`
    WITH filtered AS (
      SELECT p.id
      FROM "Product" p
      WHERE ${where}
    ),
    all_prices AS (
      SELECT ${effectiveVariantPriceSql()}::float8 AS price
      FROM "ProductVariant" pv
      INNER JOIN "Product" p ON p.id = pv."productId"
      WHERE pv."productId" IN (SELECT id FROM filtered)
        AND pv.price > 0
      UNION ALL
      SELECT GREATEST(
        (rpt."pricePerDay" * rpt."minDays")::float8
        - CASE WHEN (
          p.discount IS NOT NULL AND p.discount > 0 AND (
            p."discountStartDate" IS NULL OR p."discountDays" IS NULL OR
            (p."discountStartDate" + (p."discountDays" || ' days')::interval) > NOW()
          )
        ) THEN COALESCE(p.discount, 0)::float8 ELSE 0::float8 END,
        0::float8
      ) AS price
      FROM (
        SELECT DISTINCT ON (rpt."productId")
          rpt."productId",
          rpt."pricePerDay",
          rpt."minDays"
        FROM "RentalPriceTier" rpt
        WHERE rpt."productId" IN (SELECT id FROM filtered)
        ORDER BY rpt."productId", rpt."minDays" ASC
      ) rpt
      INNER JOIN "Product" p ON p.id = rpt."productId"
    )
    SELECT MAX(price)::float8 AS max_price
    FROM all_prices
  `)
  const max = rows[0]?.max_price
  return max != null && Number.isFinite(max) && max > 0 ? Math.ceil(max) : 200
}

export async function getProductColorCounts(
  filters: Omit<PublicListFilters, 'skip' | 'take'>,
): Promise<Array<{ colorValue: string; count: number }>> {
  const where = buildWhere({ ...filters, skip: 0, take: 0 })
  const rows = await prisma.$queryRaw<
    Array<{ color: string; count: number }>
  >(Prisma.sql`
    SELECT p.color, COUNT(*)::int AS count
    FROM "Product" p
    WHERE ${where}
      AND p.color IS NOT NULL
      AND TRIM(p.color) <> ''
    GROUP BY p.color
  `)

  return rows.map((row) => ({
    colorValue: row.color,
    count: row.count,
  }))
}

export async function getProductSizeCounts(
  filters: Omit<PublicListFilters, 'skip' | 'take' | 'sizes'>,
): Promise<Array<{ sizeValue: string; sizeSystem: string | null; count: number }>> {
  const where = buildWhere({ ...filters, skip: 0, take: 0 })
  const rows = await prisma.$queryRaw<
    Array<{ size: string; size_system: string | null; count: number }>
  >(Prisma.sql`
    SELECT TRIM(p.size) AS size, p."sizeSystem"::text AS size_system, COUNT(*)::int AS count
    FROM "Product" p
    WHERE ${where}
      AND p.size IS NOT NULL
      AND TRIM(p.size) <> ''
    GROUP BY TRIM(p.size), p."sizeSystem"
  `)

  return rows.map((row) => ({
    sizeValue: row.size,
    sizeSystem: row.size_system,
    count: row.count,
  }))
}

export async function getProductCategoryCounts(
  filters: Omit<
    PublicListFilters,
    'skip' | 'take' | 'categoryIds' | 'categoryId'
  >,
): Promise<
  Array<{
    categoryId: number
    categorySlug: string | null
    categoryName: string | null
    count: number
  }>
> {
  const where = buildWhere({ ...filters, skip: 0, take: 0 })
  const rows = await prisma.$queryRaw<
    Array<{
      category_id: number
      category_slug: string | null
      category_name: string | null
      count: number
    }>
  >(Prisma.sql`
    SELECT
      p."categoryId" AS category_id,
      c.slug AS category_slug,
      c.name AS category_name,
      COUNT(*)::int AS count
    FROM "Product" p
    LEFT JOIN "Category" c ON c.id = p."categoryId"
    WHERE ${where}
      AND p."categoryId" IS NOT NULL
    GROUP BY p."categoryId", c.slug, c.name
  `)

  return rows.map((row) => ({
    categoryId: row.category_id,
    categorySlug: row.category_slug,
    categoryName: row.category_name,
    count: row.count,
  }))
}

type HomepageMergeProduct = {
  id: number
  isVip?: boolean
  vipExpiresAt?: string | Date | null
}

function dedupeProductsById<T extends { id: number }>(products: T[]): T[] {
  const seen = new Set<number>()
  const result: T[] = []
  for (const product of products) {
    if (seen.has(product.id)) continue
    seen.add(product.id)
    result.push(product)
  }
  return result
}

function mergeHomepageFirstPageProducts<T extends HomepageMergeProduct>(
  standardProducts: T[],
  featuredProducts: T[],
  pageSize: number,
): T[] {
  const standard = dedupeProductsById(standardProducts)
  const featured = dedupeProductsById(featuredProducts)

  const result: T[] = []
  const used = new Set<number>()

  const push = (product: T) => {
    if (used.has(product.id) || result.length >= pageSize) return
    used.add(product.id)
    result.push(product)
  }

  const vipProducts = dedupeProductsById([...standard, ...featured]).filter(
    isProductVipActive,
  )
  vipProducts.sort(compareVipProductPriority)
  for (const product of vipProducts) {
    push(product)
  }

  for (const product of featured) {
    push(product)
  }

  for (const product of standard) {
    push(product)
  }

  return result
}

async function fetchHomepageFeaturedProducts(
  filters: PublicListFilters,
): Promise<CombinedListRow[]> {
  return fetchPublicProductListCombined({
    ...filters,
    skip: 0,
    take: 50,
    featuredOnly: true,
    featuredFirst: true,
  })
}

export function mapCombinedRowsToProducts(rows: CombinedListRow[]) {
  return rows.map((row) => {
    const variants: Array<{ price: number }> = []
    if (row.min_price != null) {
      variants.push({ price: row.min_price })
      if (row.max_price != null && row.max_price !== row.min_price) {
        variants.push({ price: row.max_price })
      }
    }

    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      brand: row.brand,
      gender: row.gender,
      color: row.color,
      location: row.location,
      isNew: row.isNew,
      isSecondHand: row.isSecondHand,
      isVip: row.isVip,
      vipExpiresAt: row.vipExpiresAt,
      discount: row.discount,
      discountDays: row.discountDays,
      discountStartDate: row.discountStartDate,
      rating: row.rating,
      categoryId: row.categoryId,
      sizeSystem: row.sizeSystem,
      size: row.size,
      isRentable: row.isRentable,
      createdAt: row.createdAt,
      images: row.image_url ? [{ url: row.image_url }] : [],
      variants,
      rentalPriceTiers:
        row.tier_min_days != null && row.tier_price_per_day != null
          ? [{ minDays: row.tier_min_days, pricePerDay: row.tier_price_per_day }]
          : [],
      category:
        row.cat_id != null && row.cat_name && row.cat_slug
          ? resolveCanonicalCategory({
              id: row.cat_id,
              name: row.cat_name,
              slug: row.cat_slug,
            }) ?? { id: row.cat_id, name: row.cat_name, slug: row.cat_slug }
          : null,
    }
  })
}

/** Single round-trip: products + image + prices + tiers + category. */
export async function fetchPublicProductListCombined(
  filters: PublicListFilters,
): Promise<CombinedListRow[]> {
  const where = buildWhere(filters)
  const orderBy = buildOrderByClause(filters.sort, {
    featuredFirst: filters.featuredFirst,
  })

  return prisma.$queryRaw<CombinedListRow[]>(Prisma.sql`
    WITH ranked AS (
      SELECT
        p.id,
        ROW_NUMBER() OVER (ORDER BY ${orderBy}) AS sort_ord
      FROM "Product" p
      WHERE ${where}
    ),
    filtered AS (
      SELECT
        p.id,
        p.name,
        p.slug,
        p.brand,
        p.gender::text AS gender,
        p.color,
        p.location,
        p."isNew",
        p."isSecondHand",
        p."isVip",
        p."vipExpiresAt",
        p.discount,
        p."discountDays",
        p."discountStartDate",
        p.rating,
        p."categoryId",
        p."sizeSystem"::text AS "sizeSystem",
        p.size,
        p."isRentable",
        p."createdAt",
        r.sort_ord
      FROM ranked r
      INNER JOIN "Product" p ON p.id = r.id
      WHERE r.sort_ord > ${filters.skip}
        AND r.sort_ord <= ${filters.skip + filters.take}
    ),
    cover_images AS (
      SELECT DISTINCT ON (pi."productId")
        pi."productId",
        pi.url
      FROM "ProductImage" pi
      WHERE pi."productId" IN (SELECT id FROM filtered)
      ORDER BY pi."productId", pi.position ASC
    ),
    variant_prices AS (
      SELECT
        pv."productId",
        MIN(pv.price)::float8 AS min_price,
        MAX(pv.price)::float8 AS max_price
      FROM "ProductVariant" pv
      WHERE pv."productId" IN (SELECT id FROM filtered)
      GROUP BY pv."productId"
    ),
    first_tiers AS (
      SELECT DISTINCT ON (rpt."productId")
        rpt."productId",
        rpt."minDays",
        rpt."pricePerDay"
      FROM "RentalPriceTier" rpt
      WHERE rpt."productId" IN (SELECT id FROM filtered)
      ORDER BY rpt."productId", rpt."minDays" ASC
    )
    SELECT
      f.id,
      f.name,
      f.slug,
      f.brand,
      f.gender,
      f.color,
      f.location,
      f."isNew",
      f."isSecondHand",
      f."isVip",
      f."vipExpiresAt",
      f.discount,
      f."discountDays",
      f."discountStartDate",
      f.rating,
      f."categoryId",
      f."sizeSystem",
      f.size,
      f."isRentable",
      f."createdAt",
      ci.url AS image_url,
      vp.min_price,
      vp.max_price,
      ft."minDays" AS tier_min_days,
      ft."pricePerDay" AS tier_price_per_day,
      c.id AS cat_id,
      c.name AS cat_name,
      c.slug AS cat_slug
    FROM filtered f
    LEFT JOIN cover_images ci ON ci."productId" = f.id
    LEFT JOIN variant_prices vp ON vp."productId" = f.id
    LEFT JOIN first_tiers ft ON ft."productId" = f.id
    LEFT JOIN "Category" c ON c.id = f."categoryId"
    ORDER BY f.sort_ord ASC
  `)
}

export function applyExpiredDiscounts<T extends {
  discount: number | null
  discountDays: number | null
  discountStartDate: Date | null
}>(products: T[]): void {
  let hasAnyDiscount = false
  for (let i = 0; i < products.length; i++) {
    if (products[i].discount) {
      hasAnyDiscount = true
      break
    }
  }
  if (!hasAnyDiscount) return

  const now = Date.now()
  const DAY_MS = 86400000
  for (const product of products) {
    if (product.discount && product.discountDays && product.discountStartDate) {
      const startTime = new Date(product.discountStartDate).getTime()
      if (now > startTime + product.discountDays * DAY_MS) {
        product.discount = null
        product.discountDays = null
        product.discountStartDate = null
      }
    }
  }
}

export type CachedListPayload = {
  products: ReturnType<typeof mapCombinedRowsToProducts>
  hasMore: boolean
}

export type ProductListCacheSource = 'memory' | 'next-cache' | 'database'

const MEMORY_CACHE_MAX_ENTRIES = 100
const publicListCache = new Map<string, { at: number; data: CachedListPayload }>()

export function getPublicListCacheKey(filters: PublicListFilters): string {
  return JSON.stringify({
    categoryId: filters.categoryId ?? null,
    categoryIds: filters.categoryIds ?? null,
    gender: filters.gender ?? null,
    isNew: filters.isNew ?? false,
    isSecondHand: filters.isSecondHand ?? false,
    hasDiscount: filters.hasDiscount ?? false,
    isVip: filters.isVip ?? false,
    featuredFirst: filters.featuredFirst ?? false,
    search: filters.search ?? null,
    color: filters.color ?? null,
    colorSearch: filters.colorSearch ?? null,
    sizes: filters.sizes ?? null,
    sizeSystems: filters.sizeSystems ?? null,
    locations: filters.locations ?? null,
    priceMin: filters.priceMin ?? null,
    priceMax: filters.priceMax ?? null,
    purchaseType: filters.purchaseType ?? null,
    sort: filters.sort ?? null,
    skip: filters.skip,
    take: filters.take,
  })
}

function hasActiveFilters(filters: PublicListFilters): boolean {
  return Boolean(
    filters.search ||
      filters.categoryId ||
      filters.categoryIds?.length ||
      filters.gender ||
      filters.isNew ||
      filters.isSecondHand ||
      filters.hasDiscount ||
      filters.isVip ||
      filters.color ||
      filters.colorSearch ||
      filters.sizes?.length ||
      filters.sizeSystems?.length ||
      filters.locations?.length ||
      (filters.priceMin != null && filters.priceMax != null && filters.priceMax > 0) ||
      (filters.purchaseType && filters.purchaseType !== 'all') ||
      (filters.sort && filters.sort !== 'newest'),
  )
}

/** Tiered L1 TTL: default shop page cached longest; search cached briefly. */
export function getMemoryCacheTtlMs(filters: PublicListFilters): number {
  if (filters.search) return 30_000
  if (hasActiveFilters(filters)) return 60_000
  return 120_000
}

export function getHttpCacheControl(filters: PublicListFilters): string {
  if (filters.search) {
    return 'public, s-maxage=30, stale-while-revalidate=60'
  }
  if (hasActiveFilters(filters)) {
    return 'public, s-maxage=60, stale-while-revalidate=180'
  }
  return 'public, s-maxage=120, stale-while-revalidate=300'
}

function readMemoryCache(
  key: string,
  filters: PublicListFilters,
): CachedListPayload | null {
  const hit = publicListCache.get(key)
  const ttlMs = getMemoryCacheTtlMs(filters)
  if (!hit || Date.now() - hit.at > ttlMs) {
    if (hit) publicListCache.delete(key)
    return null
  }
  return hit.data
}

function writeMemoryCache(key: string, data: CachedListPayload): void {
  publicListCache.set(key, { at: Date.now(), data })
  if (publicListCache.size > MEMORY_CACHE_MAX_ENTRIES) {
    const oldest = publicListCache.keys().next().value
    if (oldest) publicListCache.delete(oldest)
  }
}

export function clearPublicListMemoryCache(): void {
  publicListCache.clear()
}

export function revalidateProductListCache(): void {
  clearPublicListMemoryCache()
  revalidateTag(PRODUCT_LIST_CACHE_TAG, 'max')
}

/** Always run on response — discounts can expire while cached payload is still warm. */
export function finalizeProductListResponse(payload: CachedListPayload): CachedListPayload {
  const products = JSON.parse(
    JSON.stringify(payload.products),
  ) as CachedListPayload['products']
  applyExpiredDiscounts(products)
  return { products, hasMore: payload.hasMore }
}

async function buildListPayload(filters: PublicListFilters): Promise<CachedListPayload> {
  const pageSize = filters.take - 1
  const rows = await fetchPublicProductListCombined(filters)
  let mapped = dedupeProductsById(mapCombinedRowsToProducts(rows))

  if (filters.featuredFirst && filters.skip === 0) {
    const featuredRows = await fetchHomepageFeaturedProducts(filters)
    const featuredMapped = dedupeProductsById(mapCombinedRowsToProducts(featuredRows))
    mapped = mergeHomepageFirstPageProducts(mapped, featuredMapped, pageSize)
  }

  const hasMore = rows.length > pageSize || mapped.length > pageSize
  const products = dedupeProductsById(
    mapped.length > pageSize ? mapped.slice(0, pageSize) : mapped,
  )
  return { products, hasMore }
}

const getCachedProductList = unstable_cache(
  async (filtersKey: string): Promise<CachedListPayload> => {
    const filters = JSON.parse(filtersKey) as PublicListFilters
    return buildListPayload(filters)
  },
  ['public-product-list-v9'],
  {
    revalidate: 120,
    tags: [PRODUCT_LIST_CACHE_TAG],
  },
)

/**
 * L1 memory → L2 Next.js data cache → database.
 * Search skips L2 (results change often).
 */
export async function loadPublicProductList(
  filters: PublicListFilters,
  options?: { forceFresh?: boolean },
): Promise<{
  payload: CachedListPayload
  cacheSource: ProductListCacheSource
  listMs: number
}> {
  const cacheKey = getPublicListCacheKey(filters)

  const memoryHit = options?.forceFresh ? null : readMemoryCache(cacheKey, filters)
  if (memoryHit) {
    return {
      payload: memoryHit,
      cacheSource: 'memory',
      listMs: 0,
    }
  }

  const queryStart = Date.now()
  const payload =
    filters.search || options?.forceFresh
      ? await buildListPayload(filters)
      : await getCachedProductList(cacheKey)
  const listMs = Date.now() - queryStart

  if (!options?.forceFresh) {
    writeMemoryCache(cacheKey, payload)
  }

  const cacheSource: ProductListCacheSource =
    filters.search || options?.forceFresh
      ? 'database'
      : listMs < 100
        ? 'next-cache'
        : 'database'

  return { payload, cacheSource, listMs }
}
