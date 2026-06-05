import { prisma } from '@/lib/prisma'

type PurposeMeta = { id: number; name: string; slug: string }

let slugToId: Map<string, number> | null = null
let idToMeta: Map<number, PurposeMeta> | null = null
let cacheAt = 0
const TTL_MS = 5 * 60 * 1000

/** Warm purpose cache during API prep so enrich stays in-memory only. */
export function warmPurposeCache(): Promise<void> {
  return ensurePurposeCache()
}

async function ensurePurposeCache(): Promise<void> {
  const now = Date.now()
  if (slugToId && idToMeta && now - cacheAt <= TTL_MS) return

  const rows = await prisma.purpose.findMany({
    select: { id: true, name: true, slug: true },
    // @ts-ignore - Prisma Accelerate cacheStrategy
    cacheStrategy: { swr: 300, ttl: 300 },
  })
  slugToId = new Map(rows.map((r) => [r.slug, r.id]))
  idToMeta = new Map(rows.map((r) => [r.id, r]))
  cacheAt = now
}

/** Resolve purpose slug → DB id with in-memory cache (avoids per-request queries). */
export async function getPurposeIdBySlug(slug: string): Promise<number | null> {
  await ensurePurposeCache()
  return slugToId!.get(slug) ?? null
}

/** Resolve purpose ids from warmed cache (sync — call warmPurposeCache in prep first). */
export function getPurposeMetaByIdsSync(ids: number[]): Map<number, PurposeMeta> {
  const result = new Map<number, PurposeMeta>()
  if (ids.length === 0 || !idToMeta) return result

  for (const id of ids) {
    const meta = idToMeta.get(id)
    if (meta) result.set(id, meta)
  }
  return result
}
