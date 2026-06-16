import { Prisma } from '@prisma/client'

/**
 * Buyer ↔ seller chats for /account.
 * Product chats (productId set): any seller role.
 * Legacy non-product rows: seller (adminId) must be a regular USER (excludes staff support rooms).
 */
export function accountProductChatWhereForUser(userId: string) {
  return Prisma.sql`
    (cr."userId" = ${userId} OR cr."adminId" = ${userId})
    AND cr."userId" IS NOT NULL
    AND cr."adminId" IS NOT NULL
    AND (cr."productId" IS NOT NULL OR a.role = 'USER')
  `
}

/** Access check for a single chat room row (no table alias). */
export function accountProductChatRoomAccessForUser(userId: string) {
  return Prisma.sql`
    ("userId" = ${userId} OR "adminId" = ${userId})
    AND "userId" IS NOT NULL
    AND "adminId" IS NOT NULL
    AND (
      "productId" IS NOT NULL
      OR EXISTS (
        SELECT 1 FROM "User" seller
        WHERE seller.id = "ChatRoom"."adminId"
          AND seller.role = 'USER'
      )
    )
  `
}
