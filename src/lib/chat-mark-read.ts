import type { Session } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { isAdminSide } from '@/lib/chat-access'
import { isAdminOrSupport } from '@/lib/roles'

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
  const data: {
    userLastReadMessageId?: number
    adminLastReadMessageId?: number
    guestLastReadMessageId?: number
  } = {}

  if (isAdminOrSupport(session?.user?.role) || viewerIsAdminSide) {
    data.adminLastReadMessageId = readCursor
  } else if (session?.user?.id && session.user.id === chatRoom.userId) {
    data.userLastReadMessageId = readCursor
  } else if (session?.user?.id && session.user.id === chatRoom.adminId) {
    data.adminLastReadMessageId = readCursor
  } else if (!session?.user?.id) {
    data.guestLastReadMessageId = readCursor
  } else {
    return
  }

  await prisma.chatRoom.update({
    where: { id: chatRoomId },
    data,
  })
}

export function resolveViewerIsAdminSide(
  session: Session | null,
  chatRoom: ChatRoomReadMeta,
): boolean {
  return isAdminSide(session, chatRoom)
}
