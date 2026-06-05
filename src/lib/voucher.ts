import { prisma } from '@/lib/prisma'

export type VoucherValidationResult =
  | {
      valid: true
      voucherId: number
      code: string
      discountAmount: number
      cartSubtotal: number
      finalSubtotal: number
    }
  | {
      valid: false
      message: string
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

export async function validateVoucher(
  code: string,
  userId: string,
  cartSubtotal: number,
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

  const userUsageCount = await prisma.order.count({
    where: {
      voucherId: voucher.id,
      userId,
      status: { in: ['PENDING', 'PAID'] },
    },
  })

  if (userUsageCount >= voucher.perUserLimit) {
    return { valid: false, message: 'თქვენ უკვე გამოიყენეთ ეს ვაუჩერი' }
  }

  const discountAmount = Math.min(voucher.discountAmount, cartSubtotal)
  if (discountAmount <= 0) {
    return { valid: false, message: 'კალათა ცარიელია' }
  }

  return {
    valid: true,
    voucherId: voucher.id,
    code: voucher.code,
    discountAmount: Math.round(discountAmount * 100) / 100,
    cartSubtotal,
    finalSubtotal: Math.round((cartSubtotal - discountAmount) * 100) / 100,
  }
}

export async function redeemVoucher(
  voucherId: number,
  userId: string,
  orderId: number,
  discountAmount: number,
) {
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
}
