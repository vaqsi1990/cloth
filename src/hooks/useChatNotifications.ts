import { useCallback, useEffect, useRef, useState } from 'react'
import { playChatNotificationSound, unlockChatNotificationAudio } from '@/utils/chatNotificationSound'

const POLL_INTERVAL_MS = 5000

interface UnreadChatResponse {
  success: boolean
  unreadCount?: number
  latestUnreadMessageId?: number | null
  latestUnreadChatRoomId?: number | null
}

export function useChatNotifications(options: {
  enabled: boolean
  endpoint: string
  storageKey: string
}) {
  const { enabled, endpoint, storageKey } = options
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [latestUnreadChatRoomId, setLatestUnreadChatRoomId] = useState<number | null>(null)
  const soundEnabledRef = useRef(true)
  const activeChatRoomIdRef = useRef<number | null>(null)
  const latestUnreadMessageIdRef = useRef<number | null>(null)
  const isInitialLoadRef = useRef(true)

  useEffect(() => {
    const stored = localStorage.getItem(storageKey)
    const nextEnabled = stored === null ? true : stored === 'true'
    soundEnabledRef.current = nextEnabled
    setSoundEnabled(nextEnabled)
  }, [storageKey])

  useEffect(() => {
    const unlock = () => {
      void unlockChatNotificationAudio()
    }

    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })

    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  const setActiveChatRoomId = useCallback((chatRoomId: number | null) => {
    activeChatRoomIdRef.current = chatRoomId
  }, [])

  const syncUnreadState = useCallback(async (playSound: boolean) => {
    if (!enabled) return

    try {
      const response = await fetch(endpoint, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      })

      if (!response.ok) return

      const data: UnreadChatResponse = await response.json()
      if (!data.success) return

      const nextUnreadCount = Number(data.unreadCount)
      const nextLatestUnreadMessageId = data.latestUnreadMessageId ?? null
      const nextLatestUnreadChatRoomId = data.latestUnreadChatRoomId ?? null

      setUnreadCount(Number.isFinite(nextUnreadCount) ? nextUnreadCount : 0)
      setLatestUnreadChatRoomId(nextLatestUnreadChatRoomId)

      if (isInitialLoadRef.current) {
        latestUnreadMessageIdRef.current = nextLatestUnreadMessageId
        isInitialLoadRef.current = false
        return
      }

      const hasNewUnreadMessage =
        nextLatestUnreadMessageId !== null &&
        (latestUnreadMessageIdRef.current === null ||
          nextLatestUnreadMessageId > latestUnreadMessageIdRef.current)

      const isActiveChatRoom =
        nextLatestUnreadChatRoomId !== null &&
        nextLatestUnreadChatRoomId === activeChatRoomIdRef.current

      latestUnreadMessageIdRef.current = nextLatestUnreadMessageId

      if (hasNewUnreadMessage && soundEnabledRef.current && playSound && !isActiveChatRoom) {
        void playChatNotificationSound()
      }
    } catch (error) {
      console.error('Error checking chat notifications:', error)
    }
  }, [enabled, endpoint])

  const checkUnreadChats = useCallback(() => syncUnreadState(true), [syncUnreadState])

  const acknowledgeActiveChat = useCallback(() => {
    void syncUnreadState(false)
  }, [syncUnreadState])

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev
      soundEnabledRef.current = next
      localStorage.setItem(storageKey, String(next))
      if (next) {
        void unlockChatNotificationAudio().then((unlocked) => {
          if (unlocked) {
            void playChatNotificationSound()
          }
        })
      }
      return next
    })
  }, [storageKey])

  useEffect(() => {
    if (!enabled) {
      setUnreadCount(0)
      setLatestUnreadChatRoomId(null)
      activeChatRoomIdRef.current = null
      latestUnreadMessageIdRef.current = null
      isInitialLoadRef.current = true
      return
    }

    void checkUnreadChats()
    const interval = setInterval(() => {
      void checkUnreadChats()
    }, POLL_INTERVAL_MS)

    const onFocus = () => {
      void checkUnreadChats()
    }
    window.addEventListener('focus', onFocus)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [enabled, checkUnreadChats])

  return {
    unreadCount,
    latestUnreadChatRoomId,
    soundEnabled,
    toggleSound,
    setActiveChatRoomId,
    acknowledgeActiveChat,
  }
}
