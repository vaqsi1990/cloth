import type { NextRequest } from 'next/server'

type RateLimitEntry = {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

const GUEST_CHAT_CREATE_LIMIT = 15
const GUEST_CHAT_CREATE_WINDOW_MS = 60 * 60 * 1000

function pruneExpiredEntries(now: number) {
  for (const [key, entry] of store) {
    if (now >= entry.resetAt) {
      store.delete(key)
    }
  }
}

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown'
  }
  return request.headers.get('x-real-ip')?.trim() || 'unknown'
}

export function checkGuestChatCreateRateLimit(
  ip: string,
  guestEmail: string,
): { allowed: true } | { allowed: false; retryAfterSec: number } {
  const now = Date.now()
  pruneExpiredEntries(now)

  const keys = [
    `guest-chat:ip:${ip}`,
    `guest-chat:email:${guestEmail.trim().toLowerCase()}`,
  ]

  for (const key of keys) {
    const entry = store.get(key)
    if (entry && now < entry.resetAt && entry.count >= GUEST_CHAT_CREATE_LIMIT) {
      return {
        allowed: false,
        retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
      }
    }
  }

  for (const key of keys) {
    const entry = store.get(key)
    if (!entry || now >= entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + GUEST_CHAT_CREATE_WINDOW_MS })
    } else {
      entry.count += 1
    }
  }

  return { allowed: true }
}
