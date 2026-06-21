import type { Session } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { isAdminSide } from '@/lib/chat-access'

type ChatRoomReadMeta = {
  userId: string | null
  adminId: string | null
}

export async function markChatRoomAsRead(
  chatRoomId: number,
  chatRoom: ChatRoomReadMeta,
  session: Session | null,
  viewerIsAdminSide: boolean,
  latestMessageId: number | null,
) {
  const readCursor = latestMessageId ?? 0

  if (viewerIsAdminSide) {
    await prisma.$executeRaw`
      UPDATE "ChatRoom"
      SET "adminLastReadMessageId" = ${readCursor}
      WHERE id = ${chatRoomId}
    `
    return
  }

  if (session?.user?.id && session.user.id === chatRoom.userId) {
    await prisma.$executeRaw`
      UPDATE "ChatRoom"
      SET "userLastReadMessageId" = ${readCursor}
      WHERE id = ${chatRoomId}
    `
    return
  }

  if (!session?.user?.id) {
    await prisma.$executeRaw`
      UPDATE "ChatRoom"
      SET "guestLastReadMessageId" = ${readCursor}
      WHERE id = ${chatRoomId}
    `
  }
}

export function resolveViewerIsAdminSide(
  session: Session | null,
  chatRoom: ChatRoomReadMeta,
): boolean {
  return isAdminSide(session, chatRoom)
}
