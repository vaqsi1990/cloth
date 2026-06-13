const databaseUrl = process.env.DATABASE_URL ?? ''

export const isAccelerateEnabled =
  databaseUrl.startsWith('prisma://') ||
  databaseUrl.startsWith('prisma+postgres://')

export type PrismaCacheConfig = {
  swr: number
  ttl: number
}

/** Only includes cacheStrategy when Prisma Accelerate is enabled. */
export function prismaCacheStrategy(
  config: PrismaCacheConfig,
): { cacheStrategy: PrismaCacheConfig } | Record<string, never> {
  return isAccelerateEnabled ? { cacheStrategy: config } : {}
}
