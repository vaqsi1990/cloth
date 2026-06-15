/** Product chat (buyer ↔ seller): unread when the last message is from the other side. */
export function isProductChatUnreadForUser(
  lastMessageIsFromAdmin: boolean,
  roomUserId: string | null | undefined,
  roomAdminId: string | null | undefined,
  currentUserId: string,
): boolean {
  if (roomUserId === currentUserId) {
    return lastMessageIsFromAdmin
  }
  if (roomAdminId === currentUserId) {
    return !lastMessageIsFromAdmin
  }
  return false
}

/** Live support chat (admin/support inbox): unread when pending or last message is from user. */
export function isStaffChatRoomUnread(
  status: string,
  lastMessageIsFromAdmin: boolean,
): boolean {
  if (status === 'PENDING') return true
  if (status === 'ACTIVE' && !lastMessageIsFromAdmin) return true
  return false
}
