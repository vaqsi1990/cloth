import { prisma } from '@/lib/prisma'

async function deleteLiveSupportRooms(roomIds: number[]) {
  if (roomIds.length === 0) return

  await prisma.chatMessage.deleteMany({
    where: { chatRoomId: { in: roomIds } },
  })
  await prisma.chatRoom.deleteMany({
    where: { id: { in: roomIds } },
  })
}

/** Drop closed live-support archives before the user starts a fresh conversation. */
export async function removeClosedLiveSupportRoomsForUser(userId: string) {
  const closedRooms = await prisma.chatRoom.findMany({
    where: {
      userId,
      productId: null,
      status: 'CLOSED',
    },
    select: { id: true },
  })

  await deleteLiveSupportRooms(closedRooms.map((room) => room.id))
}

export async function removeClosedLiveSupportRoomsForGuest(guestEmail: string) {
  const normalized = guestEmail.trim()
  if (!normalized) return

  const closedRooms = await prisma.chatRoom.findMany({
    where: {
      userId: null,
      productId: null,
      status: 'CLOSED',
      guestEmail: { equals: normalized, mode: 'insensitive' },
    },
    select: { id: true },
  })

  await deleteLiveSupportRooms(closedRooms.map((room) => room.id))
}

export async function deleteLiveSupportChatRoom(chatRoomId: number) {
  await prisma.chatMessage.deleteMany({
    where: { chatRoomId },
  })
  await prisma.chatRoom.delete({
    where: { id: chatRoomId },
  })
}
