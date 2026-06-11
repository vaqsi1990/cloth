import { Prisma } from '@prisma/client'
import { unstable_cache } from 'next/cache'
import { revalidateTag } from 'next/cache'
import { prisma } from '@/lib/prisma'

export const PRODUCT_LIST_CACHE_TAG = 'product-list'

export type PublicListFilters = {
  categoryId?: number | null
  purposeId?: number | null
  gender?: 'WOMEN' | 'MEN' | 'CHILDREN'
  isNew?: boolean
  isSecondHand?: boolean
  hasDiscount?: boolean
  search?: string
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
  discount: number | null
  discountDays: number | null
  discountStartDate: Date | null
  rating: number | null
  categoryId: number | null
  purposeId: number | null
  sizeSystem: string | null
  size: string | null
  isRentable: boolean
  image_url: string | null
  min_price: number | null
  max_price: number | null
  tier_min_days: number | null
  tier_price_per_day: number | null
  cat_id: number | null
  cat_name: string | null
  cat_slug: string | null
  pur_id: number | null
  pur_name: string | null
  pur_slug: string | null
}

function buildWhere(filters: PublicListFilters): Prisma.Sql {
  const parts: Prisma.Sql[] = [
    Prisma.sql`p.status NOT IN ('MAINTENANCE', 'DAMAGED', 'RESERVED')`,
    Prisma.sql`p."approvalStatus" = 'APPROVED'`,
    Prisma.sql`p."userId" IS NOT NULL`,
  ]

  if (filters.categoryId) {
    parts.push(Prisma.sql`p."categoryId" = ${filters.categoryId}`)
  }
  if (filters.purposeId) {
    parts.push(Prisma.sql`p."purposeId" = ${filters.purposeId}`)
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
  if (filters.search) {
    const pattern = `%${filters.search}%`
    parts.push(
      Prisma.sql`(p.name ILIKE ${pattern} OR p.brand ILIKE ${pattern})`,
    )
  }

  return Prisma.join(parts, ' AND ')
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
      discount: row.discount,
      discountDays: row.discountDays,
      discountStartDate: row.discountStartDate,
      rating: row.rating,
      categoryId: row.categoryId,
      purposeId: row.purposeId,
      sizeSystem: row.sizeSystem,
      size: row.size,
      isRentable: row.isRentable,
      images: row.image_url ? [{ url: row.image_url }] : [],
      variants,
      rentalPriceTiers:
        row.tier_min_days != null && row.tier_price_per_day != null
          ? [{ minDays: row.tier_min_days, pricePerDay: row.tier_price_per_day }]
          : [],
      category:
        row.cat_id != null && row.cat_name && row.cat_slug
          ? { id: row.cat_id, name: row.cat_name, slug: row.cat_slug }
          : null,
      purpose:
        row.pur_id != null && row.pur_name && row.pur_slug
          ? { id: row.pur_id, name: row.pur_name, slug: row.pur_slug }
          : null,
    }
  })
}

/** Single round-trip: products + image + prices + tiers + category + purpose. */
export async function fetchPublicProductListCombined(
  filters: PublicListFilters,
): Promise<CombinedListRow[]> {
  const where = buildWhere(filters)

  return prisma.$queryRaw<CombinedListRow[]>(Prisma.sql`
    WITH filtered AS (
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
        p.discount,
        p."discountDays",
        p."discountStartDate",
        p.rating,
        p."categoryId",
        p."purposeId",
        p."sizeSystem"::text AS "sizeSystem",
        p.size,
        p."isRentable",
        p."createdAt"
      FROM "Product" p
      WHERE ${where}
      ORDER BY p."createdAt" DESC, p.id DESC
      LIMIT ${filters.take}
      OFFSET ${filters.skip}
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
      f.discount,
      f."discountDays",
      f."discountStartDate",
      f.rating,
      f."categoryId",
      f."purposeId",
      f."sizeSystem",
      f.size,
      f."isRentable",
      ci.url AS image_url,
      vp.min_price,
      vp.max_price,
      ft."minDays" AS tier_min_days,
      ft."pricePerDay" AS tier_price_per_day,
      c.id AS cat_id,
      c.name AS cat_name,
      c.slug AS cat_slug,
      pu.id AS pur_id,
      pu.name AS pur_name,
      pu.slug AS pur_slug
    FROM filtered f
    LEFT JOIN cover_images ci ON ci."productId" = f.id
    LEFT JOIN variant_prices vp ON vp."productId" = f.id
    LEFT JOIN first_tiers ft ON ft."productId" = f.id
    LEFT JOIN "Category" c ON c.id = f."categoryId"
    LEFT JOIN "Purpose" pu ON pu.id = f."purposeId"
    ORDER BY f."createdAt" DESC, f.id DESC
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
    purposeId: filters.purposeId ?? null,
    gender: filters.gender ?? null,
    isNew: filters.isNew ?? false,
    isSecondHand: filters.isSecondHand ?? false,
    hasDiscount: filters.hasDiscount ?? false,
    search: filters.search ?? null,
    skip: filters.skip,
    take: filters.take,
  })
}

function hasActiveFilters(filters: PublicListFilters): boolean {
  return Boolean(
    filters.search ||
      filters.categoryId ||
      filters.purposeId ||
      filters.gender ||
      filters.isNew ||
      filters.isSecondHand ||
      filters.hasDiscount,
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
  const rows = await fetchPublicProductListCombined(filters)
  const mapped = mapCombinedRowsToProducts(rows)
  const pageSize = filters.take - 1
  const hasMore = mapped.length > pageSize
  const products = hasMore ? mapped.slice(0, pageSize) : mapped
  return { products, hasMore }
}

const getCachedProductList = unstable_cache(
  async (filtersKey: string): Promise<CachedListPayload> => {
    const filters = JSON.parse(filtersKey) as PublicListFilters
    return buildListPayload(filters)
  },
  ['public-product-list-v2'],
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
): Promise<{
  payload: CachedListPayload
  cacheSource: ProductListCacheSource
  listMs: number
}> {
  const cacheKey = getPublicListCacheKey(filters)

  const memoryHit = readMemoryCache(cacheKey, filters)
  if (memoryHit) {
    return {
      payload: memoryHit,
      cacheSource: 'memory',
      listMs: 0,
    }
  }

  const queryStart = Date.now()
  const payload = filters.search
    ? await buildListPayload(filters)
    : await getCachedProductList(cacheKey)
  const listMs = Date.now() - queryStart

  writeMemoryCache(cacheKey, payload)

  const cacheSource: ProductListCacheSource = filters.search
    ? 'database'
    : listMs < 100
      ? 'next-cache'
      : 'database'

  return { payload, cacheSource, listMs }
}
