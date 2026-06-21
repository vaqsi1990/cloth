import { Session } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { isAdminOrSupport } from '@/lib/roles'

export type ChatRoomAccess = {
  id: number
  userId: string | null
  adminId: string | null
  guestEmail: string | null
}

export async function getChatRoomIfAllowed(
  chatRoomId: number,
  session: Session | null,
  guestEmail?: string | null,
): Promise<ChatRoomAccess | null> {
  if (isAdminOrSupport(session?.user?.role)) {
    const room = await prisma.chatRoom.findUnique({
      where: { id: chatRoomId },
      select: { id: true, userId: true, adminId: true, guestEmail: true },
    })
    return room
  }

  if (session?.user?.id) {
    const room = await prisma.chatRoom.findFirst({
      where: {
        id: chatRoomId,
        OR: [
          {
            userId: { not: null },
            adminId: { not: null },
            AND: [
              {
                OR: [
                  { userId: session.user.id },
                  { adminId: session.user.id },
                ],
              },
              {
                OR: [
                  { productId: { not: null } },
                  { admin: { role: 'USER' } },
                ],
              },
            ],
          },
          {
            userId: session.user.id,
            productId: null,
            OR: [
              { adminId: null },
              { admin: { role: { in: ['ADMIN', 'SUPPORT'] } } },
            ],
          },
        ],
      },
      select: { id: true, userId: true, adminId: true, guestEmail: true },
    })
    return room
  }

  const room = await prisma.chatRoom.findUnique({
    where: { id: chatRoomId },
    select: { id: true, userId: true, adminId: true, guestEmail: true },
  })
  if (!room || room.userId != null) {
    return null
  }
  if (room.guestEmail) {
    const normalizedGuest = guestEmail?.trim().toLowerCase()
    if (
      !normalizedGuest ||
      room.guestEmail.trim().toLowerCase() !== normalizedGuest
    ) {
      return null
    }
  }
  return room
}

/** Admin/support, assigned seller, or product author side */
export function isAdminSide(
  session: Session | null,
  chatRoom: Pick<ChatRoomAccess, 'adminId'>
): boolean {
  if (isAdminOrSupport(session?.user?.role)) return true
  if (session?.user?.id && chatRoom.adminId === session.user.id) return true
  return false
}
