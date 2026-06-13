import { prisma } from '@/lib/prisma'
import { prismaCacheStrategy } from '@/lib/prisma-cache'

const RENTAL_STATUS_CACHE = { swr: 30, ttl: 30 }

export type BatchRentalPeriod = {
  startDate: string
  endDate: string
  status: string
}

export type BatchVariantRentalStatus = {
  variantId: number
  activeRentals: BatchRentalPeriod[]
  isAvailable: boolean
}

export type BatchRentalStatusMap = Record<number, BatchVariantRentalStatus[]>

/** Batch rental availability for a page of products (server-side). */
export async function fetchBatchRentalStatus(
  productIds: number[],
): Promise<BatchRentalStatusMap> {
  if (productIds.length === 0) return {}

  const now = new Date()

  const [activeRentals, activeOrders, products] = await Promise.all([
    prisma.rental.findMany({
      where: {
        productId: { in: productIds },
        status: { in: ['RESERVED', 'ACTIVE'] },
        endDate: { gte: now },
      },
      select: {
        productId: true,
        variantId: true,
        startDate: true,
        endDate: true,
        status: true,
      },
      orderBy: { startDate: 'asc' },
      take: 200,
      ...prismaCacheStrategy(RENTAL_STATUS_CACHE),
    }),
    prisma.order.findMany({
      where: {
        status: { in: ['PENDING', 'PAID', 'SHIPPED'] },
        items: {
          some: {
            productId: { in: productIds },
            isRental: true,
            rentalEndDate: { gte: now },
          },
        },
      },
      select: {
        status: true,
        items: {
          where: {
            productId: { in: productIds },
            isRental: true,
            rentalEndDate: { gte: now },
          },
          select: {
            productId: true,
            isRental: true,
            rentalStartDate: true,
            rentalEndDate: true,
            size: true,
          },
        },
      },
      take: 100,
      ...prismaCacheStrategy(RENTAL_STATUS_CACHE),
    }),
    prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        variants: {
          select: { id: true },
        },
      },
      take: 100,
      ...prismaCacheStrategy(RENTAL_STATUS_CACHE),
    }),
  ])

  const rentalStatusByProduct: Record<number, Record<string, BatchRentalPeriod[]>> =
    {}

  for (const rental of activeRentals) {
    const pid = rental.productId
    const variantKey = rental.variantId
      ? `variant_${rental.variantId}`
      : 'no_variant'
    if (!rentalStatusByProduct[pid]) rentalStatusByProduct[pid] = {}
    if (!rentalStatusByProduct[pid][variantKey]) {
      rentalStatusByProduct[pid][variantKey] = []
    }
    rentalStatusByProduct[pid][variantKey].push({
      startDate: rental.startDate.toISOString(),
      endDate: rental.endDate.toISOString(),
      status: rental.status,
    })
  }

  for (const order of activeOrders) {
    for (const item of order.items) {
      if (!item.isRental || !item.rentalStartDate || !item.rentalEndDate) {
        continue
      }
      const pid = item.productId as number
      const sizeKey = item.size || 'default'
      if (!rentalStatusByProduct[pid]) rentalStatusByProduct[pid] = {}
      if (!rentalStatusByProduct[pid][sizeKey]) {
        rentalStatusByProduct[pid][sizeKey] = []
      }
      rentalStatusByProduct[pid][sizeKey].push({
        startDate: item.rentalStartDate.toISOString(),
        endDate: item.rentalEndDate.toISOString(),
        status: order.status,
      })
    }
  }

  const statuses: BatchRentalStatusMap = {}

  for (const product of products) {
    const rentalStatusBySize = rentalStatusByProduct[product.id] || {}

    statuses[product.id] = product.variants.map((variant) => {
      const variantKey = `variant_${variant.id}`
      const variantRentals = rentalStatusBySize[variantKey] || []
      return {
        variantId: variant.id,
        activeRentals: variantRentals,
        isAvailable: variantRentals.length === 0,
      }
    })
  }

  return statuses
}
