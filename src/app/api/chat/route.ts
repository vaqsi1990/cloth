import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validation schemas
const createChatRoomSchema = z.object({
  guestName: z.string().optional(),
  guestEmail: z.string().email().optional(),
  message: z.string().min(1)
})

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

    // Use raw query to avoid Prisma Client issues
    const chatRooms = await prisma.$queryRaw<Array<{
      id: number
      createdAt: Date
      updatedAt: Date
      status: string
      guestName?: string
      guestEmail?: string
      user_name?: string
      user_email?: string
      admin_name?: string
      admin_email?: string
      message_count: number
      last_message?: string
      last_message_isFromAdmin?: boolean
      last_message_userId?: string
    }>>`
      SELECT cr.id, cr."createdAt", cr."updatedAt", cr.status, cr."guestName", cr."guestEmail",
             u.name as user_name, u.email as user_email,
             a.name as admin_name, a.email as admin_email,
             (SELECT COUNT(*) FROM "ChatMessage" WHERE "chatRoomId" = cr.id)::int as message_count,
             (SELECT "content" FROM "ChatMessage" WHERE "chatRoomId" = cr.id ORDER BY "createdAt" DESC LIMIT 1) as last_message,
             (SELECT "isFromAdmin" FROM "ChatMessage" WHERE "chatRoomId" = cr.id ORDER BY "createdAt" DESC LIMIT 1) as last_message_isFromAdmin,
             (SELECT "userId" FROM "ChatMessage" WHERE "chatRoomId" = cr.id ORDER BY "createdAt" DESC LIMIT 1) as last_message_userId
      FROM "ChatRoom" cr
      LEFT JOIN "User" u ON cr."userId" = u.id
      LEFT JOIN "User" a ON cr."adminId" = a.id
      WHERE cr."userId" = ${session.user.id} OR cr."adminId" = ${session.user.id}
      ORDER BY cr."updatedAt" DESC
    `

    // Transform the data to include messages array for compatibility
    const transformedChatRooms = chatRooms.map(room => ({
      ...room,
      messages: room.last_message ? [{
        isFromAdmin: room.last_message_isFromAdmin || false,
        userId: room.last_message_userId || null,
        content: room.last_message
      }] : []
    }))

    return NextResponse.json({
      success: true,
      chatRooms: transformedChatRooms
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

    // If we have a valid user, try to reuse/create a chat room with userId
    if (userId) {
      const existingChatRoom = await prisma.$queryRaw<Array<{ id: number }>>`
        SELECT id FROM "ChatRoom" 
        WHERE "userId" = ${userId} 
        AND status IN ('PENDING', 'ACTIVE')
        ORDER BY "createdAt" DESC
        LIMIT 1
      `

      if (existingChatRoom.length > 0) {
        const roomId = existingChatRoom[0].id
        
        await prisma.$executeRaw`
          INSERT INTO "ChatMessage" ("content", "chatRoomId", "userId", "isFromAdmin", "createdAt")
          VALUES (${validatedData.message}, ${roomId}, ${userId}, false, NOW())
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

      const newRoom = await prisma.$queryRaw<Array<{ id: number }>>`
        INSERT INTO "ChatRoom" ("userId", status, "createdAt", "updatedAt")
        VALUES (${userId}, 'PENDING', NOW(), NOW())
        RETURNING id
      `

      const roomId = newRoom[0].id

      await prisma.$executeRaw`
        INSERT INTO "ChatMessage" ("content", "chatRoomId", "userId", "isFromAdmin", "createdAt")
        VALUES (${validatedData.message}, ${roomId}, ${userId}, false, NOW())
      `

      console.log(`✅ Created new chat room ${roomId} for user ${userId}`)
      
      return NextResponse.json({
        success: true,
        message: 'Chat room created',
        chatRoomId: roomId
      })
    }

    // Guest (or missing user) flow - no required guest fields
    const newRoom = await prisma.$queryRaw<Array<{ id: number }>>`
      INSERT INTO "ChatRoom" ("guestName", "guestEmail", status, "createdAt", "updatedAt")
      VALUES (${validatedData.guestName || null}, ${validatedData.guestEmail || null}, 'PENDING', NOW(), NOW())
      RETURNING id
    `

    const roomId = newRoom[0].id

    await prisma.$executeRaw`
      INSERT INTO "ChatMessage" ("content", "chatRoomId", "isFromAdmin", "createdAt")
      VALUES (${validatedData.message}, ${roomId}, false, NOW())
    `

    return NextResponse.json({
      success: true,
      message: 'Chat room created',
      chatRoomId: roomId
    })

  } catch (error) {
    console.error('Error creating chat room:', error)
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false,
          message: 'Validation error',
          errors: error.issues.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      )
    }
    
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
