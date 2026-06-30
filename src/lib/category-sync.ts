import { prisma } from '@/lib/prisma'
import {
  DEFAULT_PRODUCT_CATEGORIES,
  findCanonicalCategoryBySlug,
  findCanonicalCategoryByStaticId,
  resolveProductCategoryForDisplay,
  type ProductCategory,
  type ProductGender,
} from '@/lib/product-categories'

type DbCategory = Pick<ProductCategory, 'id' | 'name' | 'slug'>

async function syncCategoryBySlug(
  slug: string,
  name: string,
): Promise<DbCategory> {
  return prisma.category.upsert({
    where: { slug },
    update: { name },
    create: { name, slug },
    select: { id: true, name: true, slug: true },
  })
}

/** Ensure every canonical shop category exists in DB (upsert by slug). */
export async function syncDefaultCategoriesToDb(): Promise<void> {
  await Promise.all(
    DEFAULT_PRODUCT_CATEGORIES.map((category) =>
      syncCategoryBySlug(category.slug, category.name),
    ),
  )
}

/** Resolve category id for writes; slug is authoritative when provided. */
export async function resolveCategoryIdForWrite(
  categoryId: number,
  categorySlug?: string | null,
): Promise<number | null> {
  if (categorySlug) {
    const canonical = findCanonicalCategoryBySlug(categorySlug)
    const synced = await syncCategoryBySlug(
      canonical?.slug ?? categorySlug,
      canonical?.name ?? categorySlug,
    )
    return synced.id
  }

  const canonical = findCanonicalCategoryByStaticId(categoryId)

  if (canonical) {
    const synced = await syncCategoryBySlug(canonical.slug, canonical.name)
    return synced.id
  }

  const existing = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true },
  })
  return existing?.id ?? null
}

export type ResolvedProductCategory = {
  category: DbCategory | null
  repairedCategoryId: number | null
}

/**
 * Resolve stored category for reads. Repairs legacy rows where product.categoryId
 * equals a static taxonomy id but the DB row at that id has a different slug.
 */
export async function resolveProductCategoryForRead(
  categoryId: number | null | undefined,
  gender?: ProductGender | string | null,
  productId?: number,
): Promise<ResolvedProductCategory> {
  if (!categoryId) {
    return { category: null, repairedCategoryId: null }
  }

  const row = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true, name: true, slug: true },
  })
  if (!row) {
    return { category: null, repairedCategoryId: null }
  }

  const canonical = findCanonicalCategoryByStaticId(categoryId)
  let category = row
  let repairedCategoryId: number | null = null

  if (canonical && canonical.slug !== row.slug) {
    category = await syncCategoryBySlug(canonical.slug, canonical.name)
    if (category.id !== categoryId) {
      repairedCategoryId = category.id
    }
  }

  const displayCategory = resolveProductCategoryForDisplay(
    category,
    gender as ProductGender | null,
  )

  if (repairedCategoryId && productId) {
    prisma.product
      .update({
        where: { id: productId },
        data: { categoryId: repairedCategoryId },
      })
      .catch(() => {})
  }

  return {
    category: displayCategory ?? category,
    repairedCategoryId,
  }
}
