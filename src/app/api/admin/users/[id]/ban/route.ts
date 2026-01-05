import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdminOrSupport } from '@/lib/roles'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !isAdminOrSupport(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Admin or Support access required' }, { status: 403 })
    }

    const { banned, reason } = await request.json()
    if (typeof banned !== 'boolean') {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 })
    }

    const resolved = await params
    const userId = resolved.id

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        banned,
        banReason: banned ? (reason || null) : null,
        bannedAt: banned ? new Date() : null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        banned: true,
        banReason: true,
        bannedAt: true,
      }
    })

    return NextResponse.json({ success: true, user: updated })
  } catch (error) {
    console.error('Error updating ban status:', error)
    return NextResponse.json({ success: false, error: 'Failed to update ban status' }, { status: 500 })
  }
}
