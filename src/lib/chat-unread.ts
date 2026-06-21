/** Whether an outgoing message belongs to the seller/staff side of the room. */
export function resolveMessageFromAdminSide(params: {
  isUserSeller: boolean
  isUserBuyer: boolean
  isUserAdminOrSupport: boolean
  isProductChat: boolean
}): boolean {
  if (params.isProductChat) {
    return params.isUserSeller
  }

  if (params.isUserBuyer) {
    return false
  }

  return params.isUserAdminOrSupport || params.isUserSeller
}

/** Product chat rows: derive seller-side from sender ids (handles legacy mis-tagged admin buyer messages). */
export function isProductChatMessageFromSeller(
  lastMessageIsFromAdmin: boolean,
  lastMessageUserId: string | null | undefined,
  lastMessageAdminId: string | null | undefined,
  roomUserId: string | null | undefined,
  roomAdminId: string | null | undefined,
): boolean {
  if (lastMessageAdminId && roomAdminId && lastMessageAdminId === roomAdminId) {
    return true
  }

  if (lastMessageUserId && roomUserId && lastMessageUserId === roomUserId) {
    return false
  }

  if (lastMessageAdminId && roomUserId && lastMessageAdminId === roomUserId) {
    return false
  }

  return lastMessageIsFromAdmin
}

/** Product chat (buyer ↔ seller): unread when the last message is from the other side and not yet read. */
function toMessageId(value: number | bigint | null | undefined): number | null {
  if (value == null) return null
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : null
}

export function isProductChatUnreadForUser(
  lastMessageIsFromAdmin: boolean,
  lastMessageId: number | bigint | null | undefined,
  roomUserId: string | null | undefined,
  roomAdminId: string | null | undefined,
  currentUserId: string,
  userLastReadMessageId: number | bigint | null | undefined,
  adminLastReadMessageId: number | bigint | null | undefined,
  status?: string,
): boolean {
  if (status && status !== 'PENDING' && status !== 'ACTIVE') {
    return false
  }

  const lastId = toMessageId(lastMessageId)
  if (lastId == null) return false

  if (roomUserId === currentUserId) {
    if (!lastMessageIsFromAdmin) return false
    const readId = toMessageId(userLastReadMessageId)
    return readId == null || lastId > readId
  }

  if (roomAdminId === currentUserId) {
    if (lastMessageIsFromAdmin) return false
    const readId = toMessageId(adminLastReadMessageId)
    return readId == null || lastId > readId
  }

  return false
}

/** Live support chat (admin/support inbox): unread when the last message is from the user/guest and not yet read. */
export function isStaffChatRoomUnread(
  status: string,
  lastMessageIsFromAdmin: boolean,
  lastMessageId: number | bigint | null | undefined,
  adminLastReadMessageId: number | bigint | null | undefined,
): boolean {
  if (status !== 'PENDING' && status !== 'ACTIVE') {
    return false
  }

  const lastId = toMessageId(lastMessageId)
  if (lastId == null || lastMessageIsFromAdmin) {
    return false
  }

  const readId = toMessageId(adminLastReadMessageId)
  return readId == null || lastId > readId
}

/** Live support widget for logged-in user: unread when admin replied and user has not read yet. */
export function isLiveSupportUnreadForUser(
  lastMessageIsFromAdmin: boolean,
  lastMessageId: number | bigint | null | undefined,
  userLastReadMessageId: number | bigint | null | undefined,
  status?: string,
): boolean {
  if (status && status !== 'PENDING' && status !== 'ACTIVE') {
    return false
  }

  const lastId = toMessageId(lastMessageId)
  if (lastId == null || !lastMessageIsFromAdmin) return false

  const readId = toMessageId(userLastReadMessageId)
  return readId == null || lastId > readId
}
