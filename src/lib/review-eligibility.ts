import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

type ReviewEligibilityInput = {
  productId: number
  productUserId: string | null
  productStatus: string
  userId: string
  userEmail?: string | null
  userPhone?: string | null
}

const ACTIVE_ORDER_STATUSES: Prisma.OrderWhereInput['status'] = {
  notIn: ['CANCELED', 'REFUNDED'],
}

function buildUserOrderMatch(
  userId: string,
  userEmail?: string | null,
  userPhone?: string | null,
): Prisma.OrderItemWhereInput {
  const guestMatch: Prisma.OrderWhereInput[] = []
  if (userEmail) guestMatch.push({ email: userEmail })
  if (userPhone) guestMatch.push({ phone: userPhone })

  const matches: Prisma.OrderItemWhereInput[] = [
    { order: { userId, status: ACTIVE_ORDER_STATUSES } },
  ]

  if (guestMatch.length > 0) {
    matches.push({
      order: {
        userId: null,
        OR: guestMatch,
        status: ACTIVE_ORDER_STATUSES,
      },
    })
  }

  return { OR: matches }
}

/** Parallel eligibility checks — replaces 5+ sequential queries on reviews routes. */
export async function checkCanUserReviewProduct(
  input: ReviewEligibilityInput,
): Promise<boolean> {
  const { productId, productUserId, productStatus, userId, userEmail, userPhone } =
    input

  if (productUserId === userId) return true

  const orderMatch = buildUserOrderMatch(userId, userEmail, userPhone)
  const rentalWhere: Prisma.RentalWhereInput = {
    productId,
    userId,
    status: { not: 'CANCELED' },
  }

  if (productStatus !== 'RENTED') {
    const [userRental, userOrderRental] = await Promise.all([
      prisma.rental.findFirst({
        // @ts-ignore - Prisma Accelerate cacheStrategy
        cacheStrategy: { swr: 60, ttl: 60 },
        where: rentalWhere,
        select: { id: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.orderItem.findFirst({
        // @ts-ignore - Prisma Accelerate cacheStrategy
        cacheStrategy: { swr: 60, ttl: 60 },
        where: { productId, isRental: true, ...orderMatch },
        select: { id: true },
      }),
    ])
    return !!(userRental || userOrderRental)
  }

  const [userRental, userOrderRental, userOrderItem, lenientOrderItem] =
    await Promise.all([
      prisma.rental.findFirst({
        // @ts-ignore - Prisma Accelerate cacheStrategy
        cacheStrategy: { swr: 60, ttl: 60 },
        where: rentalWhere,
        select: { id: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.orderItem.findFirst({
        // @ts-ignore - Prisma Accelerate cacheStrategy
        cacheStrategy: { swr: 60, ttl: 60 },
        where: { productId, isRental: true, ...orderMatch },
        select: { id: true },
      }),
      prisma.orderItem.findFirst({
        // @ts-ignore - Prisma Accelerate cacheStrategy
        cacheStrategy: { swr: 60, ttl: 60 },
        where: { productId, ...orderMatch },
        select: { id: true },
      }),
      prisma.orderItem.findFirst({
        // @ts-ignore - Prisma Accelerate cacheStrategy
        cacheStrategy: { swr: 60, ttl: 60 },
        where: {
          productId,
          order: { status: ACTIVE_ORDER_STATUSES },
        },
        select: { id: true },
      }),
    ])

  return !!(userRental || userOrderRental || userOrderItem || lenientOrderItem)
}
