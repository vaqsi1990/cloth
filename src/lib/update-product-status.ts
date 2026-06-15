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

/** Manual AVAILABLE status overrides calendar blocks from past rentals/orders. */
export function isProductRentalBlockingSuspended(
  status: ProductStatus | string | null | undefined,
): boolean {
  return status === 'AVAILABLE'
}

/** Clear rental blocks so the product can be booked again immediately. */
export async function clearProductRentalBlocks(productId: number): Promise<void> {
  await Promise.all([
    prisma.orderItem.deleteMany({
      where: {
        productId,
        isRental: true,
      },
    }),
    prisma.rental.updateMany({
      where: {
        productId,
        status: { in: ['RESERVED', 'ACTIVE'] },
      },
      data: { status: 'CANCELED' },
    }),
    prisma.rentalInquiry.updateMany({
      where: {
        productId,
        status: { in: ['PENDING', 'APPROVED', 'BOOKED'] },
      },
      data: { status: 'CANCELLED' },
    }),
  ])
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
    await clearProductRentalBlocks(productId)
  }

  revalidateProductCaches(productId, { authorId: updatedProduct.userId })

  return updatedProduct
}
