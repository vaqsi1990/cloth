import { prisma } from '@/lib/prisma'
import { isRentalEndBeforeStart, hasRentalPeriodConflict, minRentalEndDateStillBlocking } from '@/lib/rental-dates'
import { isProductRentalBlockingSuspended } from '@/lib/update-product-status'
import { RENTAL_BLOCKING_ORDER_STATUSES } from '@/lib/rental-order-holds'

export function hasRentalDateConflict(
  start: Date,
  end: Date,
  existingStart: Date,
  existingEnd: Date,
): boolean {
  return hasRentalPeriodConflict(start, end, existingStart, existingEnd)
}

type RentalItemInput = {
  productId: number
  productName: string
  size: string
  rentalStartDate: string
  rentalEndDate: string
}

/** Batch-fetch active rentals/orders once, then validate all cart rental items in memory. */
export async function findRentalDateConflict(
  items: RentalItemInput[],
): Promise<string | null> {
  if (items.length === 0) return null

  const productIds = [...new Set(items.map((i) => i.productId))]
  const minBlockingEndDate = minRentalEndDateStillBlocking(new Date())

  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, status: true },
  })
  const blockingProductIds = new Set(
    products
      .filter((product) => !isProductRentalBlockingSuspended(product.status))
      .map((product) => product.id),
  )

  const blockingItems = items.filter((item) => blockingProductIds.has(item.productId))
  if (blockingItems.length === 0) return null

  const blockingIds = [...blockingProductIds]

  const [existingRentals, existingOrders] = await Promise.all([
    prisma.rental.findMany({
      where: {
        productId: { in: blockingIds },
        status: { in: ['RESERVED', 'ACTIVE'] },
      },
      select: {
        productId: true,
        startDate: true,
        endDate: true,
      },
    }),
    prisma.order.findMany({
      where: {
        status: { in: [...RENTAL_BLOCKING_ORDER_STATUSES] },
        items: {
          some: {
            productId: { in: blockingIds },
            isRental: true,
            rentalEndDate: { gte: minBlockingEndDate },
          },
        },
      },
      select: {
        items: {
          where: {
            productId: { in: blockingIds },
            isRental: true,
            rentalEndDate: { gte: minBlockingEndDate },
          },
          select: {
            productId: true,
            size: true,
            isRental: true,
            rentalStartDate: true,
            rentalEndDate: true,
          },
        },
      },
      take: 200,
    }),
  ])

  const rentalsByProduct = new Map<number, typeof existingRentals>()
  for (const rental of existingRentals) {
    const list = rentalsByProduct.get(rental.productId) ?? []
    list.push(rental)
    rentalsByProduct.set(rental.productId, list)
  }

  const orderItemsByProductSize = new Map<string, Array<{
    rentalStartDate: Date
    rentalEndDate: Date
  }>>()

  for (const order of existingOrders) {
    for (const orderItem of order.items) {
      if (!orderItem.isRental || !orderItem.rentalStartDate || !orderItem.rentalEndDate) {
        continue
      }
      const key = `${orderItem.productId}:${orderItem.size || ''}`
      const list = orderItemsByProductSize.get(key) ?? []
      list.push({
        rentalStartDate: orderItem.rentalStartDate,
        rentalEndDate: orderItem.rentalEndDate,
      })
      orderItemsByProductSize.set(key, list)
    }
  }

  for (const item of blockingItems) {
    const start = new Date(item.rentalStartDate)
    const end = new Date(item.rentalEndDate)

    if (isRentalEndBeforeStart(start, end)) {
      return `არასწორი თარიღების დიაპაზონი პროდუქტისთვის ${item.productName}`
    }

    for (const rental of rentalsByProduct.get(item.productId) ?? []) {
      if (hasRentalDateConflict(start, end, rental.startDate, rental.endDate)) {
        return `პროდუქტი ${item.productName} (${item.size}) არ არის ხელმისაწვდომი არჩეულ თარიღებზე`
      }
    }

    const sizeKey = `${item.productId}:${item.size || ''}`
    for (const orderItem of orderItemsByProductSize.get(sizeKey) ?? []) {
      if (
        hasRentalDateConflict(
          start,
          end,
          orderItem.rentalStartDate,
          orderItem.rentalEndDate,
        )
      ) {
        return `პროდუქტი ${item.productName} (${item.size}) არ არის ხელმისაწვდომი არჩეულ თარიღებზე`
      }
    }
  }

  return null
}
