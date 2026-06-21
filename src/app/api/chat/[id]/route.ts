import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { isAdminOrSupport } from '@/lib/roles'
import { getChatRoomIfAllowed, isAdminSide } from '@/lib/chat-access'
import { resolveMessageFromAdminSide } from '@/lib/chat-unread'
import {
  getOtherPartyTyping,
  getTypingLabel,
  setChatTyping,
} from '@/lib/chat-typing'
import { markChatRoomAsRead } from '@/lib/chat-mark-read'
import { closeLiveSupportChatRoom } from '@/lib/chat-live-support-room'
import {
  normalizeChatMessageContent,
  sendChatMessageSchema,
} from '@/lib/chat-message'
import { internalServerErrorResponse } from '@/lib/api-error'

// Validation schema
const sendMessageSchema = sendChatMessageSchema

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
    const guestEmail = request.nextUrl.searchParams.get('guestEmail')

    type ChatRoomMeta = {
      userId: string | null
      adminId: string | null
      userTypingAt: Date | null
      adminTypingAt: Date | null
    }

    const chatRoomAccess = await getChatRoomIfAllowed(
      chatRoomId,
      session,
      guestEmail,
    )

    if (!chatRoomAccess) {
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

    const chatRoomRows = await prisma.$queryRaw<ChatRoomMeta[]>`
      SELECT "userId", "adminId", "userTypingAt", "adminTypingAt"
      FROM "ChatRoom"
      WHERE id = ${chatRoomId}
      LIMIT 1
    `

    const chatRoomMeta = chatRoomRows[0] ?? null

    if (!chatRoomMeta) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Chat room not found or access denied',
          message: 'Chat room not found or access denied'
        },
        { status: 404 }
      )
    }

    const viewerIsAdminSide = isAdminSide(session, chatRoomMeta)
    const otherPartyTyping = getOtherPartyTyping(chatRoomMeta, viewerIsAdminSide)

    const messages = await prisma.$queryRaw<Array<{
      id: number
      content: string
      imageUrl: string | null
      createdAt: Date
      isFromAdmin: boolean
      userId: string | null
      adminId: string | null
      user_name?: string
      user_email?: string
      admin_name?: string
      admin_email?: string
      admin_role?: string
    }>>`
      SELECT cm.id, cm.content, cm."imageUrl", cm."createdAt", cm."isFromAdmin",
             cm."userId", cm."adminId",
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

    const latestMessageId =
      messages.length > 0 ? messages[messages.length - 1].id : null

    try {
      await markChatRoomAsRead(
        chatRoomId,
        chatRoomMeta,
        session,
        viewerIsAdminSide,
        latestMessageId,
      )
    } catch (readError) {
      console.error('Failed to mark chat room as read:', readError)
    }

    return NextResponse.json({
      success: true,
      messages: serializedMessages,
      chatRoom: chatRoomMeta
        ? {
            userId: chatRoomMeta.userId,
            adminId: chatRoomMeta.adminId,
          }
        : null,
      otherPartyTyping,
      typingLabel: otherPartyTyping ? getTypingLabel(viewerIsAdminSide) : null,
    })

  } catch (error) {
    return internalServerErrorResponse('Error fetching messages:', error)
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
    const guestEmail =
      typeof body?.guestEmail === 'string' ? body.guestEmail : null
    const validatedData = sendMessageSchema.parse(body)
    const messageContent = normalizeChatMessageContent(validatedData.content)
    const messageImageUrl = validatedData.imageUrl ?? null

    const chatRoomAccess = await getChatRoomIfAllowed(
      chatRoomId,
      session,
      guestEmail,
    )

    if (!chatRoomAccess) {
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

    const chatRoomInfo = await prisma.$queryRaw<
      Array<{ userId: string | null; adminId: string | null; productId: number | null }>
    >`
      SELECT "userId", "adminId", "productId" FROM "ChatRoom" WHERE id = ${chatRoomId} LIMIT 1
    `

    const roomMeta = chatRoomInfo[0]
    const isUserSeller = roomMeta?.adminId === session?.user?.id
    const isUserBuyer = roomMeta?.userId === session?.user?.id
    const isUserAdminOrSupport = isAdminOrSupport(session?.user?.role)
    const isProductChat = roomMeta?.productId != null

    const isFromAdmin = resolveMessageFromAdminSide({
      isUserSeller,
      isUserBuyer,
      isUserAdminOrSupport,
      isProductChat,
    })
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
      imageUrl: string | null
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
        imageUrl: string | null
        createdAt: Date
        isFromAdmin: boolean
      }>>`
        INSERT INTO "ChatMessage" ("content", "imageUrl", "chatRoomId", "adminId", "isFromAdmin", "createdAt")
        VALUES (${messageContent}, ${messageImageUrl}, ${chatRoomId}, ${adminId}, true, NOW())
        RETURNING id, content, "imageUrl", "createdAt", "isFromAdmin"
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
        imageUrl: string | null
        createdAt: Date
        isFromAdmin: boolean
      }>>`
        INSERT INTO "ChatMessage" ("content", "imageUrl", "chatRoomId", "userId", "isFromAdmin", "createdAt")
        VALUES (${messageContent}, ${messageImageUrl}, ${chatRoomId}, ${session?.user?.id}, false, NOW())
        RETURNING id, content, "imageUrl", "createdAt", "isFromAdmin"
      `
    }

    const senderSide = isFromAdmin ? 'admin' : 'user'

    const roomUpdates: Promise<unknown>[] = [
      prisma.$executeRaw`
        UPDATE "ChatRoom" 
        SET "updatedAt" = NOW()
        WHERE id = ${chatRoomId}
      `,
      setChatTyping(chatRoomId, senderSide, false),
    ]

    if (isUserAdminOrSupport && !isUserSeller && adminId) {
      roomUpdates.push(
        prisma.$executeRaw`
          UPDATE "ChatRoom"
          SET "adminId" = COALESCE("adminId", ${adminId}),
              status = CASE WHEN status = 'PENDING' THEN 'ACTIVE'::"ChatStatus" ELSE status END,
              "updatedAt" = NOW()
          WHERE id = ${chatRoomId}
            AND "productId" IS NULL
        `,
      )
    }

    await Promise.all(roomUpdates)

    const message = newMessage[0]
    
    // Ensure message has admin details if it's from admin
    const responseMessage: {
      id: number
      content: string
      imageUrl: string | null
      createdAt: string
      isFromAdmin: boolean
      admin_name?: string
      admin_email?: string
      admin_role?: string
    } = {
      id: message.id,
      content: message.content,
      imageUrl: message.imageUrl ?? null,
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
    
    return internalServerErrorResponse('Error sending message:', error)
  }
}

// DELETE - Close live-support chat room (user/guest "end chat")
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
    const guestEmail = request.nextUrl.searchParams.get('guestEmail')

    const chatRoomAccess = await getChatRoomIfAllowed(
      chatRoomId,
      session,
      guestEmail,
    )

    if (!chatRoomAccess) {
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

    const room = await prisma.chatRoom.findUnique({
      where: { id: chatRoomId },
      select: { productId: true, status: true },
    })

    if (!room) {
      return NextResponse.json(
        {
          success: false,
          error: 'Chat room not found or access denied',
          message: 'Chat room not found or access denied',
        },
        { status: 404 },
      )
    }

    if (room.productId != null) {
      return NextResponse.json(
        {
          success: false,
          error: 'Product chats cannot be closed this way',
          message: 'Product chats cannot be closed this way',
        },
        { status: 403 },
      )
    }

    if (room.status !== 'CLOSED') {
      await closeLiveSupportChatRoom(chatRoomId)
    }

    return NextResponse.json({
      success: true,
      message: 'Chat room closed successfully',
      closed: true,
    })

  } catch (error) {
    return internalServerErrorResponse('Error closing chat room:', error)
  }
}
