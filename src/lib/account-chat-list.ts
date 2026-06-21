import { prisma } from '@/lib/prisma'
import { isLiveSupportUnreadForUser, isProductChatUnreadForUser } from '@/lib/chat-unread'
import { accountChatListWhereForUser } from '@/lib/account-product-chat'

export type AccountChatRoomRow = {
  id: number
  createdAt: Date
  updatedAt: Date
  status: string
  userId: string | null
  adminId: string | null
  productId: number | null
  orderId: number | null
  product_name: string | null
  product_image: string | null
  guestName?: string
  guestEmail?: string
  user_name?: string
  user_email?: string
  admin_name?: string
  admin_email?: string
  admin_role?: string | null
  message_count: number
  last_message?: string
  last_message_isFromAdmin?: boolean
  last_message_userId?: string
  last_message_id?: number
  userLastReadMessageId?: number | null
  adminLastReadMessageId?: number | null
}

export type AccountChatRoomSummary = AccountChatRoomRow & {
  chatKind: 'product' | 'live_support'
  is_unread: boolean
  messages: Array<{
    isFromAdmin: boolean
    userId: string | null
    content: string
  }>
}

export function isAccountLiveSupportRoom(
  room: Pick<AccountChatRoomRow, 'productId' | 'adminId' | 'admin_role'>,
): boolean {
  return (
    room.productId == null &&
    (room.adminId == null ||
      room.admin_role === 'ADMIN' ||
      room.admin_role === 'SUPPORT')
  )
}

export function isAccountChatRoomUnread(
  room: AccountChatRoomRow,
  userId: string,
): boolean {
  if (!room.last_message) return false

  const lastMessageIsFromAdmin = room.last_message_isFromAdmin || false
  const isLiveSupport = isAccountLiveSupportRoom(room)

  if (isLiveSupport && room.userId === userId) {
    return isLiveSupportUnreadForUser(
      lastMessageIsFromAdmin,
      room.last_message_id,
      room.userLastReadMessageId,
      room.status,
    )
  }

  return isProductChatUnreadForUser(
    lastMessageIsFromAdmin,
    room.last_message_id,
    room.userId,
    room.adminId,
    userId,
    room.userLastReadMessageId,
    room.adminLastReadMessageId,
    room.status,
  )
}

function transformAccountChatRoom(
  room: AccountChatRoomRow,
  userId: string,
): AccountChatRoomSummary {
  const lastMessageIsFromAdmin = room.last_message_isFromAdmin || false
  const isLiveSupport = isAccountLiveSupportRoom(room)
  const isUnread = isAccountChatRoomUnread(room, userId)

  return {
    ...room,
    chatKind: isLiveSupport ? 'live_support' : 'product',
    product_name: isLiveSupport ? 'საფორთის მხარდაჭერა' : room.product_name,
    is_unread: isUnread,
    messages: room.last_message
      ? [
          {
            isFromAdmin: lastMessageIsFromAdmin,
            userId: room.last_message_userId || null,
            content: room.last_message,
          },
        ]
      : [],
  }
}

export async function fetchAccountChatRooms(
  userId: string,
): Promise<AccountChatRoomSummary[]> {
  const chatRooms = await prisma.$queryRaw<AccountChatRoomRow[]>`
    SELECT cr.id, cr."createdAt", cr."updatedAt", cr.status,
           cr."userId", cr."adminId", cr."productId", cr."orderId",
           cr."userLastReadMessageId", cr."adminLastReadMessageId",
           p.name as product_name,
           (SELECT pi.url FROM "ProductImage" pi WHERE pi."productId" = p.id ORDER BY pi.position ASC LIMIT 1) as product_image,
           cr."guestName", cr."guestEmail",
           u.name as user_name, u.email as user_email,
           a.name as admin_name, a.email as admin_email, a.role as admin_role,
           (SELECT COUNT(*) FROM "ChatMessage" WHERE "chatRoomId" = cr.id)::int as message_count,
           (SELECT CASE
              WHEN TRIM(cm.content) <> '' THEN cm.content
              WHEN cm."imageUrl" IS NOT NULL THEN '📷 ფოტო'
              ELSE cm.content
            END
            FROM "ChatMessage" cm WHERE cm."chatRoomId" = cr.id ORDER BY cm."createdAt" DESC LIMIT 1) as last_message,
           (SELECT "isFromAdmin" FROM "ChatMessage" WHERE "chatRoomId" = cr.id ORDER BY "createdAt" DESC LIMIT 1) as last_message_isFromAdmin,
           (SELECT "userId" FROM "ChatMessage" WHERE "chatRoomId" = cr.id ORDER BY "createdAt" DESC LIMIT 1) as last_message_userId,
           (SELECT id FROM "ChatMessage" WHERE "chatRoomId" = cr.id ORDER BY "createdAt" DESC LIMIT 1) as last_message_id
    FROM "ChatRoom" cr
    LEFT JOIN "User" u ON cr."userId" = u.id
    LEFT JOIN "User" a ON cr."adminId" = a.id
    LEFT JOIN "Product" p ON cr."productId" = p.id
    WHERE ${accountChatListWhereForUser(userId)}
      AND cr.status IN ('PENDING', 'ACTIVE')
    ORDER BY last_message_id DESC NULLS LAST, cr.id DESC
  `

  return chatRooms.map((room) => transformAccountChatRoom(room, userId))
}

export async function getAccountChatUnreadSummary(userId: string) {
  const chatRooms = await fetchAccountChatRooms(userId)
  const unreadRooms = chatRooms.filter((room) => room.is_unread)
  const liveSupportUnreadRooms = unreadRooms.filter(
    (room) => room.chatKind === 'live_support',
  )
  const unreadCount = unreadRooms.length
  const liveSupportUnreadCount = liveSupportUnreadRooms.length
  const productChatUnreadCount = Math.max(0, unreadCount - liveSupportUnreadCount)

  const latestLiveSupportRoom =
    chatRooms.find((room) => room.chatKind === 'live_support') ?? null

  return {
    unreadCount,
    liveSupportUnreadCount,
    productChatUnreadCount,
    liveSupportChatRoomId: latestLiveSupportRoom?.id ?? null,
    chatRooms,
  }
}
