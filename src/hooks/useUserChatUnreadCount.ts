'use client'

import { useCallback, useEffect, useState } from 'react'

const POLL_INTERVAL_MS = 10000

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
        setUnreadCount(data.unreadCount || 0)
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

    return () => clearInterval(interval)
  }, [enabled, refresh])

  return { unreadCount, refresh }
}
