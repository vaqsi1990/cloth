import { useEffect, useRef } from 'react'
import { getLastChatMessageId, scrollChatContainerToBottom } from '@/lib/chat-scroll'

type UseChatAutoScrollOptions = {
  enabled?: boolean
  behavior?: ScrollBehavior
  roomKey?: number | string | null
}

export function useChatAutoScroll(
  messages: Array<{ id: number }>,
  options: UseChatAutoScrollOptions = {},
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const lastMessageIdRef = useRef<number | null>(null)
  const { enabled = true, behavior = 'auto', roomKey } = options

  useEffect(() => {
    lastMessageIdRef.current = null
  }, [roomKey])

  useEffect(() => {
    if (!enabled || messages.length === 0) return

    const lastId = getLastChatMessageId(messages)
    const hasNewMessage =
      lastMessageIdRef.current === null || lastId !== lastMessageIdRef.current

    if (!hasNewMessage) return

    requestAnimationFrame(() => {
      scrollChatContainerToBottom(containerRef.current, behavior)
    })
    lastMessageIdRef.current = lastId
  }, [messages, enabled, behavior])

  return containerRef
}
