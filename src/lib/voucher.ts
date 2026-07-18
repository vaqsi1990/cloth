import { prisma } from '@/lib/prisma'

export type VoucherValidationResult =
  | {
      valid: true
      voucherId: number
      code: string
      discountAmount: number
      remainingAmount: number
      cartSubtotal: number
      deliveryFee: number
      finalSubtotal: number
    }
  | {
      valid: false
      message: string
    }

function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100
}

/** Apply voucher to products first, then remaining balance to delivery. */
export function allocateVoucherDiscount(
  cartSubtotal: number,
  deliveryFee: number,
  voucherDiscount: number,
) {
  const safeCart = Math.max(0, cartSubtotal)
  const safeDelivery = Math.max(0, deliveryFee)
  const maxApplicable = roundMoney(safeCart + safeDelivery)
  const discountAmount = roundMoney(
    Math.min(Math.max(0, voucherDiscount), maxApplicable),
  )
  const productDiscount = roundMoney(Math.min(discountAmount, safeCart))
  const deliveryDiscount = roundMoney(
    Math.min(Math.max(0, discountAmount - productDiscount), safeDelivery),
  )
  const productBuyerSubtotal = roundMoney(safeCart - productDiscount)
  const payableDelivery = roundMoney(safeDelivery - deliveryDiscount)
  const total = roundMoney(productBuyerSubtotal + payableDelivery)

  return {
    discountAmount,
    productDiscount,
    deliveryDiscount,
    productBuyerSubtotal,
    payableDelivery,
    total,
  }
}

export function normalizeVoucherCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '')
}

export async function findVoucherByCode(code: string) {
  const normalized = normalizeVoucherCode(code)
  if (!normalized) return null

  return prisma.voucher.findUnique({
    where: { code: normalized },
  })
}

/**
 * How much of the voucher face value this user has already spent or reserved.
 * Multi-use until the balance hits 0 or the voucher expires.
 */
export async function getUserVoucherSpentAmount(
  voucherId: number,
  userId: string,
  options?: { excludeOrderId?: number },
): Promise<number> {
  const excludeOrderId = options?.excludeOrderId

  const [redemptions, paidWithoutRedeem, pendingReserved] = await Promise.all([
    prisma.voucherRedemption.aggregate({
      where: {
        voucherId,
        userId,
        ...(excludeOrderId != null ? { orderId: { not: excludeOrderId } } : {}),
      },
      _sum: { discountAmount: true },
    }),
    prisma.order.aggregate({
      where: {
        voucherId,
        userId,
        status: { in: ['PAID', 'SHIPPED'] },
        voucherRedemptions: { none: {} },
        ...(excludeOrderId != null ? { id: { not: excludeOrderId } } : {}),
      },
      _sum: { voucherDiscount: true },
    }),
    // PENDING checkouts reserve balance until paid/canceled.
    prisma.order.aggregate({
      where: {
        voucherId,
        userId,
        status: 'PENDING',
        voucherRedemptions: { none: {} },
        ...(excludeOrderId != null ? { id: { not: excludeOrderId } } : {}),
      },
      _sum: { voucherDiscount: true },
    }),
  ])

  return roundMoney(
    (redemptions._sum.discountAmount ?? 0) +
      (paidWithoutRedeem._sum.voucherDiscount ?? 0) +
      (pendingReserved._sum.voucherDiscount ?? 0),
  )
}

export async function getUserVoucherRemainingAmount(
  voucherId: number,
  userId: string,
  faceAmount: number,
  options?: { excludeOrderId?: number },
): Promise<number> {
  const spent = await getUserVoucherSpentAmount(voucherId, userId, options)
  return roundMoney(Math.max(0, faceAmount - spent))
}

async function syncUserVoucherUsedFlag(
  userId: string,
  voucherId: number,
  remainingAmount: number,
) {
  const assignment = await prisma.userVoucher.findUnique({
    where: { userId_voucherId: { userId, voucherId } },
  })
  if (!assignment) return

  const shouldBeUsed = remainingAmount <= 0
  if (assignment.isUsed === shouldBeUsed) return

  await prisma.userVoucher.update({
    where: { id: assignment.id },
    data: { isUsed: shouldBeUsed },
  })
}

export async function validateVoucher(
  code: string,
  userId: string,
  cartSubtotal: number,
  deliveryFee = 0,
): Promise<VoucherValidationResult> {
  const voucher = await findVoucherByCode(code)

  if (!voucher) {
    return { valid: false, message: 'ვაუჩერის კოდი არასწორია' }
  }

  if (!voucher.isActive) {
    return { valid: false, message: 'ვაუჩერი არააქტიურია' }
  }

  const now = new Date()
  if (voucher.startsAt && now < voucher.startsAt) {
    return { valid: false, message: 'ვაუჩერი ჯერ არ არის აქტიური' }
  }

  if (voucher.usageLimit !== null && voucher.usedCount >= voucher.usageLimit) {
    return { valid: false, message: 'ვაუჩერის გამოყენების ლიმიტი ამოიწურა' }
  }

  if (voucher.minOrderAmount !== null && cartSubtotal < voucher.minOrderAmount) {
    return {
      valid: false,
      message: `მინიმუმ ₾${voucher.minOrderAmount.toFixed(2)} ჯამი საჭიროა`,
    }
  }

  const assignmentCount = await prisma.userVoucher.count({
    where: { voucherId: voucher.id },
  })

  let giftExpiresAt: Date | null = null

  if (assignmentCount > 0) {
    const assignment = await prisma.userVoucher.findUnique({
      where: {
        userId_voucherId: { userId, voucherId: voucher.id },
      },
    })

    if (!assignment) {
      return { valid: false, message: 'თქვენ არ გაქვთ ეს ვაუჩერი' }
    }

    giftExpiresAt = assignment.expiresAt
  }

  // Gift expiry wins when set; otherwise template voucher expiry.
  // Usable until balance is spent OR effective expiry passes.
  const effectiveExpiresAt = giftExpiresAt ?? voucher.expiresAt
  if (effectiveExpiresAt && now > effectiveExpiresAt) {
    return { valid: false, message: 'ვაუჩერის ვადა ამოიწურა' }
  }

  const remainingAmount = await getUserVoucherRemainingAmount(
    voucher.id,
    userId,
    voucher.discountAmount,
  )

  if (remainingAmount <= 0) {
    return { valid: false, message: 'ვაუჩერის ბალანსი ამოიწურა' }
  }

  const safeDeliveryFee = Math.max(0, deliveryFee)
  const allocated = allocateVoucherDiscount(
    cartSubtotal,
    safeDeliveryFee,
    remainingAmount,
  )

  if (allocated.discountAmount <= 0) {
    return { valid: false, message: 'კალათა ცარიელია' }
  }

  return {
    valid: true,
    voucherId: voucher.id,
    code: voucher.code,
    discountAmount: allocated.discountAmount,
    remainingAmount,
    cartSubtotal,
    deliveryFee: safeDeliveryFee,
    finalSubtotal: allocated.total,
  }
}

/** Discard abandoned PENDING checkouts so voucher balance can be reused cleanly. */
export async function cancelPendingVoucherOrders(
  userId: string,
  voucherId: number,
) {
  const pending = await prisma.order.findMany({
    where: {
      userId,
      voucherId,
      status: 'PENDING',
    },
    select: { id: true },
  })

  if (pending.length === 0) return

  const { discardUnpaidOrder } = await import('@/lib/rental-order-holds')
  for (const order of pending) {
    await discardUnpaidOrder(order.id).catch(() => undefined)
  }
}

export async function redeemVoucher(
  voucherId: number,
  userId: string,
  orderId: number,
  discountAmount: number,
) {
  const existing = await prisma.voucherRedemption.findFirst({
    where: { orderId },
  })
  if (existing) return

  const voucher = await prisma.voucher.findUnique({
    where: { id: voucherId },
    select: { discountAmount: true },
  })
  if (!voucher) return

  await prisma.$transaction([
    prisma.voucher.update({
      where: { id: voucherId },
      data: { usedCount: { increment: 1 } },
    }),
    prisma.voucherRedemption.create({
      data: {
        voucherId,
        userId,
        orderId,
        discountAmount,
      },
    }),
  ])

  const remaining = await getUserVoucherRemainingAmount(
    voucherId,
    userId,
    voucher.discountAmount,
    { excludeOrderId: undefined },
  )
  await syncUserVoucherUsedFlag(userId, voucherId, remaining)
}

/** Undo redeem when payment is released/refunded/canceled after capture. */
export async function restoreVoucherForOrder(orderId: number) {
  const redemption = await prisma.voucherRedemption.findFirst({
    where: { orderId },
  })
  if (!redemption) return

  const voucher = await prisma.voucher.findUnique({
    where: { id: redemption.voucherId },
    select: { usedCount: true, discountAmount: true },
  })

  const nextUsedCount = Math.max(0, (voucher?.usedCount ?? 1) - 1)

  await prisma.$transaction([
    prisma.voucherRedemption.delete({ where: { id: redemption.id } }),
    prisma.voucher.update({
      where: { id: redemption.voucherId },
      data: { usedCount: nextUsedCount },
    }),
  ])

  if (voucher) {
    const remaining = await getUserVoucherRemainingAmount(
      redemption.voucherId,
      redemption.userId,
      voucher.discountAmount,
    )
    await syncUserVoucherUsedFlag(
      redemption.userId,
      redemption.voucherId,
      remaining,
    )
  }
}
