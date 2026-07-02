import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getCategoryMetaByIdsSync, resolveCanonicalCategory } from '@/lib/product-categories'

type EnrichmentRow = {
  productId: number
  url: string | null
  min_price: number | null
  max_price: number | null
  minDays: number | null
  pricePerDay: number | null
}

export type ProductListScalar = {
  id: number
  name: string
  slug: string
  brand: string | null
  gender: string
  color: string | null
  location: string | null
  isNew: boolean
  isSecondHand: boolean
  isVip?: boolean
  vipExpiresAt?: Date | null
  discount: number | null
  discountDays: number | null
  discountStartDate: Date | null
  rating: number | null
  categoryId: number | null
  sizeSystem: string | null
  size: string | null
  isRentable: boolean
  pricePerDay?: number | null
  maxRentalDays?: number | null
  status?: string
  createdAt?: Date
  sku?: string | null
  userId?: string | null
  approvalStatus?: string
  rejectionReason?: string | null
}

/**
 * Set-based enrichment: each child table scanned once (no per-product LATERAL loops).
 */
async function fetchProductListExtras(ids: number[]): Promise<Map<number, EnrichmentRow>> {
  if (ids.length === 0) return new Map()

  const rows = await prisma.$queryRaw<EnrichmentRow[]>(Prisma.sql`
    WITH ids AS (
      SELECT unnest(ARRAY[${Prisma.join(ids)}]::int[]) AS id
    ),
    cover_images AS (
      SELECT DISTINCT ON (pi."productId")
        pi."productId",
        pi.url
      FROM "ProductImage" pi
      INNER JOIN ids ON ids.id = pi."productId"
      ORDER BY pi."productId", pi.position ASC
    ),
    variant_prices AS (
      SELECT
        pv."productId",
        MIN(pv.price)::float8 AS min_price,
        MAX(pv.price)::float8 AS max_price
      FROM "ProductVariant" pv
      INNER JOIN ids ON ids.id = pv."productId"
      WHERE pv.price > 0
        AND pv.stock > 0
      GROUP BY pv."productId"
    ),
    first_tiers AS (
      SELECT DISTINCT ON (rpt."productId")
        rpt."productId",
        rpt."minDays",
        rpt."pricePerDay"
      FROM "RentalPriceTier" rpt
      INNER JOIN ids ON ids.id = rpt."productId"
      ORDER BY rpt."productId", rpt."minDays" ASC
    )
    SELECT
      ids.id AS "productId",
      ci.url,
      vp.min_price,
      vp.max_price,
      ft."minDays",
      ft."pricePerDay"
    FROM ids
    LEFT JOIN cover_images ci ON ci."productId" = ids.id
    LEFT JOIN variant_prices vp ON vp."productId" = ids.id
    LEFT JOIN first_tiers ft ON ft."productId" = ids.id
  `)

  return new Map(rows.map((row) => [row.productId, row]))
}

export async function enrichProductListRows<T extends ProductListScalar>(
  products: T[],
  options: { includeUser?: boolean } = {},
): Promise<Array<T & {
  images: Array<{ url: string }>
  variants: Array<{ price: number }>
  rentalPriceTiers: Array<{ minDays: number; pricePerDay: number }>
  category: { id: number; name: string; slug: string } | null
  user?: { id: string; name: string | null; email: string | null }
}>> {
  if (products.length === 0) return []

  const ids = products.map((p) => p.id)
  const categoryIds = [
    ...new Set(products.map((p) => p.categoryId).filter((id): id is number => id != null)),
  ]
  const userIds = options.includeUser
    ? [...new Set(products.map((p) => p.userId).filter((id): id is string => !!id))]
    : []

  const dbCategories =
    categoryIds.length > 0
      ? await prisma.category.findMany({
          where: { id: { in: categoryIds } },
          select: { id: true, name: true, slug: true },
        })
      : []

  const categoryById = new Map(
    dbCategories.map((c) => {
      const canonical = resolveCanonicalCategory(c)
      const meta = canonical ?? { id: c.id, name: c.name, slug: c.slug }
      return [c.id, meta] as const
    }),
  )
  for (const id of categoryIds) {
    if (!categoryById.has(id)) {
      const fallback = getCategoryMetaByIdsSync([id]).get(id)
      if (fallback) categoryById.set(id, fallback)
    }
  }

  const extras = await fetchProductListExtras(ids)

  const users =
    userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true },
        })
      : []

  const userById = new Map(users.map((u) => [u.id, u]))

  return products.map((product) => {
    const row = extras.get(product.id)
    const minPrice = row?.min_price ?? null
    const maxPrice = row?.max_price ?? null
    const variants: Array<{ price: number }> = []

    if (minPrice != null) {
      variants.push({ price: minPrice })
      if (maxPrice != null && maxPrice !== minPrice) {
        variants.push({ price: maxPrice })
      }
    }

    return {
      ...product,
      images: row?.url ? [{ url: row.url }] : [],
      variants,
      rentalPriceTiers:
        row?.minDays != null && row?.pricePerDay != null
          ? [{ minDays: row.minDays, pricePerDay: row.pricePerDay }]
          : [],
      category: product.categoryId ? categoryById.get(product.categoryId) ?? null : null,
      ...(options.includeUser && product.userId
        ? { user: userById.get(product.userId) ?? undefined }
        : {}),
    }
  })
}
