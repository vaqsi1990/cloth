import { prisma } from '@/lib/prisma'
import {
  computePaymentSplitAmounts,
  getOwnerItemsSubtotalFromBuyer,
  getSellerPriceFromBuyer,
  roundMoney,
} from '@/lib/platform-pricing'

export interface BogSplitPayment {
  amount?: number
  percent?: number
  iban: string
  description?: string
}

export interface BogSplitConfig {
  split_payments: BogSplitPayment[]
}

function normalizeIban(iban?: string | null) {
  return iban ? iban.replace(/\s+/g, '').toUpperCase() : null
}

function validateSplitDescription(desc: string): string | undefined {
  if (!desc) return undefined
  const allowed = /^[0-9 /\-?:().,'+a-zA-Z]+$/
  if (!allowed.test(desc)) return undefined
  return desc.length > 25 ? desc.substring(0, 25) : desc
}

function getMerchantIBAN(): string | null {
  const merchantIban = process.env.BOG_MERCHANT_IBAN
  if (!merchantIban) {
    console.error('❌ [SPLIT] BOG_MERCHANT_IBAN environment variable not set')
    return null
  }

  const normalized = normalizeIban(merchantIban)
  if (!normalized) {
    console.error(`❌ [SPLIT] Invalid merchant IBAN format: ${merchantIban}`)
  }
  return normalized
}

async function collectProductAuthorsIBANs(productIds: (string | number)[]) {
  const result = new Map<string, string>()

  const ids = productIds
    .map((id) => (typeof id === 'string' ? parseInt(id, 10) : id))
    .filter((n): n is number => typeof n === 'number' && !Number.isNaN(n))

  if (ids.length === 0) return result

  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, userId: true, user: { select: { iban: true } } },
  })

  for (const product of products) {
    if (!product.user?.iban) continue
    const norm = normalizeIban(product.user.iban)
    if (norm) {
      result.set(String(product.userId), norm)
    }
  }

  return result
}

async function collectSellerUserIdsIBANs(sellerUserIds: string[]) {
  const result = new Map<string, string>()
  const uniqueIds = [...new Set(sellerUserIds.filter(Boolean))]

  if (uniqueIds.length === 0) return result

  const users = await prisma.user.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, iban: true },
  })

  for (const user of users) {
    if (!user.iban) continue
    const norm = normalizeIban(user.iban)
    if (norm) {
      result.set(user.id, norm)
    }
  }

  return result
}

async function collectSellerIBANs(
  productIds: (string | number)[],
  sellerUserIds: string[] = [],
) {
  const fromProducts = await collectProductAuthorsIBANs(productIds)
  const fromSellers = await collectSellerUserIdsIBANs(sellerUserIds)
  return new Map<string, string>([...fromProducts, ...fromSellers])
}

export async function buildSplitPaymentConfig(
  paymentMethod: string | undefined,
  productIds: (string | number)[],
  totalAmount: number,
  ownerItemsSubtotal: number,
  deliveryFee: number,
  sellerUserIds: string[] = [],
): Promise<BogSplitConfig | null> {
  if (!paymentMethod || !['card', 'google_pay', 'apple_pay'].includes(paymentMethod)) {
    console.warn(`⚠️ [SPLIT] Payment method not supported for split: ${paymentMethod}`)
    return null
  }

  const merchantIban = getMerchantIBAN()
  const authors = await collectSellerIBANs(productIds, sellerUserIds)
  if (authors.size === 0) {
    console.error('❌ [SPLIT] No seller IBANs found - split config cannot be created')
    return null
  }

  const sellerIban = [...authors.values()][0]
  const splitAmounts = computePaymentSplitAmounts(
    totalAmount,
    ownerItemsSubtotal,
    deliveryFee,
  )
  if (!splitAmounts) {
    console.error('❌ [SPLIT] Could not compute split amounts')
    return null
  }

  const split_payments: BogSplitPayment[] = []

  if (merchantIban) {
    split_payments.push({
      amount: splitAmounts.platformAmount,
      iban: merchantIban,
      description: validateSplitDescription('Delivery and commission'),
    })
  }

  split_payments.push({
    amount: splitAmounts.sellerAmount,
    iban: sellerIban,
    description: validateSplitDescription('Owner item payout'),
  })

  const totalSplitAmount = split_payments.reduce((sum, p) => sum + (p.amount ?? 0), 0)
  if (Math.abs(totalSplitAmount - totalAmount) > 0.01) {
    console.error(
      `❌ [SPLIT] Split amounts don't sum to order total: ${totalSplitAmount} vs ${totalAmount}`,
    )
    return null
  }

  return { split_payments }
}

type OrderForSplit = {
  total: number
  paymentMethod?: string | null
  deliveryPrice?: number | null
  voucherDiscount?: number | null
  items: Array<{
    productId: number | null
    sellerUserId?: string | null
    price: number
    quantity: number
    isRental?: boolean | null
  }>
}

export async function buildSplitPaymentConfigForOrder(
  order: OrderForSplit,
): Promise<BogSplitConfig | null> {
  const saleItems = order.items.filter((item) => !item.isRental)
  const productIds = saleItems
    .map((item) => item.productId)
    .filter((id): id is number => id != null)
  const sellerUserIds = saleItems
    .map((item) => item.sellerUserId)
    .filter((id): id is string => Boolean(id))

  const itemsSubtotal = saleItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  )
  const productBuyerSubtotal =
    Math.round((itemsSubtotal - (order.voucherDiscount ?? 0)) * 100) / 100
  const deliveryFee = order.deliveryPrice ?? 0
  const ownerItemsSubtotal =
    order.voucherDiscount && order.voucherDiscount > 0
      ? getOwnerItemsSubtotalFromBuyer(productBuyerSubtotal)
      : roundMoney(
          saleItems.reduce(
            (sum, item) => sum + getSellerPriceFromBuyer(item.price) * item.quantity,
            0,
          ),
        )

  return buildSplitPaymentConfig(
    order.paymentMethod ?? 'card',
    productIds,
    order.total,
    ownerItemsSubtotal,
    deliveryFee,
    sellerUserIds,
  )
}
