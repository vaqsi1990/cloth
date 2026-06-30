import { prisma } from '@/lib/prisma'
import {
  getAliasSlugsForCanonical,
  getCategoryIdBySlugParam,
  getStaticCategoryIdsForCanonicalSlug,
  resolveCategorySlugParam,
} from '@/lib/product-categories'

/** Primary + legacy category ids for one canonical shop filter slug. */
export async function resolveCategoryIdsForFilter(
  categoryParam: string,
): Promise<number[]> {
  const canonical = resolveCategorySlugParam(categoryParam)
  const slugs = getAliasSlugsForCanonical(canonical)
  const rows = await prisma.category.findMany({
    where: { slug: { in: slugs } },
    select: { id: true },
  })
  const ids = new Set(getStaticCategoryIdsForCanonicalSlug(canonical))
  for (const row of rows) {
    ids.add(row.id)
  }
  const defaultId = getCategoryIdBySlugParam(canonical)
  if (defaultId != null) {
    ids.add(defaultId)
  }
  return [...ids]
}

/** Resolve category ids for multiple shop filter slugs (OR semantics). */
export async function resolveCategoryIdsForFilterSlugs(
  categoryParams: string[],
): Promise<number[]> {
  const ids = new Set<number>()

  for (const param of categoryParams) {
    const trimmed = param.trim()
    if (!trimmed) continue

    try {
      const resolved = await resolveCategoryIdsForFilter(trimmed)
      for (const id of resolved) ids.add(id)
    } catch {
      const fallbackId = getCategoryIdBySlugParam(trimmed)
      if (fallbackId != null) ids.add(fallbackId)
    }
  }

  return [...ids]
}
