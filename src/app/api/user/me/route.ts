import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        banned: true,
        banReason: true,
        bannedAt: true,
        blocked: true,
        verified: true,
        verification: { select: { status: true } }
      }
    })

    return NextResponse.json({ success: true, user })
  } catch (e) {
    console.error('GET /api/user/me error', e)
    return NextResponse.json({ success: false, error: 'Failed to load user' }, { status: 500 })
  }
}
