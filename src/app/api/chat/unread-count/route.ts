import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { accountProductChatWhereForUser } from '@/lib/account-product-chat'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'ავტორიზაცია საჭიროა' }, { status: 401 })
    }

    const userId = session.user.id

    const productChatResult = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(DISTINCT cr.id)::int AS count
      FROM "ChatRoom" cr
      INNER JOIN "User" a ON cr."adminId" = a.id
      INNER JOIN LATERAL (
        SELECT cm.id, cm."isFromAdmin"
        FROM "ChatMessage" cm
        WHERE cm."chatRoomId" = cr.id
        ORDER BY cm."createdAt" DESC
        LIMIT 1
      ) last_msg ON true
      WHERE ${accountProductChatWhereForUser(userId)}
        AND (
          (cr."userId" = ${userId} AND last_msg."isFromAdmin" = true
            AND (cr."userLastReadMessageId" IS NULL OR last_msg.id > cr."userLastReadMessageId"))
          OR (cr."adminId" = ${userId} AND last_msg."isFromAdmin" = false
            AND (cr."adminLastReadMessageId" IS NULL OR last_msg.id > cr."adminLastReadMessageId"))
        )
    `

    const liveSupportResult = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(DISTINCT cr.id)::int AS count
      FROM "ChatRoom" cr
      LEFT JOIN "User" a ON cr."adminId" = a.id
      INNER JOIN LATERAL (
        SELECT cm.id, cm."isFromAdmin"
        FROM "ChatMessage" cm
        WHERE cm."chatRoomId" = cr.id
        ORDER BY cm."createdAt" DESC
        LIMIT 1
      ) last_msg ON true
      WHERE cr."userId" = ${userId}
        AND cr."productId" IS NULL
        AND (cr."adminId" IS NULL OR a.role IN ('ADMIN', 'SUPPORT'))
        AND last_msg."isFromAdmin" = true
        AND (cr."userLastReadMessageId" IS NULL OR last_msg.id > cr."userLastReadMessageId")
    `

    const unreadCount =
      (productChatResult[0]?.count ?? 0) + (liveSupportResult[0]?.count ?? 0)

    const liveSupportRoomResult = await prisma.$queryRaw<Array<{ id: number }>>`
      SELECT cr.id
      FROM "ChatRoom" cr
      LEFT JOIN "User" a ON cr."adminId" = a.id
      WHERE cr."userId" = ${userId}
        AND cr."productId" IS NULL
        AND (cr."adminId" IS NULL OR a.role IN ('ADMIN', 'SUPPORT'))
        AND cr.status IN ('PENDING', 'ACTIVE')
      ORDER BY cr."updatedAt" DESC
      LIMIT 1
    `

    return NextResponse.json({
      success: true,
      unreadCount,
      liveSupportChatRoomId: liveSupportRoomResult[0]?.id ?? null,
    })
  } catch (error) {
    console.error('GET chat unread-count:', error)
    return NextResponse.json({ success: false, message: 'შეცდომა' }, { status: 500 })
  }
}
