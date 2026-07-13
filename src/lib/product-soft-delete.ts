import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { removeCartItemsForProduct } from '@/lib/cart-cleanup'
import { revalidateProductCaches } from '@/lib/product-cache-revalidation'
import { revalidateProductListCache } from '@/lib/product-list-query'

/** Active products visible in shop/search/cart. */
export const notDeletedProductWhere = {
  deletedAt: null,
} satisfies Prisma.ProductWhereInput

export function isProductSoftDeleted(
  product: { deletedAt?: Date | string | null } | null | undefined,
): boolean {
  return product?.deletedAt != null
}

function releaseProductSlug(slug: string, productId: number): string {
  const suffix = `-deleted-${productId}`
  const maxLen = 191
  const base = slug.length + suffix.length > maxLen ? slug.slice(0, maxLen - suffix.length) : slug
  return `${base}${suffix}`
}

export async function softDeleteProduct(productId: number): Promise<{ authorId: string | null }> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, slug: true, userId: true, deletedAt: true },
  })

  if (!product) {
    throw new Error('PRODUCT_NOT_FOUND')
  }

  if (product.deletedAt) {
    return { authorId: product.userId }
  }

  await prisma.$transaction(async (tx) => {
    await removeCartItemsForProduct(productId, tx)
    await tx.product.update({
      where: { id: productId },
      data: {
        deletedAt: new Date(),
        slug: releaseProductSlug(product.slug, productId),
        featuredOnHomepage: false,
        homepageFeaturedAt: null,
      },
    })
  })

  return { authorId: product.userId }
}

export async function softDeleteProductAndRevalidate(productId: number) {
  const { authorId } = await softDeleteProduct(productId)
  try {
    revalidateProductListCache()
    revalidateProductCaches(productId, { authorId: authorId ?? undefined })
  } catch (error) {
    // Soft delete already committed — don't fail the request if cache bust throws.
    console.error('Product cache revalidation failed after soft delete:', error)
  }
}
