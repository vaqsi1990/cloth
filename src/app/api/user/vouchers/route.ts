import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
    const vouchers = userVouchers.map((uv) => {
      const v = uv.voucher
      const isExpired = v.expiresAt ? now > v.expiresAt : false
      const notStarted = v.startsAt ? now < v.startsAt : false
      const isAvailable =
        !uv.isUsed && v.isActive && !isExpired && !notStarted

      return {
        id: uv.id,
        voucherId: v.id,
        code: v.code,
        discountAmount: v.discountAmount,
        minOrderAmount: v.minOrderAmount,
        expiresAt: v.expiresAt,
        message: uv.message,
        isUsed: uv.isUsed,
        isActive: v.isActive,
        isExpired,
        isAvailable,
        receivedAt: uv.createdAt,
      }
    })

    return NextResponse.json({ success: true, vouchers })
  } catch (error) {
    console.error('Error fetching user vouchers:', error)
    return NextResponse.json(
      { success: false, error: 'შეცდომა' },
      { status: 500 },
    )
  }
}
