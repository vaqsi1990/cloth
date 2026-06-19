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

export function liveSupportChatWhereForUser(userId: string) {
  return Prisma.sql`
    (cr."userId" = ${userId}
      AND cr."productId" IS NULL
      AND (
        cr."adminId" IS NULL
        OR EXISTS (
          SELECT 1 FROM "User" staff
          WHERE staff.id = cr."adminId"
            AND staff.role IN ('ADMIN', 'SUPPORT')
        )
      )
    )
  `
}

/** All chats shown under /account → ჩათები (product + live support). */
export function accountChatListWhereForUser(userId: string) {
  return Prisma.sql`
    (${accountProductChatWhereForUser(userId)}
      OR ${liveSupportChatWhereForUser(userId)})
  `
}

/** Live support widget room owned by the user (no product / staff support). */
export function liveSupportChatRoomAccessForUser(userId: string) {
  return Prisma.sql`
    ("userId" = ${userId}
      AND "productId" IS NULL
      AND (
        "adminId" IS NULL
        OR EXISTS (
          SELECT 1 FROM "User" staff
          WHERE staff.id = "ChatRoom"."adminId"
            AND staff.role IN ('ADMIN', 'SUPPORT')
        )
      )
    )
  `
}

/** Product chats in /account or live support widget for the same user. */
export function userChatRoomAccessForUser(userId: string) {
  return Prisma.sql`
    (${accountProductChatRoomAccessForUser(userId)}
      OR ${liveSupportChatRoomAccessForUser(userId)})
  `
}
