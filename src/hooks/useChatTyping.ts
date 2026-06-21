'use client'

import { useCallback, useEffect, useRef } from 'react'

type UseChatTypingOptions = {
  chatRoomId?: number | null
  enabled?: boolean
  guestEmail?: string
}

export function useChatTyping({
  chatRoomId,
  enabled = true,
  guestEmail,
}: UseChatTypingOptions) {
  const typingActiveRef = useRef(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const sendTyping = useCallback(
    async (typing: boolean) => {
      if (!enabled || !chatRoomId || chatRoomId <= 0) return

      try {
        await fetch(`/api/chat/${chatRoomId}/typing`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            typing,
            ...(guestEmail?.trim() ? { guestEmail: guestEmail.trim() } : {}),
          }),
        })
        typingActiveRef.current = typing
      } catch {
        // ignore network errors for typing pulses
      }
    },
    [chatRoomId, enabled, guestEmail]
  )

  const stopTyping = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    if (refreshRef.current) {
      clearInterval(refreshRef.current)
      refreshRef.current = null
    }
    if (typingActiveRef.current) {
      sendTyping(false)
    }
  }, [sendTyping])

  const notifyTyping = useCallback(
    (value: string) => {
      if (!enabled || !chatRoomId || chatRoomId <= 0) return

      if (!value.trim()) {
        stopTyping()
        return
      }

      if (!typingActiveRef.current) {
        sendTyping(true)
      }

      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        if (typingActiveRef.current) sendTyping(true)
      }, 1200)

      if (!refreshRef.current) {
        refreshRef.current = setInterval(() => {
          if (typingActiveRef.current) sendTyping(true)
        }, 2500)
      }
    },
    [chatRoomId, enabled, sendTyping, stopTyping]
  )

  useEffect(() => {
    return () => {
      stopTyping()
    }
  }, [chatRoomId, stopTyping])

  return { notifyTyping, stopTyping }
}
