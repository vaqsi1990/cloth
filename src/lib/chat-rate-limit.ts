import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

type RateLimitEntry = {
  count: number
  resetAt: number
}

const memoryStore = new Map<string, RateLimitEntry>()

const GUEST_CHAT_CREATE_LIMIT = 15
const GUEST_CHAT_CREATE_WINDOW_MS = 60 * 60 * 1000

type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSec: number }

function pruneMemoryEntries(now: number) {
  for (const [key, entry] of memoryStore) {
    if (now >= entry.resetAt) {
      memoryStore.delete(key)
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

function checkGuestChatCreateRateLimitMemory(
  ip: string,
  guestEmail: string,
): RateLimitResult {
  const now = Date.now()
  pruneMemoryEntries(now)

  const keys = [
    `guest-chat:ip:${ip}`,
    `guest-chat:email:${guestEmail.trim().toLowerCase()}`,
  ]

  for (const key of keys) {
    const entry = memoryStore.get(key)
    if (entry && now < entry.resetAt && entry.count >= GUEST_CHAT_CREATE_LIMIT) {
      return {
        allowed: false,
        retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
      }
    }
  }

  for (const key of keys) {
    const entry = memoryStore.get(key)
    if (!entry || now >= entry.resetAt) {
      memoryStore.set(key, { count: 1, resetAt: now + GUEST_CHAT_CREATE_WINDOW_MS })
    } else {
      entry.count += 1
    }
  }

  return { allowed: true }
}

async function checkGuestChatCreateRateLimitDb(
  ip: string,
  guestEmail: string,
): Promise<RateLimitResult> {
  const keys = [
    `guest-chat:ip:${ip}`,
    `guest-chat:email:${guestEmail.trim().toLowerCase()}`,
  ]
  const now = new Date()
  const resetAt = new Date(now.getTime() + GUEST_CHAT_CREATE_WINDOW_MS)

  return prisma.$transaction(async (tx) => {
    for (const bucketKey of keys) {
      const bucket = await tx.apiRateLimitBucket.findUnique({
        where: { bucketKey },
      })

      if (
        bucket &&
        bucket.resetAt > now &&
        bucket.count >= GUEST_CHAT_CREATE_LIMIT
      ) {
        return {
          allowed: false as const,
          retryAfterSec: Math.max(
            1,
            Math.ceil((bucket.resetAt.getTime() - now.getTime()) / 1000),
          ),
        }
      }
    }

    for (const bucketKey of keys) {
      const bucket = await tx.apiRateLimitBucket.findUnique({
        where: { bucketKey },
      })

      if (!bucket || bucket.resetAt <= now) {
        await tx.apiRateLimitBucket.upsert({
          where: { bucketKey },
          create: { bucketKey, count: 1, resetAt },
          update: { count: 1, resetAt },
        })
      } else {
        await tx.apiRateLimitBucket.update({
          where: { bucketKey },
          data: { count: { increment: 1 } },
        })
      }
    }

    return { allowed: true as const }
  })
}

export async function checkGuestChatCreateRateLimit(
  ip: string,
  guestEmail: string,
): Promise<RateLimitResult> {
  try {
    return await checkGuestChatCreateRateLimitDb(ip, guestEmail)
  } catch (error) {
    console.error('Guest chat rate limit DB check failed, using memory fallback:', error)
    return checkGuestChatCreateRateLimitMemory(ip, guestEmail)
  }
}
