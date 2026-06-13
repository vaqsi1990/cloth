import axios from 'axios'
import type { VipPaymentStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { bogTokenManager } from '@/lib/bog-token'
import { getVipExpiryDate, isProductVipActive } from '@/lib/product-vip'
import { revalidateProductListCache } from '@/lib/product-list-query'

type BogReceipt = {
  order_status?: { key?: string; value?: string }
  status?: string
  zoned_expire_date?: string
  expire_date?: string
}

export type VipActivationResult = {
  found: boolean
  activated: boolean
}

function extractBogOrderStatus(details: BogReceipt): string {
  return (
    details.order_status?.key ||
    details.order_status?.value ||
    details.status ||
    'UNKNOWN'
  )
}

function mapBogStatusToVipPaymentStatus(status: string): VipPaymentStatus {
  const lower = status.toLowerCase()

  if (lower === 'completed' || lower === 'partial_completed') return 'PAID'
  if (lower === 'rejected' || lower === 'blocked') return 'FAILED'
  if (lower === 'refunded' || lower === 'refunded_partially') return 'REFUNDED'

  return 'PENDING'
}

function isBogPaymentCompleted(status: string): boolean {
  const lower = status.toLowerCase()
  return lower === 'completed' || lower === 'partial_completed'
}

function isBogPaymentExpired(details: BogReceipt, status: string): boolean {
  if (isBogPaymentCompleted(status)) return false

  const lower = status.toLowerCase()
  if (lower !== 'created' && lower !== 'pending') return false

  const expireRaw = details.zoned_expire_date || details.expire_date
  if (!expireRaw) return false

  return new Date(expireRaw).getTime() < Date.now()
}

async function fetchBogPaymentReceipt(paymentId: string): Promise<BogReceipt> {
  return bogTokenManager.makeAuthenticatedRequest(async (token: string) => {
    const response = await axios.get(
      `https://api.bog.ge/payments/v1/receipt/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      },
    )
    return response.data as BogReceipt
  })
}

async function applyPaidVipStatus(vipPaymentId: number, productId: number): Promise<void> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { vipExpiresAt: true },
  })

  const existingExpiry = product?.vipExpiresAt ? new Date(product.vipExpiresAt) : null
  const baseDate =
    existingExpiry && existingExpiry.getTime() > Date.now() ? existingExpiry : new Date()
  const expiresAt = getVipExpiryDate(baseDate)

  await prisma.$transaction([
    prisma.productVipPayment.update({
      where: { id: vipPaymentId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        vipExpiresAt: expiresAt,
      },
    }),
    prisma.product.update({
      where: { id: productId },
      data: {
        isVip: true,
        vipExpiresAt: expiresAt,
      },
    }),
  ])
  revalidateProductListCache()
}

export async function activateVipPayment(
  paymentId: string,
  status: string,
): Promise<VipActivationResult> {
  const final = mapBogStatusToVipPaymentStatus(status)

  const vipPayment = await prisma.productVipPayment.findFirst({
    where: { paymentId },
  })

  if (!vipPayment) {
    return { found: false, activated: false }
  }

  if (final === 'PAID') {
    const product = await prisma.product.findUnique({
      where: { id: vipPayment.productId },
      select: { isVip: true, vipExpiresAt: true },
    })

    if (isProductVipActive(product ?? {}) && vipPayment.status === 'PAID') {
      return { found: true, activated: true }
    }

    await applyPaidVipStatus(vipPayment.id, vipPayment.productId)
    return { found: true, activated: true }
  }

  if (vipPayment.status !== final) {
    await prisma.productVipPayment.update({
      where: { id: vipPayment.id },
      data: { status: final },
    })
  }

  return { found: true, activated: false }
}

export async function confirmPendingVipPaymentForProduct(
  productId: number,
  userId: string,
): Promise<{ activated: boolean; status: string }> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, userId: true, isVip: true, vipExpiresAt: true },
  })

  if (!product || product.userId !== userId) {
    return { activated: false, status: 'FORBIDDEN' }
  }

  if (isProductVipActive(product)) {
    return { activated: true, status: 'ALREADY_ACTIVE' }
  }

  const vipPayment = await prisma.productVipPayment.findFirst({
    where: {
      productId,
      status: { in: ['PENDING', 'PAID'] },
      paymentId: { not: null },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!vipPayment?.paymentId) {
    return { activated: false, status: 'PAYMENT_NOT_FOUND' }
  }

  if (vipPayment.status === 'PAID') {
    const result = await activateVipPayment(vipPayment.paymentId, 'completed')
    return { activated: result.activated, status: 'PAID' }
  }

  try {
    const paymentDetails = await fetchBogPaymentReceipt(vipPayment.paymentId)
    const bogStatus = extractBogOrderStatus(paymentDetails)

    if (isBogPaymentExpired(paymentDetails, bogStatus)) {
      await prisma.productVipPayment.update({
        where: { id: vipPayment.id },
        data: { status: 'FAILED' },
      })
      return { activated: false, status: 'EXPIRED' }
    }

    const result = await activateVipPayment(vipPayment.paymentId, bogStatus)
    return { activated: result.activated, status: bogStatus }
  } catch {
    return { activated: false, status: 'BOG_CHECK_FAILED' }
  }
}

export async function syncPendingVipPayments(limit = 5): Promise<number> {
  const pending = await prisma.productVipPayment.findMany({
    where: { status: 'PENDING', paymentId: { not: null } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  let activated = 0

  for (const payment of pending) {
    if (!payment.paymentId) continue

    try {
      const paymentDetails = await fetchBogPaymentReceipt(payment.paymentId)
      const bogStatus = extractBogOrderStatus(paymentDetails)

      if (isBogPaymentExpired(paymentDetails, bogStatus)) {
        await prisma.productVipPayment.update({
          where: { id: payment.id },
          data: { status: 'FAILED' },
        })
        continue
      }

      const result = await activateVipPayment(payment.paymentId, bogStatus)
      if (result.activated) {
        activated += 1
      }
    } catch (error) {
      console.warn(`VIP sync failed for payment ${payment.paymentId}:`, error)
    }
  }

  return activated
}
