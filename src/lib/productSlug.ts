import { prisma } from '@/lib/prisma'

type EnsureUniqueSlugOptions = {
  excludeProductId?: number
}

const sanitizeSlug = (value: string) => {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'product'
  )
}

export const ensureUniqueProductSlug = async (
  rawSlug: string,
  options: EnsureUniqueSlugOptions = {}
) => {
  const baseSlug = sanitizeSlug(rawSlug)
  let candidate = baseSlug
  let suffix = 1

  const slugExists = async (slug: string) => {
    const match = await prisma.product.findFirst({
      where: {
        slug,
        ...(options.excludeProductId
          ? {
              NOT: { id: options.excludeProductId }
            }
          : {})
      },
      select: { id: true }
    })

    return Boolean(match)
  }

  while (await slugExists(candidate)) {
    candidate = `${baseSlug}-${suffix}`
    suffix += 1
  }

  return candidate
}


