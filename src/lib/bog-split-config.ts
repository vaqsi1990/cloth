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

function maskIban(iban: string) {
  return `${iban.substring(0, 8)}...${iban.slice(-4)}`
}

function logSplitStep(message: string, details?: Record<string, unknown>) {
  if (details) {
    console.log(`[SPLIT] ${message}`, JSON.stringify(details))
    return
  }
  console.log(`[SPLIT] ${message}`)
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

  const missingIbanProductIds: number[] = []
  const invalidIbanProductIds: number[] = []

  for (const product of products) {
    if (!product.user?.iban) {
      missingIbanProductIds.push(product.id)
      continue
    }
    const norm = normalizeIban(product.user.iban)
    if (norm) {
      result.set(String(product.userId), norm)
      continue
    }
    invalidIbanProductIds.push(product.id)
  }

  const notFoundProductIds = ids.filter(
    (id) => !products.some((product) => product.id === id),
  )

  logSplitStep('Seller IBAN lookup by product author', {
    requestedProductIds: ids,
    foundProducts: products.length,
    withIban: result.size,
    missingIbanProductIds,
    invalidIbanProductIds,
    notFoundProductIds,
  })

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

  const missingIbanUserIds: string[] = []
  const invalidIbanUserIds: string[] = []

  for (const user of users) {
    if (!user.iban) {
      missingIbanUserIds.push(user.id)
      continue
    }
    const norm = normalizeIban(user.iban)
    if (norm) {
      result.set(user.id, norm)
      continue
    }
    invalidIbanUserIds.push(user.id)
  }

  const notFoundUserIds = uniqueIds.filter(
    (id) => !users.some((user) => user.id === id),
  )

  logSplitStep('Seller IBAN lookup by userId', {
    requestedSellerIds: uniqueIds,
    foundUsers: users.length,
    withIban: result.size,
    missingIbanUserIds,
    invalidIbanUserIds,
    notFoundUserIds,
  })

  return result
}

async function collectSellerIBANs(
  productIds: (string | number)[],
  sellerUserIds: string[] = [],
) {
  const uniqueSellerIds = [...new Set(sellerUserIds.filter(Boolean))]
  if (uniqueSellerIds.length > 0) {
    return collectSellerUserIdsIBANs(uniqueSellerIds)
  }
  return collectProductAuthorsIBANs(productIds)
}

/**
 * True when the seller still has a positive payout after voucher/discounts.
 * When false, BOG split must not include a ₾0 seller line ("Split amount should be more than 0").
 */
export function hasSellerSplitPayout(ownerItemsSubtotal: number): boolean {
  return roundMoney(ownerItemsSubtotal) > 0
}

export async function buildSplitPaymentConfig(
  paymentMethod: string | undefined,
  productIds: (string | number)[],
  totalAmount: number,
  ownerItemsSubtotal: number,
  deliveryFee: number,
  sellerUserIds: string[] = [],
): Promise<BogSplitConfig | null> {
  logSplitStep('Building split config', {
    paymentMethod,
    totalAmount,
    ownerItemsSubtotal,
    deliveryFee,
    productIds,
    sellerUserIds,
    merchantIbanConfigured: !!process.env.BOG_MERCHANT_IBAN,
  })

  if (!paymentMethod || !['card', 'google_pay', 'apple_pay'].includes(paymentMethod)) {
    logSplitStep('FAILED: unsupported payment method for split', { paymentMethod })
    return null
  }

  const splitAmounts = computePaymentSplitAmounts(
    totalAmount,
    ownerItemsSubtotal,
    deliveryFee,
  )
  if (!splitAmounts) {
    logSplitStep('FAILED: could not compute split amounts', {
      totalAmount,
      ownerItemsSubtotal,
      deliveryFee,
    })
    return null
  }

  // Voucher can zero the seller share (e.g. product fully covered, only delivery left).
  // BOG rejects split lines with amount 0 — skip split so the full charge stays with merchant.
  if (splitAmounts.sellerAmount <= 0) {
    logSplitStep('Skipping split: seller payout is 0 after voucher', {
      totalAmount,
      ownerItemsSubtotal,
      deliveryFee,
      splitAmounts,
    })
    return null
  }

  const merchantIban = getMerchantIBAN()
  if (!merchantIban) {
    logSplitStep('FAILED: BOG_MERCHANT_IBAN missing or invalid')
    return null
  }

  const authors = await collectSellerIBANs(productIds, sellerUserIds)
  if (authors.size === 0) {
    logSplitStep('FAILED: no seller IBAN found in database', {
      sellerUserIds,
      productIds,
      hint:
        'Users may exist but user.iban is null/empty, or sellerUserId is missing on order items',
    })
    return null
  }

  const sellerIban = [...authors.values()][0]
  const split_payments: BogSplitPayment[] = []

  if (splitAmounts.platformAmount > 0) {
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

  // BOG rejects any split entry with amount <= 0
  if (split_payments.some((payment) => (payment.amount ?? 0) <= 0)) {
    logSplitStep('FAILED: split contains non-positive amount', { splitAmounts })
    return null
  }

  const totalSplitAmount = split_payments.reduce((sum, p) => sum + (p.amount ?? 0), 0)
  if (Math.abs(totalSplitAmount - totalAmount) > 0.01) {
    logSplitStep('FAILED: split amounts do not sum to order total', {
      totalSplitAmount,
      totalAmount,
      splitAmounts,
    })
    return null
  }

  logSplitStep('Split config ready', {
    payments: split_payments.map((payment) => ({
      amount: payment.amount,
      ibanMasked: maskIban(payment.iban),
      description: payment.description,
    })),
  })

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

export function logOrderSplitDiagnostics(
  order: OrderForSplit,
  splitConfig: BogSplitConfig | null,
  options?: { splitEnabled?: boolean; context?: string },
) {
  const saleItems = order.items.filter((item) => !item.isRental)
  const sellerUserIds = saleItems
    .map((item) => item.sellerUserId)
    .filter((id): id is string => Boolean(id))
  const readinessError = getOrderSplitReadinessMessage(order, splitConfig)

  logSplitStep('Order split diagnostics', {
    context: options?.context ?? 'unknown',
    splitEnabled: options?.splitEnabled ?? null,
    orderTotal: order.total,
    paymentMethod: order.paymentMethod ?? 'card',
    deliveryFee: order.deliveryPrice ?? 0,
    saleItemCount: saleItems.length,
    sellerUserIds,
    sellerUserIdsMissingOnItems: saleItems.length - sellerUserIds.length,
    splitConfigBuilt: !!splitConfig,
    readinessError,
    splitPreview: describeSplitPayments(splitConfig),
    env: {
      BOG_MERCHANT_IBAN: !!process.env.BOG_MERCHANT_IBAN,
      PAYMENT_HOLD_SPLIT_ON_APPROVE:
        process.env.PAYMENT_HOLD_SPLIT_ON_APPROVE !== 'false',
      PAYMENT_HOLD_SPLIT_FALLBACK_WITHOUT_SPLIT:
        process.env.PAYMENT_HOLD_SPLIT_FALLBACK_WITHOUT_SPLIT === 'true',
    },
  })
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

export function describeSplitPayments(
  splitConfig: BogSplitConfig | null,
): Array<{ ibanMasked: string; amount: number | undefined; description?: string }> {
  if (!splitConfig) return []

  return splitConfig.split_payments.map((payment) => ({
    ibanMasked: `${payment.iban.substring(0, 8)}...${payment.iban.slice(-4)}`,
    amount: payment.amount,
    description: payment.description,
  }))
}

function getOrderOwnerItemsSubtotal(order: OrderForSplit): number {
  const saleItems = order.items.filter((item) => !item.isRental)
  const itemsSubtotal = saleItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  )
  const productBuyerSubtotal =
    Math.round((itemsSubtotal - (order.voucherDiscount ?? 0)) * 100) / 100

  if (order.voucherDiscount && order.voucherDiscount > 0) {
    return getOwnerItemsSubtotalFromBuyer(Math.max(0, productBuyerSubtotal))
  }

  return roundMoney(
    saleItems.reduce(
      (sum, item) => sum + getSellerPriceFromBuyer(item.price) * item.quantity,
      0,
    ),
  )
}

export function getOrderSplitReadinessMessage(
  order: OrderForSplit,
  splitConfig: BogSplitConfig | null,
): string | null {
  const saleItems = order.items.filter((item) => !item.isRental)
  if (saleItems.length === 0) {
    return null
  }

  // Voucher covered the seller share — split is intentionally skipped.
  if (!hasSellerSplitPayout(getOrderOwnerItemsSubtotal(order))) {
    return null
  }

  const missingSellerIds = saleItems
    .map((item) => item.sellerUserId)
    .filter((id): id is string => Boolean(id))

  if (missingSellerIds.length === 0) {
    return 'შეკვეთაში არ არის მითითებული გამყიდველი'
  }

  if (!splitConfig) {
    return 'გამყიდველს არ აქვს ვალიდური IBAN ან BOG_MERCHANT_IBAN არ არის დაყენებული'
  }

  if (splitConfig.split_payments.some((payment) => (payment.amount ?? 0) <= 0)) {
    return 'split შეიცავს ₾0 თანხას'
  }

  const totalSplitAmount = splitConfig.split_payments.reduce(
    (sum, payment) => sum + (payment.amount ?? 0),
    0,
  )
  if (Math.abs(totalSplitAmount - order.total) > 0.01) {
    return `split თანხების ჯამი (${totalSplitAmount}) არ ემთხვევა შეკვეთის ჯამს (${order.total})`
  }

  return null
}
