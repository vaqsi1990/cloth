import type { ProductStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { revalidateProductCaches } from '@/lib/product-cache-revalidation'

export const PRODUCT_STATUSES = [
  'AVAILABLE',
  'RENTED',
  'RESERVED',
  'MAINTENANCE',
  'DAMAGED',
] as const satisfies readonly ProductStatus[]

export type ProductStatusInput = (typeof PRODUCT_STATUSES)[number]

export function isProductStatus(value: unknown): value is ProductStatusInput {
  return (
    typeof value === 'string' &&
    (PRODUCT_STATUSES as readonly string[]).includes(value)
  )
}

export async function updateProductStatus(
  productId: number,
  status: ProductStatusInput,
) {
  const updatedProduct = await prisma.product.update({
    where: { id: productId },
    data: { status },
    select: {
      id: true,
      status: true,
      userId: true,
      name: true,
      slug: true,
    },
  })

  if (status === 'AVAILABLE') {
    await prisma.orderItem.deleteMany({
      where: {
        productId,
        isRental: true,
      },
    })
  }

  revalidateProductCaches(productId, { authorId: updatedProduct.userId })

  return updatedProduct
}
