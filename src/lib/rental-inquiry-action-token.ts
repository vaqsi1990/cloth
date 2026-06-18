import { createHmac, timingSafeEqual } from 'crypto'
import { getSiteUrl } from '@/lib/site-url'

export const INQUIRY_EMAIL_ACTION_MINUTES = 30

export type RentalInquiryEmailAction = 'approve' | 'reject'

type ActionTokenPayload = {
  inquiryId: number
  sellerId: string
  action: RentalInquiryEmailAction
  exp: number
}

function getTokenSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET || process.env.RENTAL_INQUIRY_ACTION_SECRET
  if (!secret) {
    throw new Error('NEXTAUTH_SECRET is required for rental inquiry email actions')
  }
  return secret
}

function signPayload(payload: ActionTokenPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = createHmac('sha256', getTokenSecret()).update(data).digest('base64url')
  return `${data}.${sig}`
}

export function createRentalInquiryActionToken(
  inquiryId: number,
  sellerId: string,
  action: RentalInquiryEmailAction,
  from = new Date(),
): string {
  const exp = from.getTime() + INQUIRY_EMAIL_ACTION_MINUTES * 60 * 1000
  return signPayload({ inquiryId, sellerId, action, exp })
}

export function verifyRentalInquiryActionToken(
  token: string,
): ActionTokenPayload | null {
  const parts = token.split('.')
  if (parts.length !== 2) return null

  const [data, sig] = parts
  if (!data || !sig) return null

  try {
    const expected = createHmac('sha256', getTokenSecret()).update(data).digest('base64url')
    const sigBuf = Buffer.from(sig)
    const expectedBuf = Buffer.from(expected)
    if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
      return null
    }

    const payload = JSON.parse(
      Buffer.from(data, 'base64url').toString('utf8'),
    ) as ActionTokenPayload

    if (
      !payload.inquiryId ||
      !payload.sellerId ||
      (payload.action !== 'approve' && payload.action !== 'reject') ||
      !payload.exp
    ) {
      return null
    }

    if (Date.now() > payload.exp) {
      return null
    }

    return payload
  } catch {
    return null
  }
}

/** Returns payload even when expired — for clearer error messages. */
export function decodeRentalInquiryActionToken(
  token: string,
): { payload: ActionTokenPayload; expired: boolean } | null {
  const parts = token.split('.')
  if (parts.length !== 2) return null

  const [data, sig] = parts
  if (!data || !sig) return null

  try {
    const expected = createHmac('sha256', getTokenSecret()).update(data).digest('base64url')
    const sigBuf = Buffer.from(sig)
    const expectedBuf = Buffer.from(expected)
    if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
      return null
    }

    const payload = JSON.parse(
      Buffer.from(data, 'base64url').toString('utf8'),
    ) as ActionTokenPayload

    if (
      !payload.inquiryId ||
      !payload.sellerId ||
      (payload.action !== 'approve' && payload.action !== 'reject') ||
      !payload.exp
    ) {
      return null
    }

    return { payload, expired: Date.now() > payload.exp }
  } catch {
    return null
  }
}

export function buildRentalInquiryActionUrl(
  inquiryId: number,
  sellerId: string,
  action: RentalInquiryEmailAction,
): string {
  const token = createRentalInquiryActionToken(inquiryId, sellerId, action)
  return `${getSiteUrl()}/rental-inquiry/action?token=${encodeURIComponent(token)}`
}
