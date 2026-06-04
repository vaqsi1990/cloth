import { prisma } from '@/lib/prisma'

export const CHAT_TYPING_TTL_MS = 4000

export function isTypingActive(at: Date | null | undefined): boolean {
  if (!at) return false
  return at.getTime() > Date.now()
}

export async function setChatTyping(
  chatRoomId: number,
  side: 'user' | 'admin',
  active: boolean
): Promise<void> {
  const until = active ? new Date(Date.now() + CHAT_TYPING_TTL_MS) : null
  if (side === 'user') {
    await prisma.$executeRaw`
      UPDATE "ChatRoom"
      SET "userTypingAt" = ${until}
      WHERE id = ${chatRoomId}
    `
  } else {
    await prisma.$executeRaw`
      UPDATE "ChatRoom"
      SET "adminTypingAt" = ${until}
      WHERE id = ${chatRoomId}
    `
  }
}

export function getOtherPartyTyping(
  room: {
    userTypingAt: Date | null
    adminTypingAt: Date | null
  },
  viewerIsAdminSide: boolean
): boolean {
  const at = viewerIsAdminSide ? room.userTypingAt : room.adminTypingAt
  return isTypingActive(at)
}

export function getTypingLabel(viewerIsAdminSide: boolean): string {
  return viewerIsAdminSide
    ? 'მომხმარებელი ბეჭდავს...'
    : 'საფორთი ან ადმინი ბეჭდავს...'
}
