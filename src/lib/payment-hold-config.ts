export const PAYMENT_HOLD_MAX_DAYS = 10

type OrderForExpiry = {
  paymentHoldBlockedAt?: Date | string | null
  updatedAt?: Date | string | null
}

export function resolvePaymentHoldBlockedAt(order: OrderForExpiry): Date {
  const raw = order.paymentHoldBlockedAt ?? order.updatedAt
  return raw ? new Date(raw) : new Date()
}

export function getPaymentHoldExpiresAt(order: OrderForExpiry): Date {
  const blockedAt = resolvePaymentHoldBlockedAt(order)
  const expiresAt = new Date(blockedAt)
  expiresAt.setDate(expiresAt.getDate() + PAYMENT_HOLD_MAX_DAYS)
  return expiresAt
}

export function isPaymentHoldExpired(
  order: OrderForExpiry,
  now: Date = new Date(),
): boolean {
  return now.getTime() >= getPaymentHoldExpiresAt(order).getTime()
}

export function getPaymentHoldDaysRemaining(
  order: OrderForExpiry,
  now: Date = new Date(),
): number {
  const msLeft = getPaymentHoldExpiresAt(order).getTime() - now.getTime()
  if (msLeft <= 0) return 0
  return Math.ceil(msLeft / (24 * 60 * 60 * 1000))
}
