import type { PrismaClient } from '@prisma/client'
import { RentalInquiryStatus } from '@prisma/client'
import {
  calcRentalDays,
  datesMatch,
  isRentalEndBeforeStart,
  normalizeDateOnly,
} from '@/lib/rental-dates'

export const INQUIRY_PENDING_HOURS = 48
export const INQUIRY_APPROVED_HOURS = 48
export const MAX_RENTAL_DAYS_DEFAULT = 60

export type RentalPriceTierLike = { minDays: number; pricePerDay: number }

export {
  calcRentalDays,
  datesMatch,
  isRentalEndBeforeStart,
  normalizeDateOnly,
}

export function calcEstimatedTotal(
  days: number,
  tiers: RentalPriceTierLike[],
  fallbackPricePerDay?: number | null,
): number {
  if (days <= 0) return 0
  if (tiers.length > 0) {
    const sorted = [...tiers].sort((a, b) => b.minDays - a.minDays)
    const tier = sorted.find((t) => days >= t.minDays) || sorted[sorted.length - 1]
    return tier.pricePerDay * days
  }
  if (fallbackPricePerDay && fallbackPricePerDay > 0) {
    return fallbackPricePerDay * days
  }
  return 0
}

export function inquiryExpiresAt(from = new Date()): Date {
  return new Date(from.getTime() + INQUIRY_PENDING_HOURS * 60 * 60 * 1000)
}

export function buildInquiryChatMessage(params: {
  productName: string
  startDate: string
  endDate: string
  size?: string | null
  location?: string | null
  estimatedTotal: number
  buyerMessage?: string | null
}): string {
  const lines = [
    `გამარჯობა! მინდა ქირავდეს: ${params.productName}`,
    `თარიღები: ${params.startDate} — ${params.endDate}`,
    params.size ? `ზომა: ${params.size}` : null,
    params.location ? `ლოკაცია: ${params.location}` : null,
    `სავარაუდო ფასი: ₾${params.estimatedTotal.toFixed(2)}`,
    '',
    'გთხოვთ დაადასტუროთ, ადგილზე ხელმისაწვდომია თუ არა.',
    params.buyerMessage?.trim() ? `შენიშვნა: ${params.buyerMessage.trim()}` : null,
  ].filter(Boolean)
  return lines.join('\n')
}

export async function expireStaleInquiries(prisma: PrismaClient) {
  const now = new Date()
  await prisma.rentalInquiry.updateMany({
    where: {
      status: RentalInquiryStatus.PENDING,
      expiresAt: { lt: now },
    },
    data: { status: RentalInquiryStatus.EXPIRED },
  })
  await prisma.rentalInquiry.updateMany({
    where: {
      status: RentalInquiryStatus.APPROVED,
      expiresAt: { lt: now },
    },
    data: { status: RentalInquiryStatus.EXPIRED },
  })
}

export const INQUIRY_STATUS_LABELS: Record<RentalInquiryStatus, string> = {
  PENDING: 'მოლოდინში',
  APPROVED: 'დადასტურებული',
  REJECTED: 'უარყოფილი',
  EXPIRED: 'ვადაგასული',
  BOOKED: 'დაჯავშნილი',
  CANCELLED: 'გაუქმებული',
}
