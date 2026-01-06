import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdminOrSupport } from '@/lib/roles'

// GET - Get unread chat count for admin
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !isAdminOrSupport(session.user.role)) {
      return NextResponse.json({
        success: false,
        message: 'Admin or Support access required'
      }, { status: 401 })
    }

    // Count unread chats:
    // 1. Chat rooms with status PENDING (not yet assigned)
    // 2. Chat rooms with status ACTIVE where the last message is from a user (not from admin)
    
    // First, get PENDING chats
    const pendingCountResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::int as count
      FROM "ChatRoom" cr
      LEFT JOIN "User" a ON cr."adminId" = a.id
      WHERE (cr."adminId" IS NULL OR a.role = 'ADMIN')
        AND cr.status = 'PENDING'
    `
    const pendingCount = Number(pendingCountResult[0]?.count || 0)

    // Then, get ACTIVE chats where last message is from user (not admin)
    const activeUnreadResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT cr.id)::int as count
      FROM "ChatRoom" cr
      LEFT JOIN "User" a ON cr."adminId" = a.id
      WHERE (cr."adminId" IS NULL OR a.role = 'ADMIN')
        AND cr.status = 'ACTIVE'
        AND EXISTS (
          SELECT 1
          FROM "ChatMessage" cm
          WHERE cm."chatRoomId" = cr.id
            AND cm."isFromAdmin" = false
            AND cm."createdAt" = (
              SELECT MAX("createdAt")
              FROM "ChatMessage"
              WHERE "chatRoomId" = cr.id
            )
        )
    `
    const activeUnreadCount = Number(activeUnreadResult[0]?.count || 0)

    const totalUnread = pendingCount + activeUnreadCount

    return NextResponse.json({
      success: true,
      unreadCount: totalUnread,
      pendingCount,
      activeUnreadCount
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

