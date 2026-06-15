import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdminOrSupport } from '@/lib/roles'
import {
  createBlacklistRecord,
  syncMissingBlacklistRecords,
} from '@/lib/user-blacklist'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !isAdminOrSupport(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Admin or Support access required' },
        { status: 403 },
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'all'
    const search = searchParams.get('search')?.trim() || ''

    if (searchParams.get('sync') === 'true') {
      await syncMissingBlacklistRecords()
    }

    const records = await prisma.userBlacklistRecord.findMany({
      where: {
        ...(status === 'active' ? { isActive: true } : {}),
        ...(status === 'resolved' ? { isActive: false } : {}),
        ...(search
          ? {
              OR: [
                { userName: { contains: search, mode: 'insensitive' as const } },
                { userEmail: { contains: search, mode: 'insensitive' as const } },
                { userPhone: { contains: search, mode: 'insensitive' as const } },
                { personalId: { contains: search, mode: 'insensitive' as const } },
                { reason: { contains: search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            banned: true,
            blocked: true,
            verified: true,
            _count: { select: { products: true, orders: true } },
          },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        resolvedBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
      take: 200,
    })

    const activeCount = await prisma.userBlacklistRecord.count({
      where: { isActive: true },
    })

    return NextResponse.json({
      success: true,
      records,
      activeCount,
    })
  } catch (error) {
    console.error('Error fetching blacklist:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch blacklist' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !isAdminOrSupport(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Admin or Support access required' },
        { status: 403 },
      )
    }

    const body = await request.json()
    const userId = typeof body?.userId === 'string' ? body.userId : ''
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : ''
    const adminNotes =
      typeof body?.adminNotes === 'string' ? body.adminNotes.trim() : null

    if (!userId || !reason) {
      return NextResponse.json(
        { success: false, error: 'userId და მიზეზი სავალდებულოა' },
        { status: 400 },
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'მომხმარებელი ვერ მოიძებნა' },
        { status: 404 },
      )
    }

    await createBlacklistRecord({
      userId,
      reason,
      source: 'MANUAL_BAN',
      createdById: session.user.id,
      adminNotes,
    })

    const record = await prisma.userBlacklistRecord.findFirst({
      where: { userId, isActive: true, source: 'MANUAL_BAN' },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            banned: true,
            blocked: true,
          },
        },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json({ success: true, record })
  } catch (error) {
    console.error('Error creating blacklist record:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create blacklist record' },
      { status: 500 },
    )
  }
}
