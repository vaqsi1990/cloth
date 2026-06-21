'use client'

import { useCallback, useEffect, useState } from 'react'

const POLL_INTERVAL_MS = 5000

export function useUserChatUnreadCount(enabled: boolean) {
  const [unreadCount, setUnreadCount] = useState(0)

  const refresh = useCallback(async () => {
    if (!enabled) return

    try {
      const response = await fetch('/api/chat/unread-count', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      })

      if (!response.ok) return

      const data = await response.json()
      if (data.success) {
        const count = Number(data.unreadCount)
        setUnreadCount(Number.isFinite(count) ? count : 0)
      }
    } catch (error) {
      console.error('Error fetching user chat unread count:', error)
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) {
      setUnreadCount(0)
      return
    }

    void refresh()
    const interval = setInterval(() => {
      void refresh()
    }, POLL_INTERVAL_MS)

    const onFocus = () => {
      void refresh()
    }
    window.addEventListener('focus', onFocus)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [enabled, refresh])

  return { unreadCount, refresh }
}
