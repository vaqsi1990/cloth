import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST - Create or get chat room for a specific order (separate thread per order)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    const { orderId: orderIdParam } = await params
    const orderId = parseInt(orderIdParam, 10)

    if (isNaN(orderId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid order ID' },
        { status: 400 },
      )
    }

    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 },
      )
    }

    const body = await request.json().catch(() => ({}))
    const productIdFromBody =
      typeof body?.productId === 'number'
        ? body.productId
        : typeof body?.productId === 'string'
          ? parseInt(body.productId, 10)
          : NaN

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: session.user.id,
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                userId: true,
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 },
      )
    }

    if (!order.items.length) {
      return NextResponse.json(
        { success: false, error: 'Order has no items' },
        { status: 404 },
      )
    }

    const orderItem = !isNaN(productIdFromBody)
      ? order.items.find(
          (item) =>
            item.productId === productIdFromBody ||
            item.product?.id === productIdFromBody,
        )
      : order.items[0]

    if (!orderItem) {
      return NextResponse.json(
        { success: false, error: 'Product not found in order' },
        { status: 404 },
      )
    }

    const productId = orderItem.productId ?? orderItem.product?.id ?? null
    const sellerId =
      orderItem.product?.userId ?? orderItem.product?.user?.id ?? null
    const productName =
      orderItem.product?.name ?? orderItem.productName ?? 'პროდუქტი'

    if (!productId || !sellerId) {
      return NextResponse.json(
        { success: false, error: 'Product author not found' },
        { status: 404 },
      )
    }

    if (session.user.id === sellerId) {
      return NextResponse.json(
        { success: false, error: 'Cannot chat with yourself' },
        { status: 400 },
      )
    }

    const customMessage =
      typeof body?.message === 'string' && body.message.trim()
        ? body.message.trim()
        : `გამარჯობა! მაქვს შეკვეთა #${orderId} პროდუქტზე „${productName}".`

    const existingChatRoom = await prisma.chatRoom.findFirst({
      where: {
        userId: session.user.id,
        adminId: sellerId,
        productId,
        orderId,
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
          userId: session.user.id,
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
        userId: session.user.id,
        adminId: sellerId,
        productId,
        orderId,
        status: 'ACTIVE',
        messages: {
          create: {
            content: customMessage,
            userId: session.user.id,
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
    console.error('Error creating order chat:', error)
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
