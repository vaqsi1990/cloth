import type { NextRequest } from 'next/server'
import { GUEST_CHAT_EMAIL_HEADER } from '@/lib/chat-guest-header'

export function resolveGuestEmailFromRequest(
  request: NextRequest,
  bodyValue?: string | null,
): string | null {
  const headerValue = request.headers.get(GUEST_CHAT_EMAIL_HEADER)
  if (headerValue?.trim()) return headerValue.trim()
  if (bodyValue?.trim()) return bodyValue.trim()
  return null
}
