import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { fetchAccountChatRooms } from '@/lib/account-chat-list'
import { activeLiveSupportChatRoomWhereForUser } from '@/lib/account-product-chat'
import {
  createChatRoomMessageSchema,
  normalizeChatMessageContent,
} from '@/lib/chat-message'
import {
  removeClosedLiveSupportRoomsForGuest,
  removeClosedLiveSupportRoomsForUser,
} from '@/lib/chat-live-support-room'

// Validation schemas
const createChatRoomSchema = createChatRoomMessageSchema

// GET - Get user's chat rooms
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        message: 'Authentication required'
      }, { status: 401 })
    }

    const chatRooms = await fetchAccountChatRooms(session.user.id)

    return NextResponse.json({
      success: true,
      chatRooms,
    })

  } catch (error) {
    console.error('Error fetching chat rooms:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create new chat room or send message
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const body = await request.json()
    
    // Determine user context (optional)
    let userId: string | null = session?.user?.id || null
    if (userId) {
      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true }
      })
      if (!dbUser) {
        userId = null // fallback to guest flow if user record missing
      }
    }

    const validatedData = createChatRoomSchema.parse(body)
    const messageContent = normalizeChatMessageContent(validatedData.message)
    const messageImageUrl = validatedData.imageUrl ?? null

    // If we have a valid user, try to reuse/create a chat room with userId
    if (userId) {
      const existingChatRoom = await prisma.$queryRaw<Array<{ id: number }>>`
        SELECT cr.id FROM "ChatRoom" cr
        WHERE ${activeLiveSupportChatRoomWhereForUser(userId)}
        ORDER BY cr."createdAt" DESC
        LIMIT 1
      `

      if (existingChatRoom.length > 0) {
        const roomId = existingChatRoom[0].id
        
        await prisma.$executeRaw`
          INSERT INTO "ChatMessage" ("content", "imageUrl", "chatRoomId", "userId", "isFromAdmin", "createdAt")
          VALUES (${messageContent}, ${messageImageUrl}, ${roomId}, ${userId}, false, NOW())
        `

        await prisma.$executeRaw`
          UPDATE "ChatRoom" 
          SET status = 'ACTIVE', "updatedAt" = NOW()
          WHERE id = ${roomId}
        `

        console.log(`✅ User ${userId} sent message to existing chat room ${roomId}`)
        
        return NextResponse.json({
          success: true,
          message: 'Message sent',
          chatRoomId: roomId
        })
      }

      await removeClosedLiveSupportRoomsForUser(userId)

      const newRoom = await prisma.$queryRaw<Array<{ id: number }>>`
        INSERT INTO "ChatRoom" ("userId", status, "createdAt", "updatedAt")
        VALUES (${userId}, 'PENDING', NOW(), NOW())
        RETURNING id
      `

      const roomId = newRoom[0].id

      await prisma.$executeRaw`
        INSERT INTO "ChatMessage" ("content", "imageUrl", "chatRoomId", "userId", "isFromAdmin", "createdAt")
        VALUES (${messageContent}, ${messageImageUrl}, ${roomId}, ${userId}, false, NOW())
      `

      console.log(`✅ Created new chat room ${roomId} for user ${userId}`)

      return NextResponse.json({
        success: true,
        message: 'Chat room created',
        chatRoomId: roomId,
        created: true,
      })
    }

    if (validatedData.guestEmail?.trim()) {
      await removeClosedLiveSupportRoomsForGuest(validatedData.guestEmail)
    }

    const newRoom = await prisma.$queryRaw<Array<{ id: number }>>`
      INSERT INTO "ChatRoom" ("guestName", "guestEmail", status, "createdAt", "updatedAt")
      VALUES (${validatedData.guestName || null}, ${validatedData.guestEmail || null}, 'PENDING', NOW(), NOW())
      RETURNING id
    `

    const roomId = newRoom[0].id

    await prisma.$executeRaw`
      INSERT INTO "ChatMessage" ("content", "imageUrl", "chatRoomId", "isFromAdmin", "createdAt")
      VALUES (${messageContent}, ${messageImageUrl}, ${roomId}, false, NOW())
    `

    return NextResponse.json({
      success: true,
      message: 'Chat room created',
      chatRoomId: roomId,
      created: true,
    })
  } catch (error) {
    console.error('Error creating chat room:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: 'Validation error',
          errors: error.issues.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 },
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
