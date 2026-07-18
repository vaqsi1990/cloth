import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserVoucherRemainingAmount } from '@/lib/voucher'

function isVoucherCurrentlyValid(params: {
  isActive: boolean
  startsAt: Date | null
  expiresAt: Date | null
}) {
  const now = new Date()
  if (!params.isActive) return false
  if (params.startsAt && now < params.startsAt) return false
  if (params.expiresAt && now > params.expiresAt) return false
  return true
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: true, voucher: null })
    }

    const candidates = await prisma.userVoucher.findMany({
      where: {
        userId: session.user.id,
        seenAt: null,
      },
      include: { voucher: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    let selected: (typeof candidates)[number] | null = null
    let remainingAmount = 0
    let expiresAt: Date | null = null

    for (const uv of candidates) {
      const effectiveExpiresAt = uv.expiresAt ?? uv.voucher.expiresAt
      if (
        !isVoucherCurrentlyValid({
          isActive: uv.voucher.isActive,
          startsAt: uv.voucher.startsAt,
          expiresAt: effectiveExpiresAt,
        })
      ) {
        continue
      }
      const remaining = await getUserVoucherRemainingAmount(
        uv.voucher.id,
        session.user.id,
        uv.voucher.discountAmount,
      )
      if (remaining <= 0) continue
      selected = uv
      remainingAmount = remaining
      expiresAt = effectiveExpiresAt
      break
    }

    if (!selected) {
      return NextResponse.json({ success: true, voucher: null })
    }

    const v = selected.voucher

    return NextResponse.json({
      success: true,
      voucher: {
        id: selected.id,
        code: v.code,
        discountAmount: v.discountAmount,
        remainingAmount,
        minOrderAmount: v.minOrderAmount,
        expiresAt,
        message: selected.message,
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
