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

/** Split on approve is enabled by default; set PAYMENT_HOLD_SPLIT_ON_APPROVE=false to disable. */
export function isPaymentHoldSplitOnApproveEnabled(): boolean {
  return process.env.PAYMENT_HOLD_SPLIT_ON_APPROVE !== 'false'
}

/**
 * When BOG rejects split on approve, retry capture without split only if this is true.
 * Default: false — admin must fix IBAN/split config instead of silent merchant-only capture.
 */
export function allowPaymentHoldApproveWithoutSplit(): boolean {
  return process.env.PAYMENT_HOLD_SPLIT_FALLBACK_WITHOUT_SPLIT === 'true'
}
