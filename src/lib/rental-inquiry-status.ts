import type { PrismaClient } from '@prisma/client'
import { RentalInquiryStatus } from '@prisma/client'
import { inquiryApprovedExpiresAt } from '@/lib/rental-inquiry'

export type RentalInquirySellerResponse = 'APPROVED' | 'REJECTED'

export type ApplyRentalInquirySellerResponseResult =
  | { ok: true; status: RentalInquirySellerResponse }
  | { ok: false; code: 'NOT_FOUND' | 'FORBIDDEN' | 'ALREADY_PROCESSED' | 'INVALID_APPROVE' }

export async function applyRentalInquirySellerResponse(
  prisma: PrismaClient,
  inquiryId: number,
  sellerId: string,
  status: RentalInquirySellerResponse,
  options?: { sellerNote?: string | null },
): Promise<ApplyRentalInquirySellerResponseResult> {
  const inquiry = await prisma.rentalInquiry.findUnique({
    where: { id: inquiryId },
    select: {
      id: true,
      sellerId: true,
      status: true,
      chatRoomId: true,
    },
  })

  if (!inquiry) {
    return { ok: false, code: 'NOT_FOUND' }
  }

  if (inquiry.sellerId !== sellerId) {
    return { ok: false, code: 'FORBIDDEN' }
  }

  if (inquiry.status !== RentalInquiryStatus.PENDING) {
    return { ok: false, code: 'ALREADY_PROCESSED' }
  }

  const now = new Date()
  const sellerNote = options?.sellerNote?.trim() || null

  if (status === 'APPROVED') {
    await prisma.rentalInquiry.update({
      where: { id: inquiryId },
      data: {
        status: RentalInquiryStatus.APPROVED,
        onSiteAvailable: true,
        sellerNote,
        approvedAt: now,
        rejectedAt: null,
        expiresAt: inquiryApprovedExpiresAt(now),
      },
    })
  } else {
    await prisma.rentalInquiry.update({
      where: { id: inquiryId },
      data: {
        status: RentalInquiryStatus.REJECTED,
        onSiteAvailable: false,
        sellerNote,
        rejectedAt: now,
        approvedAt: null,
      },
    })
  }

  if (inquiry.chatRoomId) {
    const statusText =
      status === 'APPROVED'
        ? '✅ მოთხოვნა დადასტურებულია — გადახდისთვის გაქვთ 30 წუთი. დაჯავშნეთ პროდუქტის გვერდიდან.'
        : '❌ მოთხოვნა უარყოფილია — ამ თარიღებზე პროდუქტი ადგილზე არ არის ხელმისაწვდომი.'

    const note = sellerNote ? `\n${sellerNote}` : ''

    await prisma.chatMessage.create({
      data: {
        chatRoomId: inquiry.chatRoomId,
        content: statusText + note,
        adminId: inquiry.sellerId,
        isFromAdmin: true,
      },
    })
  }

  return { ok: true, status }
}
