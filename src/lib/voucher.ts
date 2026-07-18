import { prisma } from '@/lib/prisma'

export type VoucherValidationResult =
  | {
      valid: true
      voucherId: number
      code: string
      discountAmount: number
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
 * Count how many times a user has actually consumed a voucher.
 * PENDING checkouts must not count — abandoned BOG redirects used to lock
 * vouchers forever while isUsed stayed false.
 */
async function countUserVoucherUsage(voucherId: number, userId: string) {
  const [redemptionCount, activePaidWithoutRedeem] = await Promise.all([
    prisma.voucherRedemption.count({
      where: { voucherId, userId },
    }),
    // Payment-hold can mark PAID before redeem; still treat as consumed.
    prisma.order.count({
      where: {
        voucherId,
        userId,
        status: { in: ['PAID', 'SHIPPED'] },
        voucherRedemptions: { none: {} },
      },
    }),
  ])

  return redemptionCount + activePaidWithoutRedeem
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

  if (voucher.expiresAt && now > voucher.expiresAt) {
    return { valid: false, message: 'ვაუჩერის ვადა ამოიწურა' }
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

  if (assignmentCount > 0) {
    const assignment = await prisma.userVoucher.findUnique({
      where: {
        userId_voucherId: { userId, voucherId: voucher.id },
      },
    })

    if (!assignment) {
      return { valid: false, message: 'თქვენ არ გაქვთ ეს ვაუჩერი' }
    }

    if (assignment.isUsed) {
      return { valid: false, message: 'თქვენ უკვე გამოიყენეთ ეს ვაუჩერი' }
    }
  }

  const userUsageCount = await countUserVoucherUsage(voucher.id, userId)

  if (userUsageCount >= voucher.perUserLimit) {
    return { valid: false, message: 'თქვენ უკვე გამოიყენეთ ეს ვაუჩერი' }
  }

  const safeDeliveryFee = Math.max(0, deliveryFee)
  const allocated = allocateVoucherDiscount(
    cartSubtotal,
    safeDeliveryFee,
    voucher.discountAmount,
  )

  if (allocated.discountAmount <= 0) {
    return { valid: false, message: 'კალათა ცარიელია' }
  }

  return {
    valid: true,
    voucherId: voucher.id,
    code: voucher.code,
    discountAmount: allocated.discountAmount,
    cartSubtotal,
    deliveryFee: safeDeliveryFee,
    finalSubtotal: allocated.total,
  }
}

/** Cancel abandoned PENDING checkouts so a voucher can be retried cleanly. */
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

  await prisma.order.updateMany({
    where: {
      id: { in: pending.map((o) => o.id) },
    },
    data: { status: 'CANCELED' },
  })

  const { releaseRentalOrderHolds } = await import('@/lib/rental-order-holds')
  for (const order of pending) {
    await releaseRentalOrderHolds(order.id).catch(() => undefined)
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

  const assignment = await prisma.userVoucher.findUnique({
    where: {
      userId_voucherId: { userId, voucherId },
    },
  })

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
    ...(assignment
      ? [
          prisma.userVoucher.update({
            where: { id: assignment.id },
            data: { isUsed: true },
          }),
        ]
      : []),
  ])
}

/** Undo redeem when payment is released/refunded/canceled after capture. */
export async function restoreVoucherForOrder(orderId: number) {
  const redemption = await prisma.voucherRedemption.findFirst({
    where: { orderId },
  })
  if (!redemption) return

  const [assignment, otherRedemptions, voucher] = await Promise.all([
    prisma.userVoucher.findUnique({
      where: {
        userId_voucherId: {
          userId: redemption.userId,
          voucherId: redemption.voucherId,
        },
      },
    }),
    prisma.voucherRedemption.count({
      where: {
        voucherId: redemption.voucherId,
        userId: redemption.userId,
        id: { not: redemption.id },
      },
    }),
    prisma.voucher.findUnique({
      where: { id: redemption.voucherId },
      select: { usedCount: true },
    }),
  ])

  const nextUsedCount = Math.max(0, (voucher?.usedCount ?? 1) - 1)

  await prisma.$transaction([
    prisma.voucherRedemption.delete({ where: { id: redemption.id } }),
    prisma.voucher.update({
      where: { id: redemption.voucherId },
      data: { usedCount: nextUsedCount },
    }),
    ...(assignment?.isUsed && otherRedemptions === 0
      ? [
          prisma.userVoucher.update({
            where: { id: assignment.id },
            data: { isUsed: false },
          }),
        ]
      : []),
  ])
}
