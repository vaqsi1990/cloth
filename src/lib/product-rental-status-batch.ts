import { prisma } from '@/lib/prisma'
import { prismaCacheStrategy } from '@/lib/prisma-cache'
import { dedupeRentalPeriods, minRentalEndDateStillBlocking } from '@/lib/rental-dates'
import { isProductRentalBlockingSuspended } from '@/lib/update-product-status'
import { RENTAL_BLOCKING_ORDER_STATUSES } from '@/lib/rental-blocking-orders'

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

/** Merge rentals from all keys (variant, size, order, inquiry) — single physical item per product. */
export function mergeProductRentalPeriods(
  rentalStatusByKey: Record<string, BatchRentalPeriod[]>,
): BatchRentalPeriod[] {
  const all: BatchRentalPeriod[] = []
  for (const periods of Object.values(rentalStatusByKey)) {
    all.push(...periods)
  }
  return dedupeRentalPeriods(all)
}

function startOfToday(): Date {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}

function pushPeriod(
  map: Record<number, Record<string, BatchRentalPeriod[]>>,
  productId: number,
  key: string,
  period: BatchRentalPeriod,
) {
  if (!map[productId]) map[productId] = {}
  if (!map[productId][key]) map[productId][key] = []
  map[productId][key].push(period)
}

/** Active rental periods per product (rentals, orders, inquiries). */
export async function fetchActiveRentalPeriodsByProduct(
  productIds: number[],
): Promise<Record<number, BatchRentalPeriod[]>> {
  if (productIds.length === 0) return {}

  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, status: true },
    take: 100,
    ...prismaCacheStrategy(RENTAL_STATUS_CACHE),
  })

  const blockingProductIds = products
    .filter((product) => !isProductRentalBlockingSuspended(product.status))
    .map((product) => product.id)

  const emptyResult = Object.fromEntries(
    productIds.map((productId) => [productId, [] as BatchRentalPeriod[]]),
  )

  if (blockingProductIds.length === 0) {
    return emptyResult
  }

  const today = startOfToday()
  const minBlockingEndDate = minRentalEndDateStillBlocking(today)

  const [activeRentals, activeOrders, activeInquiries] = await Promise.all([
    prisma.rental.findMany({
      where: {
        productId: { in: blockingProductIds },
        status: { in: ['RESERVED', 'ACTIVE'] },
        endDate: { gte: minBlockingEndDate },
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
        status: { in: [...RENTAL_BLOCKING_ORDER_STATUSES] },
        items: {
          some: {
            productId: { in: blockingProductIds },
            isRental: true,
            rentalEndDate: { gte: minBlockingEndDate },
          },
        },
      },
      select: {
        status: true,
        items: {
          where: {
            productId: { in: blockingProductIds },
            isRental: true,
            rentalEndDate: { gte: minBlockingEndDate },
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
    prisma.rentalInquiry.findMany({
      where: {
        productId: { in: blockingProductIds },
        status: { in: ['PENDING', 'APPROVED'] },
        endDate: { gte: minBlockingEndDate },
      },
      select: {
        productId: true,
        startDate: true,
        endDate: true,
        status: true,
      },
      take: 100,
      ...prismaCacheStrategy(RENTAL_STATUS_CACHE),
    }),
  ])

  const rentalStatusByProduct: Record<number, Record<string, BatchRentalPeriod[]>> =
    {}

  for (const rental of activeRentals) {
    const variantKey = rental.variantId
      ? `variant_${rental.variantId}`
      : 'no_variant'
    pushPeriod(rentalStatusByProduct, rental.productId, variantKey, {
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
      pushPeriod(rentalStatusByProduct, pid, sizeKey, {
        startDate: item.rentalStartDate.toISOString(),
        endDate: item.rentalEndDate.toISOString(),
        status: order.status,
      })
    }
  }

  for (const inquiry of activeInquiries) {
    pushPeriod(
      rentalStatusByProduct,
      inquiry.productId,
      `inquiry_${inquiry.status}`,
      {
        startDate: inquiry.startDate.toISOString(),
        endDate: inquiry.endDate.toISOString(),
        status: inquiry.status,
      },
    )
  }

  const result: Record<number, BatchRentalPeriod[]> = { ...emptyResult }
  for (const productId of blockingProductIds) {
    result[productId] = mergeProductRentalPeriods(
      rentalStatusByProduct[productId] || {},
    )
  }

  return result
}

/** Batch rental availability for a page of products (server-side). */
export async function fetchBatchRentalStatus(
  productIds: number[],
): Promise<BatchRentalStatusMap> {
  if (productIds.length === 0) return {}

  const [periodsByProduct, products] = await Promise.all([
    fetchActiveRentalPeriodsByProduct(productIds),
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

  const statuses: BatchRentalStatusMap = {}

  for (const product of products) {
    const allProductRentals = periodsByProduct[product.id] || []

    if (product.variants.length === 0) {
      statuses[product.id] = allProductRentals.length > 0
        ? [{
            variantId: 0,
            activeRentals: allProductRentals,
            isAvailable: false,
          }]
        : []
      continue
    }

    statuses[product.id] = product.variants.map((variant) => ({
      variantId: variant.id,
      activeRentals: allProductRentals,
      isAvailable: allProductRentals.length === 0,
    }))
  }

  return statuses
}

export async function fetchProductRentalStatus(productId: number): Promise<{
  variants: BatchVariantRentalStatus[]
  activeRentals: BatchRentalPeriod[]
  totalActiveRentals: number
  totalActiveOrders: number
  totalActiveInquiries: number
}> {
  const minBlockingEndDate = minRentalEndDateStillBlocking(startOfToday())

  const [periodsByProduct, variants, totalActiveRentals, totalActiveOrders, totalActiveInquiries] =
    await Promise.all([
      fetchActiveRentalPeriodsByProduct([productId]),
      prisma.product.findUnique({
        where: { id: productId },
        select: {
          variants: { select: { id: true } },
        },
      }),
      prisma.rental.count({
        where: {
          productId,
          status: { in: ['RESERVED', 'ACTIVE'] },
          endDate: { gte: minBlockingEndDate },
        },
      }),
      prisma.order.count({
        where: {
          status: { in: [...RENTAL_BLOCKING_ORDER_STATUSES] },
          items: {
            some: {
              productId,
              isRental: true,
              rentalEndDate: { gte: minBlockingEndDate },
            },
          },
        },
      }),
      prisma.rentalInquiry.count({
        where: {
          productId,
          status: { in: ['PENDING', 'APPROVED'] },
          endDate: { gte: minBlockingEndDate },
        },
      }),
    ])

  const activeRentals = periodsByProduct[productId] || []
  const allProductRentals = activeRentals

  const variantStatuses: BatchVariantRentalStatus[] =
    variants?.variants.map((variant) => ({
      variantId: variant.id,
      activeRentals: allProductRentals,
      isAvailable: allProductRentals.length === 0,
    })) ?? []

  return {
    variants: variantStatuses,
    activeRentals,
    totalActiveRentals,
    totalActiveOrders,
    totalActiveInquiries,
  }
}
