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
    const body = await request.json().catch(() => ({}))
    const customMessage =
      typeof body?.message === 'string' && body.message.trim()
        ? body.message.trim()
        : `გამარჯობა! მაინტერესებს პროდუქტი: ${product.name}`

    const existingChatRoom = await prisma.chatRoom.findFirst({
      where: {
        userId: buyerId,
        adminId: sellerId,
        productId: productIdNum,
        status: { in: ['PENDING', 'ACTIVE'] },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    })

    if (existingChatRoom) {
      await prisma.chatMessage.create({
        data: {
          content: customMessage,
          chatRoomId: existingChatRoom.id,
          userId: buyerId,
          isFromAdmin: false,
        },
      })
      return NextResponse.json({
        success: true,
        chatRoomId: existingChatRoom.id,
        message: 'Chat room already exists',
      })
    }

    const room = await prisma.chatRoom.create({
      data: {
        userId: buyerId,
        adminId: sellerId,
        productId: productIdNum,
        status: 'ACTIVE',
        messages: {
          create: {
            content: customMessage,
            userId: buyerId,
            isFromAdmin: false,
          },
        },
      },
      select: { id: true },
    })

    return NextResponse.json({
      success: true,
      chatRoomId: room.id,
      message: 'Chat room created successfully',
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
