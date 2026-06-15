import { Prisma } from '@prisma/client'

/**
 * Buyer ↔ seller product chats for /account (includes legacy rows without productId).
 * Excludes site support / contact-widget rooms (adminId null or staff role).
 */
export function accountProductChatWhereForUser(userId: string) {
  return Prisma.sql`
    (cr."userId" = ${userId} OR cr."adminId" = ${userId})
    AND cr."userId" IS NOT NULL
    AND cr."adminId" IS NOT NULL
    AND a.role = 'USER'
  `
}

/** Access check for a single chat room row (no table alias). */
export function accountProductChatRoomAccessForUser(userId: string) {
  return Prisma.sql`
    ("userId" = ${userId} OR "adminId" = ${userId})
    AND "userId" IS NOT NULL
    AND "adminId" IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM "User" seller
      WHERE seller.id = "ChatRoom"."adminId"
        AND seller.role = 'USER'
    )
  `
}
