import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

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
        { error: 'Invalid chat room ID' },
        { status: 400 }
      )
    }

    const session = await getServerSession(authOptions)
    
    // Check if user has access to this chat room
    // Admin users can access any chat room, regular users can only access their own
    let chatRoom
    if (session?.user?.role === 'ADMIN') {
      // Admin can access any chat room
      chatRoom = await prisma.$queryRaw<Array<{ id: number }>>`
        SELECT id FROM "ChatRoom" 
        WHERE id = ${chatRoomId}
        LIMIT 1
      `
    } else {
      // Regular users can only access their own chat rooms
      chatRoom = await prisma.$queryRaw<Array<{ id: number }>>`
        SELECT id FROM "ChatRoom" 
        WHERE id = ${chatRoomId}
        AND ("userId" = ${session?.user?.id} OR "guestEmail" = ${session?.user?.email})
        LIMIT 1
      `
    }

    if (chatRoom.length === 0) {
      return NextResponse.json(
        { error: 'Chat room not found or access denied' },
        { status: 404 }
      )
    }

    const messages = await prisma.$queryRaw<Array<{
      id: number
      content: string
      createdAt: Date
      isFromAdmin: boolean
      user_name?: string
      user_email?: string
      admin_name?: string
      admin_email?: string
    }>>`
      SELECT cm.id, cm.content, cm."createdAt", cm."isFromAdmin",
             u.name as user_name, u.email as user_email,
             a.name as admin_name, a.email as admin_email
      FROM "ChatMessage" cm
      LEFT JOIN "User" u ON cm."userId" = u.id
      LEFT JOIN "User" a ON cm."adminId" = a.id
      WHERE cm."chatRoomId" = ${chatRoomId}
      ORDER BY cm."createdAt" ASC
    `

    return NextResponse.json({
      success: true,
      messages
    })

  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
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
        { error: 'Invalid chat room ID' },
        { status: 400 }
      )
    }

    const session = await getServerSession(authOptions)
    const body = await request.json()
    const validatedData = sendMessageSchema.parse(body)

    // Check if chat room exists and user has access
    // Admin users can access any chat room, regular users can only access their own
    let chatRoom
    if (session?.user?.role === 'ADMIN') {
      // Admin can access any chat room
      chatRoom = await prisma.$queryRaw<Array<{ id: number }>>`
        SELECT id FROM "ChatRoom" 
        WHERE id = ${chatRoomId}
        LIMIT 1
      `
    } else {
      // Regular users can only access their own chat rooms
      chatRoom = await prisma.$queryRaw<Array<{ id: number }>>`
        SELECT id FROM "ChatRoom" 
        WHERE id = ${chatRoomId}
        AND ("userId" = ${session?.user?.id} OR "guestEmail" = ${session?.user?.email})
        LIMIT 1
      `
    }

    if (chatRoom.length === 0) {
      return NextResponse.json(
        { error: 'Chat room not found or access denied' },
        { status: 404 }
      )
    }

    // Determine if message is from admin
    const isFromAdmin = session?.user?.role === 'ADMIN'
    
    let newMessage
    if (isFromAdmin) {
      newMessage = await prisma.$queryRaw<Array<{
        id: number
        content: string
        createdAt: Date
        isFromAdmin: boolean
      }>>`
        INSERT INTO "ChatMessage" ("content", "chatRoomId", "adminId", "isFromAdmin", "createdAt")
        VALUES (${validatedData.content}, ${chatRoomId}, ${session.user.id}, true, NOW())
        RETURNING id, content, "createdAt", "isFromAdmin"
      `
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

    return NextResponse.json({
      success: true,
      message
    })

  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
