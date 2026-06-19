'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import ChatWidget from '@/components/ChatWidget'
import ChatButton from '@/components/ChatButton'
import { isAdminOrSupport } from '@/lib/roles'

interface ChatContextType {
  isChatOpen: boolean
  toggleChat: () => void
  chatRoomId: number | undefined
  setChatRoomId: (id: number) => void
  unreadCount: number
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export const useChat = () => {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return context
}

interface ChatProviderProps {
  children: React.ReactNode
}

const LIVE_SUPPORT_ROOM_STORAGE_KEY = 'liveSupportChatRoomId'

const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [isClient, setIsClient] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatRoomId, setChatRoomId] = useState<number | undefined>(undefined)
  const [unreadCount, setUnreadCount] = useState(0)
  const { data: session } = useSession()
  const pathname = usePathname()
  const isStaffUser =
    !!session?.user?.role && isAdminOrSupport(session.user.role)
  const showChatUi =
    isClient &&
    !pathname.startsWith('/admin') &&
    !pathname.startsWith('/support') &&
    !isStaffUser

  useEffect(() => {
    setIsClient(true)
  }, [])

  const restoreLiveSupportRoomId = useCallback((roomId: number) => {
    setChatRoomId(roomId)
    if (typeof window !== 'undefined') {
      localStorage.setItem(LIVE_SUPPORT_ROOM_STORAGE_KEY, String(roomId))
    }
  }, [])

  const syncChatState = useCallback(async () => {
    if (!session?.user?.id) return

    try {
      const response = await fetch('/api/chat/unread-count', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      })

      if (!response.ok) return

      const data = await response.json()
      if (!data.success) return

      if (!isChatOpen) {
        setUnreadCount(data.unreadCount || 0)
      }

      if (data.liveSupportChatRoomId) {
        restoreLiveSupportRoomId(data.liveSupportChatRoomId)
      }
    } catch (error) {
      console.error('Error checking unread messages:', error)
    }
  }, [session?.user?.id, isChatOpen, restoreLiveSupportRoomId])

  useEffect(() => {
    if (!session?.user?.id) {
      setUnreadCount(0)
      return
    }

    const savedRoomId = localStorage.getItem(LIVE_SUPPORT_ROOM_STORAGE_KEY)
    if (savedRoomId) {
      const parsed = parseInt(savedRoomId, 10)
      if (!Number.isNaN(parsed) && parsed > 0) {
        setChatRoomId(parsed)
      }
    }

    void syncChatState()
    const interval = setInterval(() => {
      void syncChatState()
    }, 15000)

    return () => clearInterval(interval)
  }, [session?.user?.id, syncChatState])

  const toggleChat = () => {
    const willOpen = !isChatOpen
    setIsChatOpen(willOpen)
    if (willOpen) {
      setUnreadCount(0)
      void syncChatState()
    }
  }

  const handleChatRoomCreated = (id: number) => {
    if (id > 0) {
      restoreLiveSupportRoomId(id)
      return
    }
    setChatRoomId(undefined)
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LIVE_SUPPORT_ROOM_STORAGE_KEY)
    }
  }

  const contextValue: ChatContextType = {
    isChatOpen,
    toggleChat,
    chatRoomId,
    setChatRoomId,
    unreadCount
  }

  const chatUi = showChatUi ? (
    <div
      className="fixed bottom-0 right-0 z-[60] flex flex-col items-end justify-end p-4 sm:p-6 pointer-events-none"
      aria-live="polite"
    >
      <div className="pointer-events-auto flex flex-col items-end gap-3">
        {isChatOpen ? (
          <ChatWidget
            isOpen={isChatOpen}
            onToggle={toggleChat}
            chatRoomId={chatRoomId}
            onChatRoomCreated={handleChatRoomCreated}
          />
        ) : (
          <ChatButton onClick={toggleChat} unreadCount={unreadCount} />
        )}
      </div>
    </div>
  ) : null

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
      {isClient && chatUi ? createPortal(chatUi, document.body) : null}
    </ChatContext.Provider>
  )
}

export default ChatProvider
