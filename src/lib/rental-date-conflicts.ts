import { prisma } from '@/lib/prisma'
import { isRentalEndBeforeStart, hasRentalPeriodConflict } from '@/lib/rental-dates'

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
  const now = new Date()

  const [existingRentals, existingOrders] = await Promise.all([
    prisma.rental.findMany({
      where: {
        productId: { in: productIds },
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
        items: {
          where: {
            productId: { in: productIds },
            isRental: true,
            rentalEndDate: { gte: now },
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

  for (const item of items) {
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
