import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function isVoucherCurrentlyValid(voucher: {
  isActive: boolean
  startsAt: Date | null
  expiresAt: Date | null
}) {
  const now = new Date()
  if (!voucher.isActive) return false
  if (voucher.startsAt && now < voucher.startsAt) return false
  if (voucher.expiresAt && now > voucher.expiresAt) return false
  return true
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: true, voucher: null })
    }

    const userVoucher = await prisma.userVoucher.findFirst({
      where: {
        userId: session.user.id,
        seenAt: null,
        isUsed: false,
      },
      include: { voucher: true },
      orderBy: { createdAt: 'desc' },
    })

    if (!userVoucher || !isVoucherCurrentlyValid(userVoucher.voucher)) {
      return NextResponse.json({ success: true, voucher: null })
    }

    const v = userVoucher.voucher

    return NextResponse.json({
      success: true,
      voucher: {
        id: userVoucher.id,
        code: v.code,
        discountAmount: v.discountAmount,
        minOrderAmount: v.minOrderAmount,
        expiresAt: v.expiresAt,
        message: userVoucher.message,
      },
    })
  } catch (error) {
    console.error('Error fetching voucher popup:', error)
    return NextResponse.json(
      { success: false, error: 'შეცდომა' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'ავტორიზაცია საჭიროა' },
        { status: 401 },
      )
    }

    const body = await request.json()
    const { id } = body

    if (!id || typeof id !== 'number') {
      return NextResponse.json(
        { success: false, error: 'არასწორი ID' },
        { status: 400 },
      )
    }

    const userVoucher = await prisma.userVoucher.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!userVoucher) {
      return NextResponse.json(
        { success: false, error: 'ვაუჩერი ვერ მოიძებნა' },
        { status: 404 },
      )
    }

    await prisma.userVoucher.update({
      where: { id },
      data: { seenAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error dismissing voucher popup:', error)
    return NextResponse.json(
      { success: false, error: 'შეცდომა' },
      { status: 500 },
    )
  }
}
