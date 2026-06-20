'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Analytics } from '@vercel/analytics/react'
import { isCookieCategoryAllowed } from '@/utils/cookieConsent'

const VISITOR_ID_KEY = 'dressla_analytics_visitor_id'

function getOrCreateVisitorId(): string {
  const existing = localStorage.getItem(VISITOR_ID_KEY)
  if (existing) return existing

  const id = crypto.randomUUID()
  localStorage.setItem(VISITOR_ID_KEY, id)
  return id
}

export default function SiteAnalytics() {
  const pathname = usePathname()
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false)
  const lastTrackedPathRef = useRef<string | null>(null)

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
    if (!analyticsEnabled || !pathname) return
    if (lastTrackedPathRef.current === pathname) return

    lastTrackedPathRef.current = pathname
    const visitorId = getOrCreateVisitorId()

    void fetch('/api/analytics/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pathname, visitorId }),
      keepalive: true,
    }).catch(() => {
      lastTrackedPathRef.current = null
    })
  }, [analyticsEnabled, pathname])

  if (!analyticsEnabled) return null

  return <Analytics />
}
