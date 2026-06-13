import { prisma } from '@/lib/prisma'
import { DEFAULT_PRODUCT_CATEGORIES } from '@/lib/product-categories'

/** Ensure every canonical shop category exists in DB (upsert by slug). */
export async function syncDefaultCategoriesToDb(): Promise<void> {
  await Promise.all(
    DEFAULT_PRODUCT_CATEGORIES.map((category) =>
      prisma.category.upsert({
        where: { slug: category.slug },
        update: { name: category.name },
        create: { name: category.name, slug: category.slug },
      }),
    ),
  )
}

/** Resolve category id for writes; syncs by slug when UI sent a static default id. */
export async function resolveCategoryIdForWrite(
  categoryId: number,
): Promise<number | null> {
  const existing = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true },
  })
  if (existing) return existing.id

  const fallback = DEFAULT_PRODUCT_CATEGORIES.find((c) => c.id === categoryId)
  if (!fallback) return null

  const synced = await prisma.category.upsert({
    where: { slug: fallback.slug },
    update: { name: fallback.name },
    create: { name: fallback.name, slug: fallback.slug },
  })
  return synced.id
}
