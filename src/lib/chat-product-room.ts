import { prisma } from '@/lib/prisma'

type ProductChatThreadKey = {
  buyerId: string
  sellerId: string
  productId: number
  orderId?: number | null
}

function threadWhere(key: ProductChatThreadKey) {
  return {
    userId: key.buyerId,
    adminId: key.sellerId,
    productId: key.productId,
    orderId: key.orderId ?? null,
  } as const
}

/** Remove closed archives so a new conversation starts fresh. */
export async function removeClosedProductChatThreads(
  key: ProductChatThreadKey,
) {
  const closedRooms = await prisma.chatRoom.findMany({
    where: {
      ...threadWhere(key),
      status: 'CLOSED',
    },
    select: { id: true },
  })

  if (closedRooms.length === 0) return

  const roomIds = closedRooms.map((room) => room.id)
  await prisma.chatMessage.deleteMany({
    where: { chatRoomId: { in: roomIds } },
  })
  await prisma.chatRoom.deleteMany({
    where: { id: { in: roomIds } },
  })
}

export async function findActiveProductChatRoom(key: ProductChatThreadKey) {
  return prisma.chatRoom.findFirst({
    where: {
      ...threadWhere(key),
      status: { in: ['PENDING', 'ACTIVE'] },
    },
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    select: { id: true },
  })
}

export async function getOrCreateProductChatRoom(
  key: ProductChatThreadKey & {
    initialMessage: string
    addMessageIfExists?: boolean
  },
): Promise<{ chatRoomId: number; created: boolean }> {
  await removeClosedProductChatThreads(key)

  const existing = await findActiveProductChatRoom(key)

  if (existing) {
    if (key.addMessageIfExists && key.initialMessage.trim()) {
      await prisma.chatMessage.create({
        data: {
          content: key.initialMessage.trim(),
          chatRoomId: existing.id,
          userId: key.buyerId,
          isFromAdmin: false,
        },
      })
      await prisma.chatRoom.update({
        where: { id: existing.id },
        data: { status: 'ACTIVE', updatedAt: new Date() },
      })
    }

    return { chatRoomId: existing.id, created: false }
  }

  const room = await prisma.chatRoom.create({
    data: {
      ...threadWhere(key),
      status: 'ACTIVE',
      messages: {
        create: {
          content: key.initialMessage.trim(),
          userId: key.buyerId,
          isFromAdmin: false,
        },
      },
    },
    select: { id: true },
  })

  return { chatRoomId: room.id, created: true }
}
