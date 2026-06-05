import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export type PublicListFilters = {
  categoryId?: number | null
  purposeId?: number | null
  gender?: 'WOMEN' | 'MEN' | 'CHILDREN'
  isNew?: boolean
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

type CachedListPayload = {
  products: ReturnType<typeof mapCombinedRowsToProducts>
  hasMore: boolean
}

const PUBLIC_LIST_CACHE_TTL_MS = 30_000
const publicListCache = new Map<string, { at: number; data: CachedListPayload }>()

export function getPublicListCacheKey(filters: PublicListFilters): string {
  return JSON.stringify({
    categoryId: filters.categoryId ?? null,
    purposeId: filters.purposeId ?? null,
    gender: filters.gender ?? null,
    isNew: filters.isNew ?? false,
    search: filters.search ?? null,
    skip: filters.skip,
    take: filters.take,
  })
}

export function readPublicListCache(key: string): CachedListPayload | null {
  const hit = publicListCache.get(key)
  if (!hit || Date.now() - hit.at > PUBLIC_LIST_CACHE_TTL_MS) {
    if (hit) publicListCache.delete(key)
    return null
  }
  return hit.data
}

export function writePublicListCache(key: string, data: CachedListPayload): void {
  publicListCache.set(key, { at: Date.now(), data })
  if (publicListCache.size > 50) {
    const oldest = publicListCache.keys().next().value
    if (oldest) publicListCache.delete(oldest)
  }
}
