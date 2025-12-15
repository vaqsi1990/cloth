import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST - Create or get chat room with product author
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params
    const productIdNum = parseInt(productId)
    
    if (isNaN(productIdNum)) {
      return NextResponse.json(
        { success: false, error: 'Invalid product ID' },
        { status: 400 }
      )
    }

    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get product and its author
    const product = await prisma.product.findUnique({
      where: { id: productIdNum },
      select: {
        id: true,
        name: true,
        userId: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    if (!product.userId || !product.user) {
      return NextResponse.json(
        { success: false, error: 'Product author not found' },
        { status: 404 }
      )
    }

    // Don't allow users to chat with themselves
    if (session.user.id === product.userId) {
      return NextResponse.json(
        { success: false, error: 'Cannot chat with yourself' },
        { status: 400 }
      )
    }

    const buyerId = session.user.id
    const sellerId = product.userId

    // Check if chat room already exists between buyer and seller for this product
    // We'll use adminId field to store sellerId (since it's a User relation)
    const existingChatRoom = await prisma.$queryRaw<Array<{
      id: number
      userId: string
      adminId: string
    }>>`
      SELECT id, "userId", "adminId"
      FROM "ChatRoom"
      WHERE "userId" = ${buyerId}
      AND "adminId" = ${sellerId}
      AND status IN ('PENDING', 'ACTIVE')
      ORDER BY "createdAt" DESC
      LIMIT 1
    `

    if (existingChatRoom.length > 0) {
      // Return existing chat room
      return NextResponse.json({
        success: true,
        chatRoomId: existingChatRoom[0].id,
        message: 'Chat room already exists'
      })
    }

    // Create new chat room
    // Using adminId to store sellerId (product author)
    const newRoom = await prisma.$queryRaw<Array<{ id: number }>>`
      INSERT INTO "ChatRoom" ("userId", "adminId", status, "createdAt", "updatedAt")
      VALUES (${buyerId}, ${sellerId}, 'ACTIVE', NOW(), NOW())
      RETURNING id
    `

    const roomId = newRoom[0].id

    // Create initial message
    await prisma.$executeRaw`
      INSERT INTO "ChatMessage" ("content", "chatRoomId", "userId", "isFromAdmin", "createdAt")
      VALUES (${`გამარჯობა! მაინტერესებს პროდუქტი: ${product.name}`}, ${roomId}, ${buyerId}, false, NOW())
    `

    return NextResponse.json({
      success: true,
      chatRoomId: roomId,
      message: 'Chat room created successfully'
    })

  } catch (error) {
    console.error('Error creating product author chat:', error)
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
