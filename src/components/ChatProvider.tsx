'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import ChatWidget from '@/components/ChatWidget'
import ChatButton from '@/components/ChatButton'

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

const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [isClient, setIsClient] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatRoomId, setChatRoomId] = useState<number | undefined>(undefined)
  const [unreadCount, setUnreadCount] = useState(0)
  const { data: session } = useSession()

  useEffect(() => {
    setIsClient(true)
  }, [])

  const toggleChat = () => {
    setIsChatOpen(!isChatOpen)
    if (!isChatOpen) {
      setUnreadCount(0) // Reset unread count when opening chat
    }
  }

  const handleChatRoomCreated = (id: number) => {
    setChatRoomId(id)
  }

  // Check for unread messages periodically
  useEffect(() => {
    if (!session?.user?.id || isChatOpen) return

    const checkUnreadMessages = async () => {
      try {
        const response = await fetch('/api/chat', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache'
          }
        })
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        
        if (data.success && data.chatRooms) {
          // Count unread messages (messages not from current user)
          let unread = 0
          data.chatRooms.forEach((room: { 
            messages: Array<{ 
              isFromAdmin: boolean; 
              userId?: string;
              adminId?: string;
            }> 
          }) => {
            if (room.messages && room.messages.length > 0) {
              const lastMessage = room.messages[0]
              // Count as unread if message is from admin or from another user
              if (lastMessage.isFromAdmin || 
                  (lastMessage.userId && lastMessage.userId !== session.user.id)) {
                unread++
              }
            }
          })
          setUnreadCount(unread)
        }
      } catch (error) {
        console.error('Error checking unread messages:', error)
      }
    }

    // Check immediately
    checkUnreadMessages()
    
    // Then check every 15 seconds (reduced frequency)
    const interval = setInterval(checkUnreadMessages, 15000)
    return () => clearInterval(interval)
  }, [session?.user?.id, isChatOpen])

  const contextValue: ChatContextType = {
    isChatOpen,
    toggleChat,
    chatRoomId,
    setChatRoomId,
    unreadCount
  }

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
      
      {/* Chat Button - only show on main pages, not admin */}
      {isClient && !window.location.pathname.startsWith('/admin') && (
        <ChatButton 
          onClick={toggleChat} 
          unreadCount={unreadCount}
        />
      )}
      
      {/* Chat Widget */}
      <ChatWidget
        isOpen={isChatOpen}
        onToggle={toggleChat}
        chatRoomId={chatRoomId}
        onChatRoomCreated={handleChatRoomCreated}
      />
    </ChatContext.Provider>
  )
}

export default ChatProvider
