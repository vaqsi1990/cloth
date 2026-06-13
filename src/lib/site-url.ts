export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
  if (explicit) return explicit

  const nextAuth = process.env.NEXTAUTH_URL?.replace(/\/$/, '')
  if (process.env.NODE_ENV === 'development' && nextAuth) {
    return nextAuth
  }

  return 'https://www.dressla.ge'
}

/** BOG requires a public HTTPS callback; keep production URL in local dev. */
export function getBogCallbackUrl(): string {
  const production = process.env.BOG_CALLBACK_URL?.replace(/\/$/, '')
  if (production) return production
  return 'https://www.dressla.ge/api/payment-callback'
}
