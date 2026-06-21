import type { NextRequest } from 'next/server'
import { getClientIp } from '@/lib/chat-rate-limit'

type RateLimitEntry = {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

const SEND_CODE_LIMIT = 5
const SIGNUP_ATTEMPT_LIMIT = 10
const WINDOW_MS = 15 * 60 * 1000

function prune(now: number) {
  for (const [key, entry] of store) {
    if (now >= entry.resetAt) store.delete(key)
  }
}

function checkLimit(
  key: string,
  limit: number,
): { allowed: true } | { allowed: false; retryAfterSec: number } {
  const now = Date.now()
  prune(now)

  const entry = store.get(key)
  if (entry && now < entry.resetAt && entry.count >= limit) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    }
  }

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS })
  } else {
    entry.count += 1
  }

  return { allowed: true }
}

export function checkRegistrationCodeSendRateLimit(
  request: NextRequest,
  email: string,
) {
  const ip = getClientIp(request)
  return checkLimit(
    `reg-send:ip:${ip}:email:${email.trim().toLowerCase()}`,
    SEND_CODE_LIMIT,
  )
}

export function checkSignupAttemptRateLimit(
  request: NextRequest,
  email: string,
) {
  const ip = getClientIp(request)
  return checkLimit(
    `reg-signup:ip:${ip}:email:${email.trim().toLowerCase()}`,
    SIGNUP_ATTEMPT_LIMIT,
  )
}
