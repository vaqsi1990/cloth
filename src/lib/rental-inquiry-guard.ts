import { prisma } from '@/lib/prisma'
import { RentalInquiry, RentalInquiryStatus } from '@prisma/client'
import { datesMatch, expireStaleInquiries, normalizeDateOnly } from '@/lib/rental-inquiry'

const ACTIVE_ORDER_STATUSES = ['PENDING', 'PAID', 'SHIPPED'] as const

async function hasRentalOrderForInquiry(
  buyerId: string,
  productId: number,
  startDate: Date,
  endDate: Date,
): Promise<boolean> {
  const orderItem = await prisma.orderItem.findFirst({
    where: {
      productId,
      isRental: true,
      rentalStartDate: startDate,
      rentalEndDate: endDate,
      order: {
        userId: buyerId,
        status: { in: [...ACTIVE_ORDER_STATUSES] },
      },
    },
    select: { id: true },
  })

  return Boolean(orderItem)
}

/** BOOKED was previously set on cart add; restore APPROVED when checkout never happened. */
async function recoverStuckBookedInquiry(
  inquiry: RentalInquiry,
  buyerId: string,
): Promise<RentalInquiry> {
  if (inquiry.status !== RentalInquiryStatus.BOOKED) {
    return inquiry
  }

  const ordered = await hasRentalOrderForInquiry(
    buyerId,
    inquiry.productId,
    inquiry.startDate,
    inquiry.endDate,
  )

  if (ordered) {
    return inquiry
  }

  return prisma.rentalInquiry.update({
    where: { id: inquiry.id },
    data: { status: RentalInquiryStatus.APPROVED },
  })
}

async function findBookableInquiry(params: {
  productId: number
  buyerId: string
}): Promise<RentalInquiry | null> {
  const inquiries = await prisma.rentalInquiry.findMany({
    where: {
      productId: params.productId,
      buyerId: params.buyerId,
      status: { in: [RentalInquiryStatus.APPROVED, RentalInquiryStatus.BOOKED] },
      onSiteAvailable: true,
    },
    orderBy: { approvedAt: 'desc' },
    take: 5,
  })

  for (const candidate of inquiries) {
    const inquiry = await recoverStuckBookedInquiry(candidate, params.buyerId)
    if (inquiry.status === RentalInquiryStatus.APPROVED) {
      return inquiry
    }
  }

  return null
}

export async function assertRentalInquiryApproved(params: {
  productId: number
  buyerId: string
  startDate: string
  endDate: string
  size?: string
}): Promise<{ ok: true; inquiryId: number } | { ok: false; message: string }> {
  await expireStaleInquiries(prisma)

  const product = await prisma.product.findUnique({
    where: { id: params.productId },
    select: { isRentable: true, requiresInquiryBeforeRent: true },
  })

  if (!product?.isRentable) {
    return { ok: true, inquiryId: 0 }
  }

  if (!product.requiresInquiryBeforeRent) {
    return { ok: true, inquiryId: 0 }
  }

  const start = normalizeDateOnly(params.startDate)
  const end = normalizeDateOnly(params.endDate)

  const inquiry = await findBookableInquiry({
    productId: params.productId,
    buyerId: params.buyerId,
  })

  if (!inquiry) {
    return {
      ok: false,
      message: 'ჯერ გაგზავნეთ მოთხოვნა ავტორთან და დაელოდეთ დადასტურებას',
    }
  }

  if (!datesMatch(inquiry.startDate, inquiry.endDate, start, end)) {
    return {
      ok: false,
      message: 'დადასტურებული მოთხოვნის თარიღები არ ემთხვევა არჩეულ პერიოდს',
    }
  }

  if (inquiry.expiresAt < new Date()) {
    return {
      ok: false,
      message: 'დადასტურების ვადა ამოიწურა — გაგზავნეთ ახალი მოთხოვნა',
    }
  }

  if (params.size && inquiry.size && inquiry.size !== params.size) {
    return {
      ok: false,
      message: 'დადასტურებული ზომა არ ემთხვევა არჩეულ ზომას',
    }
  }

  return { ok: true, inquiryId: inquiry.id }
}

export async function markInquiryBooked(inquiryId: number) {
  if (!inquiryId) return
  await prisma.rentalInquiry.update({
    where: { id: inquiryId },
    data: { status: RentalInquiryStatus.BOOKED },
  })
}

export async function markInquiryBookedForRentalItem(params: {
  productId: number
  buyerId: string
  startDate: Date
  endDate: Date
}) {
  const inquiry = await prisma.rentalInquiry.findFirst({
    where: {
      productId: params.productId,
      buyerId: params.buyerId,
      status: RentalInquiryStatus.APPROVED,
      onSiteAvailable: true,
    },
    orderBy: { approvedAt: 'desc' },
  })

  if (!inquiry) return

  if (!datesMatch(inquiry.startDate, inquiry.endDate, params.startDate, params.endDate)) {
    return
  }

  await markInquiryBooked(inquiry.id)
}

export async function resolveInquiryForDisplay(
  inquiry: RentalInquiry,
  buyerId: string,
): Promise<RentalInquiry> {
  return recoverStuckBookedInquiry(inquiry, buyerId)
}
