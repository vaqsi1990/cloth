import { prisma } from '@/lib/prisma'

let cache: Map<string, number> | null = null
let cacheAt = 0
const TTL_MS = 5 * 60 * 1000

/** Resolve purpose slug → DB id with in-memory cache (avoids per-request queries). */
export async function getPurposeIdBySlug(slug: string): Promise<number | null> {
  const now = Date.now()
  if (!cache || now - cacheAt > TTL_MS) {
    const rows = await prisma.purpose.findMany({
      select: { id: true, slug: true },
    })
    cache = new Map(rows.map((r) => [r.slug, r.id]))
    cacheAt = now
  }
  return cache.get(slug) ?? null
}
