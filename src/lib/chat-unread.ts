/** Product chat (buyer ↔ seller): unread when the last message is from the other side and not yet read. */
export function isProductChatUnreadForUser(
  lastMessageIsFromAdmin: boolean,
  lastMessageId: number | null | undefined,
  roomUserId: string | null | undefined,
  roomAdminId: string | null | undefined,
  currentUserId: string,
  userLastReadMessageId: number | null | undefined,
  adminLastReadMessageId: number | null | undefined,
): boolean {
  if (!lastMessageId) return false

  if (roomUserId === currentUserId) {
    if (!lastMessageIsFromAdmin) return false
    return (
      userLastReadMessageId == null || lastMessageId > userLastReadMessageId
    )
  }

  if (roomAdminId === currentUserId) {
    if (lastMessageIsFromAdmin) return false
    return (
      adminLastReadMessageId == null || lastMessageId > adminLastReadMessageId
    )
  }

  return false
}

/** Live support chat (admin/support inbox): unread until staff opens the room or new user messages arrive. */
export function isStaffChatRoomUnread(
  status: string,
  lastMessageIsFromAdmin: boolean,
  lastMessageId: number | null | undefined,
  adminLastReadMessageId: number | null | undefined,
): boolean {
  if (status === 'PENDING') {
    if (adminLastReadMessageId == null) return true
    if (!lastMessageId) return false
    if (lastMessageIsFromAdmin) return false
    return lastMessageId > adminLastReadMessageId
  }

  if (status === 'ACTIVE' && !lastMessageIsFromAdmin && lastMessageId) {
    return (
      adminLastReadMessageId == null || lastMessageId > adminLastReadMessageId
    )
  }

  return false
}

/** Live support widget for logged-in user: unread when admin replied and user has not read yet. */
export function isLiveSupportUnreadForUser(
  lastMessageIsFromAdmin: boolean,
  lastMessageId: number | null | undefined,
  userLastReadMessageId: number | null | undefined,
): boolean {
  if (!lastMessageId || !lastMessageIsFromAdmin) return false
  return userLastReadMessageId == null || lastMessageId > userLastReadMessageId
}
