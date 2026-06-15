import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdminOrSupport } from '@/lib/roles'
import { unbanUser } from '@/lib/user-blacklist'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !isAdminOrSupport(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Admin or Support access required' },
        { status: 403 },
      )
    }

    const recordId = parseInt((await params).id, 10)
    if (isNaN(recordId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid record ID' },
        { status: 400 },
      )
    }

    const body = await request.json()
    const adminNotes =
      typeof body?.adminNotes === 'string' ? body.adminNotes.trim() : undefined
    const resolve = body?.resolve === true

    const existing = await prisma.userBlacklistRecord.findUnique({
      where: { id: recordId },
      select: { id: true, userId: true, isActive: true, source: true },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'ჩანაწერი ვერ მოიძებნა' },
        { status: 404 },
      )
    }

    if (resolve && existing.isActive) {
      await unbanUser({
        userId: existing.userId,
        resolvedById: session.user.id,
      })
    } else if (adminNotes !== undefined) {
      await prisma.userBlacklistRecord.update({
        where: { id: recordId },
        data: { adminNotes: adminNotes || null },
      })
    }

    const record = await prisma.userBlacklistRecord.findUnique({
      where: { id: recordId },
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
        resolvedBy: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json({ success: true, record })
  } catch (error) {
    console.error('Error updating blacklist record:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update blacklist record' },
      { status: 500 },
    )
  }
}
