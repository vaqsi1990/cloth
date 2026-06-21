import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdminOrSupport } from '@/lib/roles'
import { staffSupportInboxWhere } from '@/lib/account-product-chat'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !isAdminOrSupport(session.user.role)) {
      return NextResponse.json({
        success: false,
        message: 'Admin or Support access required'
      }, { status: 401 })
    }

    const unreadResult = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(DISTINCT cr.id)::int AS count
      FROM "ChatRoom" cr
      LEFT JOIN "User" a ON cr."adminId" = a.id
      LEFT JOIN LATERAL (
        SELECT cm.id, cm."isFromAdmin"
        FROM "ChatMessage" cm
        WHERE cm."chatRoomId" = cr.id
        ORDER BY cm."createdAt" DESC
        LIMIT 1
      ) last_msg ON true
      WHERE ${staffSupportInboxWhere()}
        AND cr.status IN ('PENDING', 'ACTIVE')
        AND last_msg.id IS NOT NULL
        AND last_msg."isFromAdmin" = false
        AND (
          cr."adminLastReadMessageId" IS NULL
          OR last_msg.id > cr."adminLastReadMessageId"
        )
    `

    const totalUnread = unreadResult[0]?.count ?? 0

    const latestUnreadMessageResult = await prisma.$queryRaw<Array<{
      latestUnreadMessageId: number | null
      latestUnreadChatRoomId: number | null
    }>>`
      SELECT
        last_msg.id::int AS "latestUnreadMessageId",
        cr.id::int AS "latestUnreadChatRoomId"
      FROM "ChatRoom" cr
      LEFT JOIN "User" a ON cr."adminId" = a.id
      LEFT JOIN LATERAL (
        SELECT cm.id, cm."isFromAdmin"
        FROM "ChatMessage" cm
        WHERE cm."chatRoomId" = cr.id
        ORDER BY cm."createdAt" DESC
        LIMIT 1
      ) last_msg ON true
      WHERE ${staffSupportInboxWhere()}
        AND cr.status IN ('PENDING', 'ACTIVE')
        AND last_msg.id IS NOT NULL
        AND last_msg."isFromAdmin" = false
        AND (
          cr."adminLastReadMessageId" IS NULL
          OR last_msg.id > cr."adminLastReadMessageId"
        )
      ORDER BY last_msg.id DESC NULLS LAST, cr."updatedAt" DESC
      LIMIT 1
    `

    const latestUnreadMessageId = latestUnreadMessageResult[0]?.latestUnreadMessageId ?? null
    const latestUnreadChatRoomId = latestUnreadMessageResult[0]?.latestUnreadChatRoomId ?? null

    return NextResponse.json({
      success: true,
      unreadCount: totalUnread,
      latestUnreadMessageId,
      latestUnreadChatRoomId,
    })

  } catch (error) {
    console.error('Error fetching unread chat count:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
