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
  session: Session | null
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
        OR: [{ userId: session.user.id }, { adminId: session.user.id }],
      },
      select: { id: true, userId: true, adminId: true, guestEmail: true },
    })
    return room
  }

  const room = await prisma.chatRoom.findUnique({
    where: { id: chatRoomId },
    select: { id: true, userId: true, adminId: true, guestEmail: true },
  })
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
