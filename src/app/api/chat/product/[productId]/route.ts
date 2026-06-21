import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getOrCreateProductChatRoom } from '@/lib/chat-product-room'
import { internalServerErrorResponse } from '@/lib/api-error'

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

    const { chatRoomId, created } = await getOrCreateProductChatRoom({
      buyerId,
      sellerId,
      productId: productIdNum,
      initialMessage: customMessage,
      addMessageIfExists:
        typeof body?.message === 'string' && body.message.trim().length > 0,
    })

    return NextResponse.json({
      success: true,
      chatRoomId,
      created,
      message: created ? 'Chat room created successfully' : 'Chat room already exists',
    })

  } catch (error) {
    return internalServerErrorResponse('Error creating product author chat:', error)
  }
}
