import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import type { Session } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function requireAdmin(session: Session | null) {
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json(
      { success: false, error: 'Admin access required' },
      { status: 403 },
    )
  }
  return null
}

function parseExpiresAt(value: unknown): Date | null {
  if (typeof value !== 'string' || !value.trim()) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const denied = requireAdmin(session)
    if (denied) return denied

    const body = await request.json()
    const { voucherId, userIds, message, expiresAt } = body

    if (!voucherId || typeof voucherId !== 'number') {
      return NextResponse.json(
        { success: false, error: 'ვაუჩერის ID აუცილებელია' },
        { status: 400 },
      )
    }

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'აირჩიეთ მინიმუმ ერთი მომხმარებელი' },
        { status: 400 },
      )
    }

    const uniqueUserIds = [
      ...new Set(userIds.filter((id: unknown) => typeof id === 'string')),
    ]
    if (uniqueUserIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'არასწორი მომხმარებლის ID' },
        { status: 400 },
      )
    }

    const voucher = await prisma.voucher.findUnique({ where: { id: voucherId } })
    if (!voucher) {
      return NextResponse.json(
        { success: false, error: 'ვაუჩერი ვერ მოიძებნა' },
        { status: 404 },
      )
    }

    if (!voucher.isActive) {
      return NextResponse.json(
        { success: false, error: 'არააქტიური ვაუჩერის გაგზავნა შეუძლებელია' },
        { status: 400 },
      )
    }

    const giftExpiresAt = parseExpiresAt(expiresAt) ?? voucher.expiresAt
    if (!giftExpiresAt) {
      return NextResponse.json(
        {
          success: false,
          error: 'ვაუჩერის ვადა აუცილებელია (აირჩიეთ თარიღი ან დააყენეთ ვაუჩერზე)',
        },
        { status: 400 },
      )
    }

    if (giftExpiresAt.getTime() <= Date.now()) {
      return NextResponse.json(
        { success: false, error: 'ვადა მომავალში უნდა იყოს' },
        { status: 400 },
      )
    }

    const users = await prisma.user.findMany({
      where: {
        id: { in: uniqueUserIds },
        banned: false,
      },
      select: { id: true },
    })

    if (users.length === 0) {
      return NextResponse.json(
        { success: false, error: 'მომხმარებლები ვერ მოიძებნა' },
        { status: 404 },
      )
    }

    const customMessage =
      typeof message === 'string' && message.trim() ? message.trim() : null

    const existing = await prisma.userVoucher.findMany({
      where: {
        voucherId,
        userId: { in: users.map((u) => u.id) },
      },
      select: { userId: true },
    })
    const existingUserIds = new Set(existing.map((e) => e.userId))

    const toCreate = users
      .filter((u) => !existingUserIds.has(u.id))
      .map((u) => ({
        userId: u.id,
        voucherId,
        message: customMessage,
        expiresAt: giftExpiresAt,
      }))

    if (toCreate.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'ყველა არჩეულ მომხმარებელს უკვე აქვს ეს ვაუჩერი',
        },
        { status: 400 },
      )
    }

    await prisma.userVoucher.createMany({ data: toCreate })

    const skippedCount = users.length - toCreate.length

    return NextResponse.json({
      success: true,
      message:
        skippedCount > 0
          ? `ვაუჩერი გაიგზავნა ${toCreate.length} მომხმარებელთან (${skippedCount} უკვე ჰქონდათ)`
          : `ვაუჩერი გაიგზავნა ${toCreate.length} მომხმარებელთან`,
      sentCount: toCreate.length,
      skippedCount,
      expiresAt: giftExpiresAt.toISOString(),
    })
  } catch (error) {
    console.error('Error sending voucher:', error)
    return NextResponse.json(
      { success: false, error: 'შეცდომა ვაუჩერის გაგზავნისას' },
      { status: 500 },
    )
  }
}
