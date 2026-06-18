import type { PrismaClient } from '@prisma/client'
import { RentalInquiryStatus } from '@prisma/client'
import {
  processExpiredDiscount,
  productHasActiveDiscount,
  type DiscountFields,
} from '@/lib/discount-helpers'
import { getBuyerPrice, getBuyerPriceAfterSellerDiscount } from '@/lib/platform-pricing'
import { computeRentalSellerTotal } from '@/lib/resolve-cart-item-price'
import {
  calcRentalDays,
  datesMatch,
  isRentalEndBeforeStart,
  normalizeDateOnly,
} from '@/lib/rental-dates'

export const INQUIRY_PENDING_HOURS = 48
export const INQUIRY_APPROVED_MINUTES = 30
export const MAX_RENTAL_DAYS_DEFAULT = 10

export type RentalPriceTierLike = { minDays: number; pricePerDay: number }

export {
  calcRentalDays,
  datesMatch,
  isRentalEndBeforeStart,
  normalizeDateOnly,
}

export type RentalInquiryPricingProduct = DiscountFields & {
  pricePerDay?: number | null
  rentalPriceTiers: RentalPriceTierLike[]
}

/** Match product page tier fallback when only pricePerDay is set. */
export function resolveRentalPriceTiers(
  tiers: RentalPriceTierLike[],
  fallbackPricePerDay?: number | null,
): RentalPriceTierLike[] {
  const valid = tiers.filter((t) => t.minDays > 0 && t.pricePerDay > 0)
  if (valid.length > 0) {
    return valid
  }

  if (fallbackPricePerDay && fallbackPricePerDay > 0) {
    return [
      { minDays: 4, pricePerDay: fallbackPricePerDay },
      { minDays: 7, pricePerDay: Number((fallbackPricePerDay * 0.6).toFixed(2)) },
      { minDays: 28, pricePerDay: Number((fallbackPricePerDay * 0.4).toFixed(2)) },
    ]
  }

  return []
}

/** Seller-side rental total for the selected period (tier pricing). */
export function calcRentalSellerTotalForDays(
  days: number,
  tiers: RentalPriceTierLike[],
  fallbackPricePerDay?: number | null,
): number {
  const resolvedTiers = resolveRentalPriceTiers(tiers, fallbackPricePerDay)
  const fromTiers = computeRentalSellerTotal(days, resolvedTiers)
  if (fromTiers > 0) return fromTiers

  if (fallbackPricePerDay && fallbackPricePerDay > 0 && days > 0) {
    return Math.round(fallbackPricePerDay * days * 100) / 100
  }

  return 0
}

/** @deprecated Use calcRentalBuyerPayableTotal — kept for compatibility. */
export function calcEstimatedTotal(
  days: number,
  tiers: RentalPriceTierLike[],
  fallbackPricePerDay?: number | null,
): number {
  return calcRentalSellerTotalForDays(days, tiers, fallbackPricePerDay)
}

/** Buyer payable total (platform fee + active seller discount), same as cart/checkout. */
export function calcRentalBuyerPayableTotal(
  days: number,
  product: RentalInquiryPricingProduct,
): {
  sellerTotal: number
  buyerListPrice: number
  buyerPayable: number
  hasDiscount: boolean
} {
  const processed = processExpiredDiscount(product)
  const sellerTotal = calcRentalSellerTotalForDays(
    days,
    product.rentalPriceTiers,
    product.pricePerDay,
  )
  const discount = productHasActiveDiscount(processed) ? processed.discount : null
  const buyerListPrice = getBuyerPrice(sellerTotal)
  const buyerPayable = getBuyerPriceAfterSellerDiscount(sellerTotal, discount)

  return {
    sellerTotal,
    buyerListPrice,
    buyerPayable,
    hasDiscount: typeof discount === 'number' && discount > 0,
  }
}

export function inquiryExpiresAt(from = new Date()): Date {
  return new Date(from.getTime() + INQUIRY_PENDING_HOURS * 60 * 60 * 1000)
}

export function inquiryApprovedExpiresAt(from = new Date()): Date {
  return new Date(from.getTime() + INQUIRY_APPROVED_MINUTES * 60 * 1000)
}

export function buildInquiryChatMessage(params: {
  productName: string
  startDate: string
  endDate: string
  size?: string | null
  location?: string | null
  estimatedTotal: number
  hasDiscount?: boolean
  buyerMessage?: string | null
}): string {
  const priceLine = params.hasDiscount
    ? `სავარაუდო ფასი: ₾${params.estimatedTotal.toFixed(2)} (ფასდაკლებით)`
    : `სავარაუდო ფასი: ₾${params.estimatedTotal.toFixed(2)}`

  const lines = [
    `გამარჯობა! მინდა ქირავდეს: ${params.productName}`,
    `თარიღები: ${params.startDate} — ${params.endDate}`,
    params.size ? `ზომა: ${params.size}` : null,
    params.location ? `ლოკაცია: ${params.location}` : null,
    priceLine,
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
