import { prisma } from '@/lib/prisma'

export async function getOrCreateProductChatRoom(params: {
  productId: number
  buyerId: string
  sellerId: string
  initialMessage: string
}): Promise<number> {
  const existing = await prisma.chatRoom.findFirst({
    where: {
      userId: params.buyerId,
      adminId: params.sellerId,
      productId: params.productId,
      status: { in: ['PENDING', 'ACTIVE'] },
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  })

  if (existing) {
    await prisma.chatMessage.create({
      data: {
        content: params.initialMessage,
        chatRoomId: existing.id,
        userId: params.buyerId,
        isFromAdmin: false,
      },
    })
    return existing.id
  }

  const room = await prisma.chatRoom.create({
    data: {
      userId: params.buyerId,
      adminId: params.sellerId,
      productId: params.productId,
      status: 'ACTIVE',
      messages: {
        create: {
          content: params.initialMessage,
          userId: params.buyerId,
          isFromAdmin: false,
        },
      },
    },
    select: { id: true },
  })

  return room.id
}
