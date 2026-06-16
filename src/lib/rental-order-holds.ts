import { prisma } from '@/lib/prisma'
import { RentalInquiryStatus } from '@prisma/client'
import { datesMatch } from '@/lib/rental-inquiry'
import { minRentalEndDateStillBlocking } from '@/lib/rental-dates'
import { revalidateProductCaches } from '@/lib/product-cache-revalidation'
import { markRentalProductsRented } from '@/lib/update-product-status'
import { markInquiryBookedForRentalItem } from '@/lib/rental-inquiry-guard'

/** Only paid (or shipped) rentals block the calendar — not unpaid checkout attempts. */
export const RENTAL_BLOCKING_ORDER_STATUSES = ['PAID', 'SHIPPED'] as const

export async function finalizeRentalOrderHolds(orderId: number): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        where: {
          isRental: true,
          productId: { not: null },
        },
      },
    },
  })

  if (!order?.userId) return

  const rentalProductIds = [
    ...new Set(
      order.items
        .map((item) => item.productId)
        .filter((id): id is number => id != null),
    ),
  ]

  if (rentalProductIds.length > 0) {
    await markRentalProductsRented(rentalProductIds)
  }

  for (const item of order.items) {
    if (!item.productId || !item.rentalStartDate || !item.rentalEndDate) {
      continue
    }
    await markInquiryBookedForRentalItem({
      productId: item.productId,
      buyerId: order.userId,
      startDate: item.rentalStartDate,
      endDate: item.rentalEndDate,
    })
  }
}

async function restoreBookedInquiriesForOrder(order: {
  userId: string | null
  items: Array<{
    productId: number | null
    rentalStartDate: Date | null
    rentalEndDate: Date | null
  }>
}): Promise<void> {
  if (!order.userId) return

  const productIds = order.items
    .map((item) => item.productId)
    .filter((id): id is number => id != null)

  if (productIds.length === 0) return

  const bookedInquiries = await prisma.rentalInquiry.findMany({
    where: {
      buyerId: order.userId,
      productId: { in: productIds },
      status: RentalInquiryStatus.BOOKED,
    },
  })

  for (const inquiry of bookedInquiries) {
    const matchesOrderItem = order.items.some(
      (item) =>
        item.productId === inquiry.productId &&
        item.rentalStartDate &&
        item.rentalEndDate &&
        datesMatch(
          inquiry.startDate,
          inquiry.endDate,
          item.rentalStartDate,
          item.rentalEndDate,
        ),
    )

    if (!matchesOrderItem) continue

    const hasPaidRental = await prisma.orderItem.findFirst({
      where: {
        productId: inquiry.productId,
        isRental: true,
        rentalStartDate: inquiry.startDate,
        rentalEndDate: inquiry.endDate,
        order: {
          userId: order.userId,
          status: { in: [...RENTAL_BLOCKING_ORDER_STATUSES] },
        },
      },
      select: { id: true },
    })

    if (!hasPaidRental) {
      await prisma.rentalInquiry.update({
        where: { id: inquiry.id },
        data: { status: RentalInquiryStatus.APPROVED },
      })
    }
  }
}

async function maybeRestoreProductAvailability(productId: number): Promise<void> {
  const minEnd = minRentalEndDateStillBlocking(new Date())

  const [paidOrderItem, activeRental] = await Promise.all([
    prisma.orderItem.findFirst({
      where: {
        productId,
        isRental: true,
        rentalEndDate: { gte: minEnd },
        order: { status: { in: [...RENTAL_BLOCKING_ORDER_STATUSES] } },
      },
      select: { id: true },
    }),
    prisma.rental.findFirst({
      where: {
        productId,
        status: { in: ['RESERVED', 'ACTIVE'] },
        endDate: { gte: minEnd },
      },
      select: { id: true },
    }),
  ])

  if (paidOrderItem || activeRental) return

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { status: true, userId: true },
  })

  if (product?.status === 'RENTED' || product?.status === 'RESERVED') {
    await prisma.product.update({
      where: { id: productId },
      data: { status: 'AVAILABLE' },
    })
    revalidateProductCaches(productId, { authorId: product.userId })
  }
}

/** Undo rental holds when payment fails or checkout is abandoned. */
export async function releaseRentalOrderHolds(orderId: number): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        where: { isRental: true, productId: { not: null } },
      },
    },
  })

  if (!order) return

  await restoreBookedInquiriesForOrder(order)

  const productIds = [
    ...new Set(
      order.items
        .map((item) => item.productId)
        .filter((id): id is number => id != null),
    ),
  ]

  for (const productId of productIds) {
    await maybeRestoreProductAvailability(productId)
  }
}

export async function abandonPendingPayment(
  orderId: number,
  userId: string,
): Promise<boolean> {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId, status: 'PENDING' },
    select: { id: true },
  })

  if (!order) return false

  await prisma.order.update({
    where: { id: orderId },
    data: { status: 'CANCELED' },
  })
  await releaseRentalOrderHolds(orderId)
  return true
}

/** Fix stuck BOOKED / RENTED state left by unpaid checkout (legacy or abandoned payment). */
export async function recoverStaleUnpaidRentalState(params: {
  buyerId: string
  productId: number
}): Promise<void> {
  const hasPaidRental = await prisma.orderItem.findFirst({
    where: {
      productId: params.productId,
      isRental: true,
      order: {
        userId: params.buyerId,
        status: { in: [...RENTAL_BLOCKING_ORDER_STATUSES] },
      },
    },
    select: { id: true },
  })

  if (hasPaidRental) return

  await prisma.rentalInquiry.updateMany({
    where: {
      buyerId: params.buyerId,
      productId: params.productId,
      status: RentalInquiryStatus.BOOKED,
    },
    data: { status: RentalInquiryStatus.APPROVED },
  })

  await maybeRestoreProductAvailability(params.productId)

  const pendingOrders = await prisma.order.findMany({
    where: {
      userId: params.buyerId,
      status: 'PENDING',
      items: {
        some: {
          productId: params.productId,
          isRental: true,
        },
      },
    },
    select: { id: true },
  })

  for (const pending of pendingOrders) {
    await prisma.order.update({
      where: { id: pending.id },
      data: { status: 'CANCELED' },
    })
  }
}
