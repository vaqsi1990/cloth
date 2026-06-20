'use client'

import { useEffect, useState } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { isCookieCategoryAllowed } from '@/utils/cookieConsent'

const VISIT_SESSION_KEY = 'dressla_visit_recorded'

export default function SiteAnalytics() {
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false)

  useEffect(() => {
    const syncConsent = () => {
      setAnalyticsEnabled(isCookieCategoryAllowed('analytics'))
    }

    syncConsent()

    const onStorage = (event: StorageEvent) => {
      if (event.key === 'dressla_cookie_consent') {
        syncConsent()
      }
    }

    window.addEventListener('storage', onStorage)
    window.addEventListener('dressla-cookie-consent-changed', syncConsent)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('dressla-cookie-consent-changed', syncConsent)
    }
  }, [])

  useEffect(() => {
    if (!analyticsEnabled) return
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem(VISIT_SESSION_KEY)) return

    sessionStorage.setItem(VISIT_SESSION_KEY, '1')

    void fetch('/api/analytics/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: window.location.pathname }),
      keepalive: true,
    }).catch(() => {
      sessionStorage.removeItem(VISIT_SESSION_KEY)
    })
  }, [analyticsEnabled])

  if (!analyticsEnabled) return null

  return <Analytics />
}
