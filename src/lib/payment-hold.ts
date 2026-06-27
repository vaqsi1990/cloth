import { PaymentCaptureMode, PaymentHoldStatus, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { recordSellerTransactions } from '@/utils/sellerTransactions'
import { redeemVoucher } from '@/lib/voucher'
import { sendOrderConfirmationEmail } from '@/lib/order-confirmation-email'
import {
  finalizeRentalOrderHolds,
  releaseRentalOrderHolds,
} from '@/lib/rental-order-holds'
import { bogCancelPreAuthorization } from '@/lib/bog-preauth'
import {
  PAYMENT_HOLD_MAX_DAYS,
  isPaymentHoldExpired,
} from '@/lib/payment-hold-config'

export { PAYMENT_HOLD_MAX_DAYS } from '@/lib/payment-hold-config'
export {
  getPaymentHoldExpiresAt,
  getPaymentHoldDaysRemaining,
  isPaymentHoldExpired,
  resolvePaymentHoldBlockedAt,
} from '@/lib/payment-hold-config'

/** Business rule: payment hold is valid for 10 days (BOG bank limit is up to 30 days). */

type OrderForHold = Prisma.OrderGetPayload<{
  select: {
    id: true
    status: true
    userId: true
    paymentCaptureMode: true
    paymentHoldStatus: true
    sourceCartItemId: true
    voucherId: true
    voucherDiscount: true
  }
}>

const CARD_CAPTURE_METHODS = new Set(['card', 'google_pay', 'apple_pay'])

export function usesManualPaymentCapture(paymentMethod?: string | null): boolean {
  if (!paymentMethod) return true
  return CARD_CAPTURE_METHODS.has(paymentMethod)
}

async function clearSourceCartItem(order: OrderForHold): Promise<void> {
  if (!order.sourceCartItemId) return

  await prisma.cartItem.deleteMany({
    where: {
      id: order.sourceCartItemId,
      cart: order.userId ? { userId: order.userId } : undefined,
    },
  }).catch(() => undefined)
}

async function redeemOrderVoucherIfNeeded(order: OrderForHold): Promise<void> {
  if (!order.voucherId || !order.userId || !order.voucherDiscount) return

  const existing = await prisma.voucherRedemption.findFirst({
    where: { orderId: order.id },
  })
  if (existing) return

  await redeemVoucher(
    order.voucherId,
    order.userId,
    order.id,
    order.voucherDiscount,
  )
}

export async function markOrderPaymentBlocked(orderId: number): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      userId: true,
      paymentCaptureMode: true,
      paymentHoldStatus: true,
      sourceCartItemId: true,
      voucherId: true,
      voucherDiscount: true,
    },
  })

  if (!order) return

  const wasAlreadyPaid = order.status === 'PAID' || order.status === 'SHIPPED'

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'PAID',
      paymentHoldStatus: PaymentHoldStatus.BLOCKED,
      paymentHoldBlockedAt: new Date(),
    },
  })

  if (!wasAlreadyPaid) {
    await finalizeRentalOrderHolds(orderId)
    await clearSourceCartItem(order)
    void sendOrderConfirmationEmail(orderId).catch((error) => {
      console.error(`[payment-hold] Order confirmation email failed for #${orderId}:`, error)
    })
  }
}

export async function markOrderPaymentCaptured(orderId: number): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      userId: true,
      paymentCaptureMode: true,
      paymentHoldStatus: true,
      sourceCartItemId: true,
      voucherId: true,
      voucherDiscount: true,
    },
  })

  if (!order) return

  const wasCaptured = order.paymentHoldStatus === PaymentHoldStatus.CAPTURED
  const wasAlreadyPaid = order.status === 'PAID' || order.status === 'SHIPPED'

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'PAID',
      paymentHoldStatus: PaymentHoldStatus.CAPTURED,
    },
  })

  if (!wasCaptured) {
    await recordSellerTransactions(orderId)
    await redeemOrderVoucherIfNeeded(order)
  }

  if (!wasAlreadyPaid && order.paymentCaptureMode === PaymentCaptureMode.AUTOMATIC) {
    await finalizeRentalOrderHolds(orderId)
    await clearSourceCartItem(order)
    void sendOrderConfirmationEmail(orderId).catch((error) => {
      console.error(`[payment-hold] Order confirmation email failed for #${orderId}:`, error)
    })
  }
}

export async function markOrderPaymentReleased(orderId: number): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true },
  })

  if (!order) return

  const wasFulfilled = order.status === 'PAID' || order.status === 'SHIPPED'

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'REFUNDED',
      paymentHoldStatus: PaymentHoldStatus.RELEASED,
    },
  })

  await releaseRentalOrderHolds(orderId)

  if (wasFulfilled) {
    const { restoreOrderSaleItems } = await import('@/lib/restore-order-sale-items')
    await restoreOrderSaleItems(orderId)
  }

  await prisma.transaction.deleteMany({
    where: { orderId, type: { in: ['SALE', 'RENT'] } },
  })
}

export async function getOrderForPaymentHoldAction(orderId: number, userId: string) {
  return prisma.order.findFirst({
    where: { id: orderId, userId },
    select: {
      id: true,
      paymentId: true,
      total: true,
      status: true,
      paymentCaptureMode: true,
      paymentHoldStatus: true,
      paymentHoldBlockedAt: true,
      updatedAt: true,
    },
  })
}

async function releaseExpiredPaymentHold(order: {
  id: number
  paymentId: string | null
}): Promise<boolean> {
  if (!order.paymentId) {
    await markOrderPaymentReleased(order.id)
    return true
  }

  try {
    await bogCancelPreAuthorization(order.paymentId, {
      description: `Payment hold expired after ${PAYMENT_HOLD_MAX_DAYS} days`,
    })
  } catch (error) {
    console.warn(`[payment-hold] BOG cancel failed for order #${order.id}:`, error)
  }

  await markOrderPaymentReleased(order.id)
  return true
}

export async function expirePaymentHoldIfNeeded(orderId: number): Promise<boolean> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      paymentId: true,
      paymentHoldStatus: true,
      paymentHoldBlockedAt: true,
      updatedAt: true,
    },
  })

  if (!order || order.paymentHoldStatus !== PaymentHoldStatus.BLOCKED) {
    return false
  }

  if (!isPaymentHoldExpired(order)) {
    return false
  }

  return releaseExpiredPaymentHold(order)
}

export async function syncExpiredPaymentHolds(limit = 25): Promise<number> {
  const blockedOrders = await prisma.order.findMany({
    where: {
      paymentHoldStatus: PaymentHoldStatus.BLOCKED,
      paymentCaptureMode: PaymentCaptureMode.MANUAL,
    },
    select: {
      id: true,
      paymentId: true,
      paymentHoldBlockedAt: true,
      updatedAt: true,
    },
    orderBy: { paymentHoldBlockedAt: 'asc' },
    take: limit,
  })

  let released = 0

  for (const order of blockedOrders) {
    if (!isPaymentHoldExpired(order)) continue
    const ok = await releaseExpiredPaymentHold(order)
    if (ok) released += 1
  }

  return released
}
