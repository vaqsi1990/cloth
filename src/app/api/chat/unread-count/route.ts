import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'ავტორიზაცია საჭიროა' }, { status: 401 })
    }

    const userId = session.user.id

    const result = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(DISTINCT cr.id)::int AS count
      FROM "ChatRoom" cr
      INNER JOIN LATERAL (
        SELECT cm."isFromAdmin"
        FROM "ChatMessage" cm
        WHERE cm."chatRoomId" = cr.id
        ORDER BY cm."createdAt" DESC
        LIMIT 1
      ) last_msg ON true
      WHERE (cr."userId" = ${userId} OR cr."adminId" = ${userId})
        AND (
          (cr."userId" = ${userId} AND last_msg."isFromAdmin" = true)
          OR (cr."adminId" = ${userId} AND last_msg."isFromAdmin" = false)
        )
    `

    return NextResponse.json({
      success: true,
      unreadCount: result[0]?.count ?? 0,
    })
  } catch (error) {
    console.error('GET chat unread-count:', error)
    return NextResponse.json({ success: false, message: 'შეცდომა' }, { status: 500 })
  }
}
