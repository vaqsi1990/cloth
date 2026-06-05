import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import type { Session } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalizeVoucherCode } from '@/lib/voucher'

function requireAdmin(session: Session | null) {
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json(
      { success: false, error: 'Admin access required' },
      { status: 403 },
    )
  }
  return null
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const denied = requireAdmin(session)
    if (denied) return denied

    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const vouchers = await prisma.voucher.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json({ success: true, vouchers })
  } catch (error) {
    console.error('Error fetching vouchers:', error)
    return NextResponse.json(
      { success: false, error: 'Error fetching vouchers' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const denied = requireAdmin(session)
    if (denied) return denied

    const body = await request.json()
    const {
      code,
      discountAmount,
      minOrderAmount,
      usageLimit,
      perUserLimit,
      startsAt,
      expiresAt,
      isActive,
      note,
    } = body

    const normalizedCode = normalizeVoucherCode(code || '')
    if (!normalizedCode || normalizedCode.length < 3) {
      return NextResponse.json(
        { success: false, error: 'კოდი მინიმუმ 3 სიმბოლო უნდა იყოს' },
        { status: 400 },
      )
    }

    if (
      discountAmount === undefined ||
      typeof discountAmount !== 'number' ||
      discountAmount <= 0
    ) {
      return NextResponse.json(
        { success: false, error: 'ფასდაკლება უნდა იყოს დადებითი რიცხვი (₾)' },
        { status: 400 },
      )
    }

    const existing = await prisma.voucher.findUnique({
      where: { code: normalizedCode },
    })
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'ამ კოდით ვაუჩერი უკვე არსებობს' },
        { status: 400 },
      )
    }

    const voucher = await prisma.voucher.create({
      data: {
        code: normalizedCode,
        discountAmount,
        minOrderAmount:
          minOrderAmount !== undefined && minOrderAmount !== null
            ? Number(minOrderAmount)
            : null,
        usageLimit:
          usageLimit !== undefined && usageLimit !== null
            ? Number(usageLimit)
            : null,
        perUserLimit:
          perUserLimit !== undefined ? Number(perUserLimit) || 1 : 1,
        startsAt: startsAt ? new Date(startsAt) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        note: note?.trim() || null,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'ვაუჩერი წარმატებით შეიქმნა',
      voucher,
    })
  } catch (error) {
    console.error('Error creating voucher:', error)
    return NextResponse.json(
      { success: false, error: 'Error creating voucher' },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const denied = requireAdmin(session)
    if (denied) return denied

    const body = await request.json()
    const {
      id,
      code,
      discountAmount,
      minOrderAmount,
      usageLimit,
      perUserLimit,
      startsAt,
      expiresAt,
      isActive,
      note,
    } = body

    if (!id || typeof id !== 'number') {
      return NextResponse.json(
        { success: false, error: 'ვაუჩერის ID აუცილებელია' },
        { status: 400 },
      )
    }

    const existing = await prisma.voucher.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'ვაუჩერი ვერ მოიძებნა' },
        { status: 404 },
      )
    }

    const updateData: {
      code?: string
      discountAmount?: number
      minOrderAmount?: number | null
      usageLimit?: number | null
      perUserLimit?: number
      startsAt?: Date | null
      expiresAt?: Date | null
      isActive?: boolean
      note?: string | null
    } = {}

    if (code !== undefined) {
      const normalizedCode = normalizeVoucherCode(code)
      if (!normalizedCode || normalizedCode.length < 3) {
        return NextResponse.json(
          { success: false, error: 'კოდი მინიმუმ 3 სიმბოლო უნდა იყოს' },
          { status: 400 },
        )
      }
      const duplicate = await prisma.voucher.findUnique({
        where: { code: normalizedCode },
      })
      if (duplicate && duplicate.id !== id) {
        return NextResponse.json(
          { success: false, error: 'ამ კოდით ვაუჩერი უკვე არსებობს' },
          { status: 400 },
        )
      }
      updateData.code = normalizedCode
    }

    if (discountAmount !== undefined) {
      if (typeof discountAmount !== 'number' || discountAmount <= 0) {
        return NextResponse.json(
          { success: false, error: 'ფასდაკლება უნდა იყოს დადებითი რიცხვი (₾)' },
          { status: 400 },
        )
      }
      updateData.discountAmount = discountAmount
    }

    if (minOrderAmount !== undefined) {
      updateData.minOrderAmount =
        minOrderAmount === null ? null : Number(minOrderAmount)
    }

    if (usageLimit !== undefined) {
      updateData.usageLimit = usageLimit === null ? null : Number(usageLimit)
    }

    if (perUserLimit !== undefined) {
      updateData.perUserLimit = Number(perUserLimit) || 1
    }

    if (startsAt !== undefined) {
      updateData.startsAt = startsAt ? new Date(startsAt) : null
    }

    if (expiresAt !== undefined) {
      updateData.expiresAt = expiresAt ? new Date(expiresAt) : null
    }

    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive)
    }

    if (note !== undefined) {
      updateData.note = note?.trim() || null
    }

    const voucher = await prisma.voucher.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      message: 'ვაუჩერი განახლდა',
      voucher,
    })
  } catch (error) {
    console.error('Error updating voucher:', error)
    return NextResponse.json(
      { success: false, error: 'Error updating voucher' },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const denied = requireAdmin(session)
    if (denied) return denied

    const { searchParams } = new URL(request.url)
    const id = parseInt(searchParams.get('id') || '', 10)
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'არასწორი ID' },
        { status: 400 },
      )
    }

    const existing = await prisma.voucher.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'ვაუჩერი ვერ მოიძებნა' },
        { status: 404 },
      )
    }

    await prisma.voucher.delete({ where: { id } })

    return NextResponse.json({
      success: true,
      message: 'ვაუჩერი წაიშალა',
    })
  } catch (error) {
    console.error('Error deleting voucher:', error)
    return NextResponse.json(
      { success: false, error: 'Error deleting voucher' },
      { status: 500 },
    )
  }
}
