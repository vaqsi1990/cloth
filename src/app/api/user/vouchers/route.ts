import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserVoucherRemainingAmount } from '@/lib/voucher'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'ავტორიზაცია საჭიროა' },
        { status: 401 },
      )
    }

    const userVouchers = await prisma.userVoucher.findMany({
      where: { userId: session.user.id },
      include: {
        voucher: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const now = new Date()
    const vouchers = await Promise.all(
      userVouchers.map(async (uv) => {
        const v = uv.voucher
        const expiresAt = uv.expiresAt ?? v.expiresAt
        const isExpired = expiresAt ? now > expiresAt : false
        const notStarted = v.startsAt ? now < v.startsAt : false
        const remainingAmount = await getUserVoucherRemainingAmount(
          v.id,
          session.user.id,
          v.discountAmount,
        )
        const isAvailable =
          remainingAmount > 0 && v.isActive && !isExpired && !notStarted

        return {
          id: uv.id,
          voucherId: v.id,
          code: v.code,
          discountAmount: v.discountAmount,
          remainingAmount,
          minOrderAmount: v.minOrderAmount,
          expiresAt,
          message: uv.message,
          isUsed: remainingAmount <= 0,
          isActive: v.isActive,
          isExpired,
          isAvailable,
          receivedAt: uv.createdAt,
        }
      }),
    )

    return NextResponse.json({ success: true, vouchers })
  } catch (error) {
    console.error('Error fetching user vouchers:', error)
    return NextResponse.json(
      { success: false, error: 'შეცდომა' },
      { status: 500 },
    )
  }
}
