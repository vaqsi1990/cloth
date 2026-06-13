import { prisma } from '@/lib/prisma'
import {
  getAliasSlugsForCanonical,
  getCategoryIdBySlugParam,
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
  const ids = new Set(rows.map((row) => row.id))
  const defaultId = getCategoryIdBySlugParam(canonical)
  if (defaultId != null) {
    ids.add(defaultId)
  }
  return [...ids]
}
