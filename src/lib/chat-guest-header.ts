/** Guest live-support auth — pass email in header, not URL query string. */
export const GUEST_CHAT_EMAIL_HEADER = 'x-guest-email'

export function guestChatEmailHeaders(
  guestEmail?: string | null,
): Record<string, string> {
  const headers: Record<string, string> = {}
  const normalized = guestEmail?.trim()
  if (normalized) {
    headers[GUEST_CHAT_EMAIL_HEADER] = normalized
  }
  return headers
}
