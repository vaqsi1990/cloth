import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { isAdminOrSupport } from '@/lib/roles'

// Validation schema
const sendMessageSchema = z.object({
  content: z.string().min(1).max(1000)
})

// GET - Get messages for a chat room
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const chatRoomId = parseInt(id)
    
    if (isNaN(chatRoomId)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid chat room ID',
          message: 'Invalid chat room ID'
        },
        { status: 400 }
      )
    }

    const session = await getServerSession(authOptions)
    
    // Check if user has access to this chat room
    // Admin/Support users can access any chat room
    // Regular users can access chat rooms where they are userId (buyer) or adminId (seller/product author)
    let chatRoom
    if (isAdminOrSupport(session?.user?.role)) {
      // Admin/Support can access any chat room
      chatRoom = await prisma.$queryRaw<Array<{ id: number }>>`
        SELECT id FROM "ChatRoom" 
        WHERE id = ${chatRoomId}
        LIMIT 1
      `
    } else {
      // Regular users can access their own chat rooms (as buyer) or chat rooms where they are seller (adminId)
      // For guest users, we need to check if they have access via session or if it's a guest chat
      if (session?.user?.id) {
        // Authenticated user - can be buyer (userId) or seller (adminId)
        chatRoom = await prisma.$queryRaw<Array<{ id: number }>>`
          SELECT id FROM "ChatRoom" 
          WHERE id = ${chatRoomId}
          AND ("userId" = ${session.user.id} OR "adminId" = ${session.user.id})
          LIMIT 1
        `
      } else {
        // Guest user - allow access to any chat room (they'll be identified by guestEmail in messages)
        chatRoom = await prisma.$queryRaw<Array<{ id: number }>>`
          SELECT id FROM "ChatRoom" 
          WHERE id = ${chatRoomId}
          LIMIT 1
        `
      }
    }

    if (chatRoom.length === 0) {
      console.log(`Chat room ${chatRoomId} not found or access denied for user ${session?.user?.id || 'guest'}`)
      return NextResponse.json(
        { 
          success: false,
          error: 'Chat room not found or access denied',
          message: 'Chat room not found or access denied'
        },
        { status: 404 }
      )
    }

    // Get chat room info
    const chatRoomData = await prisma.$queryRaw<Array<{
      userId: string | null
      adminId: string | null
    }>>`
      SELECT "userId", "adminId"
      FROM "ChatRoom"
      WHERE id = ${chatRoomId}
      LIMIT 1
    `

    const messages = await prisma.$queryRaw<Array<{
      id: number
      content: string
      createdAt: Date
      isFromAdmin: boolean
      user_name?: string
      user_email?: string
      admin_name?: string
      admin_email?: string
      admin_role?: string
    }>>`
      SELECT cm.id, cm.content, cm."createdAt", cm."isFromAdmin",
             u.name as user_name, u.email as user_email,
             a.name as admin_name, a.email as admin_email, a.role as admin_role
      FROM "ChatMessage" cm
      LEFT JOIN "User" u ON cm."userId" = u.id
      LEFT JOIN "User" a ON cm."adminId" = a.id
      WHERE cm."chatRoomId" = ${chatRoomId}
      ORDER BY cm."createdAt" ASC
    `

    // Serialize dates to ISO strings for JSON response
    const serializedMessages = messages.map(msg => ({
      ...msg,
      createdAt: msg.createdAt instanceof Date ? msg.createdAt.toISOString() : msg.createdAt
    }))

    return NextResponse.json({
      success: true,
      messages: serializedMessages,
      chatRoom: chatRoomData.length > 0 ? {
        userId: chatRoomData[0].userId,
        adminId: chatRoomData[0].adminId
      } : null
    })

  } catch (error) {
    console.error('Error fetching messages:', error)
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

// POST - Send message to chat room
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const chatRoomId = parseInt(id)
    
    if (isNaN(chatRoomId)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid chat room ID',
          message: 'Invalid chat room ID'
        },
        { status: 400 }
      )
    }

    const session = await getServerSession(authOptions)
    const body = await request.json()
    const validatedData = sendMessageSchema.parse(body)

    // Check if chat room exists and user has access
    // Admin/Support users can access any chat room
    // Regular users can access chat rooms where they are userId (buyer) or adminId (seller/product author)
    let chatRoom
    if (isAdminOrSupport(session?.user?.role)) {
      // Admin/Support can access any chat room
      chatRoom = await prisma.$queryRaw<Array<{ id: number }>>`
        SELECT id FROM "ChatRoom" 
        WHERE id = ${chatRoomId}
        LIMIT 1
      `
    } else {
      // Regular users can access their own chat rooms (as buyer) or chat rooms where they are seller (adminId)
      // For guest users, we need to check if they have access via session or if it's a guest chat
      if (session?.user?.id) {
        // Authenticated user - can be buyer (userId) or seller (adminId)
        chatRoom = await prisma.$queryRaw<Array<{ id: number }>>`
          SELECT id FROM "ChatRoom" 
          WHERE id = ${chatRoomId}
          AND ("userId" = ${session.user.id} OR "adminId" = ${session.user.id})
          LIMIT 1
        `
      } else {
        // Guest user - allow access to any chat room (they'll be identified by guestEmail in messages)
        chatRoom = await prisma.$queryRaw<Array<{ id: number }>>`
          SELECT id FROM "ChatRoom" 
          WHERE id = ${chatRoomId}
          LIMIT 1
        `
      }
    }

    if (chatRoom.length === 0) {
      console.log(`Chat room ${chatRoomId} not found or access denied for user ${session?.user?.id || 'guest'}`)
      return NextResponse.json(
        { 
          success: false,
          error: 'Chat room not found or access denied',
          message: 'Chat room not found or access denied'
        },
        { status: 404 }
      )
    }

    // Check if user is the seller (adminId) in this chat room
    const chatRoomInfo = await prisma.$queryRaw<Array<{ userId: string | null; adminId: string | null }>>`
      SELECT "userId", "adminId" FROM "ChatRoom" WHERE id = ${chatRoomId} LIMIT 1
    `
    
    const isUserSeller = chatRoomInfo.length > 0 && chatRoomInfo[0].adminId === session?.user?.id
    const isUserAdminOrSupport = isAdminOrSupport(session?.user?.role)
    
    // Determine if message is from admin/support/seller
    const isFromAdmin = isUserAdminOrSupport || isUserSeller
    let adminId: string | null = null
    if (isFromAdmin && session?.user?.id) {
      const adminUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true }
      })
      if (adminUser) {
        adminId = adminUser.id
      } else {
        // allow sending without admin record; use null adminId to avoid FK issues
        adminId = null
      }
    }
    
    let newMessage: Array<{
      id: number
      content: string
      createdAt: Date
      isFromAdmin: boolean
      admin_name?: string
      admin_email?: string
      admin_role?: string
    }>
    if (isFromAdmin) {
      const insertedMessage = await prisma.$queryRaw<Array<{
        id: number
        content: string
        createdAt: Date
        isFromAdmin: boolean
      }>>`
        INSERT INTO "ChatMessage" ("content", "chatRoomId", "adminId", "isFromAdmin", "createdAt")
        VALUES (${validatedData.content}, ${chatRoomId}, ${adminId}, true, NOW())
        RETURNING id, content, "createdAt", "isFromAdmin"
      `
      
      // Fetch admin details including role
      let adminName: string | undefined
      let adminEmail: string | undefined
      let adminRole: string | undefined
      
      if (adminId) {
        const adminDetails = await prisma.$queryRaw<Array<{
          name: string | null
          email: string
          role: string
        }>>`
          SELECT name, email, role
          FROM "User"
          WHERE id = ${adminId}
          LIMIT 1
        `
        if (adminDetails.length > 0) {
          adminName = adminDetails[0].name || undefined
          adminEmail = adminDetails[0].email
          adminRole = adminDetails[0].role
        }
      }
      
      newMessage = [{
        ...insertedMessage[0],
        admin_name: adminName,
        admin_email: adminEmail,
        admin_role: adminRole
      }]
    } else {
      newMessage = await prisma.$queryRaw<Array<{
        id: number
        content: string
        createdAt: Date
        isFromAdmin: boolean
      }>>`
        INSERT INTO "ChatMessage" ("content", "chatRoomId", "userId", "isFromAdmin", "createdAt")
        VALUES (${validatedData.content}, ${chatRoomId}, ${session?.user?.id}, false, NOW())
        RETURNING id, content, "createdAt", "isFromAdmin"
      `
    }

    // Update chat room timestamp
    await prisma.$executeRaw`
      UPDATE "ChatRoom" 
      SET "updatedAt" = NOW()
      WHERE id = ${chatRoomId}
    `

    const message = newMessage[0]
    
    // Ensure message has admin details if it's from admin
    const responseMessage: {
      id: number
      content: string
      createdAt: string
      isFromAdmin: boolean
      admin_name?: string
      admin_email?: string
      admin_role?: string
    } = {
      id: message.id,
      content: message.content,
      createdAt: message.createdAt instanceof Date ? message.createdAt.toISOString() : String(message.createdAt),
      isFromAdmin: message.isFromAdmin
    }
    
    if (message.isFromAdmin && message.admin_name !== undefined) {
      responseMessage.admin_name = message.admin_name
      responseMessage.admin_email = message.admin_email
      responseMessage.admin_role = message.admin_role
    }

    return NextResponse.json({
      success: true,
      message: responseMessage
    })

  } catch (error) {
    console.error('Error sending message:', error)
    
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

// DELETE - Delete chat room
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const chatRoomId = parseInt(id)
    
    if (isNaN(chatRoomId)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid chat room ID',
          message: 'Invalid chat room ID'
        },
        { status: 400 }
      )
    }

    const session = await getServerSession(authOptions)
    
    // Check if user has access to this chat room
    let chatRoom
    if (isAdminOrSupport(session?.user?.role)) {
      // Admin/Support can delete any chat room
      chatRoom = await prisma.$queryRaw<Array<{ id: number }>>`
        SELECT id FROM "ChatRoom" 
        WHERE id = ${chatRoomId}
        LIMIT 1
      `
    } else {
      // Regular users can delete their own chat rooms (as buyer) or chat rooms where they are seller (adminId)
      if (session?.user?.id) {
        chatRoom = await prisma.$queryRaw<Array<{ id: number }>>`
          SELECT id FROM "ChatRoom" 
          WHERE id = ${chatRoomId}
          AND ("userId" = ${session.user.id} OR "adminId" = ${session.user.id})
          LIMIT 1
        `
      } else {
        // Guest users can delete their own chat rooms
        chatRoom = await prisma.$queryRaw<Array<{ id: number }>>`
          SELECT id FROM "ChatRoom" 
          WHERE id = ${chatRoomId}
          LIMIT 1
        `
      }
    }

    if (chatRoom.length === 0) {
      console.log(`Chat room ${chatRoomId} not found or access denied for user ${session?.user?.id || 'guest'}`)
      return NextResponse.json(
        { 
          success: false,
          error: 'Chat room not found or access denied',
          message: 'Chat room not found or access denied'
        },
        { status: 404 }
      )
    }

    // Delete all messages first (cascade should handle this, but being explicit)
    await prisma.$executeRaw`
      DELETE FROM "ChatMessage" 
      WHERE "chatRoomId" = ${chatRoomId}
    `

    // Delete the chat room
    await prisma.$executeRaw`
      DELETE FROM "ChatRoom" 
      WHERE id = ${chatRoomId}
    `

    return NextResponse.json({
      success: true,
      message: 'Chat room deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting chat room:', error)
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
