import { prisma } from '@/lib/prisma'
import { RentalInquiryStatus } from '@prisma/client'
import { datesMatch, expireStaleInquiries, normalizeDateOnly } from '@/lib/rental-inquiry'

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

  const inquiry = await prisma.rentalInquiry.findFirst({
    where: {
      productId: params.productId,
      buyerId: params.buyerId,
      status: RentalInquiryStatus.APPROVED,
      onSiteAvailable: true,
    },
    orderBy: { approvedAt: 'desc' },
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
