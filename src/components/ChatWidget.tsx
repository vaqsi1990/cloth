'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { MessageCircle, Send, X, Minimize2, Maximize2 } from 'lucide-react'
import { formatDateTime } from '@/utils/dateUtils'
import { useSession } from 'next-auth/react'
import { showToast } from '@/utils/toast'

interface ChatMessage {
  id: number
  content: string
  createdAt: string
  isFromAdmin: boolean
  user?: { name: string; email: string }
  admin?: { name: string; email: string }
}

interface ChatWidgetProps {
  isOpen: boolean
  onToggle: () => void
  chatRoomId?: number
  onChatRoomCreated: (chatRoomId: number) => void
}

const ChatWidget: React.FC<ChatWidgetProps> = ({
  isOpen,
  onToggle,
  chatRoomId,
  onChatRoomCreated
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingMessages, setIsFetchingMessages] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fetchingRef = useRef(false)
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [showGuestForm, setShowGuestForm] = useState(true)
  const [isEndingChat, setIsEndingChat] = useState(false)
  const { data: session } = useSession()

  // Load guest info from localStorage on component mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    try {
      const savedName = localStorage.getItem('chatGuestName')
      const savedEmail = localStorage.getItem('chatGuestEmail')
      const savedChatRoomId = localStorage.getItem('chatRoomId')

      if (savedName && savedEmail) {
        setGuestName(savedName)
        setGuestEmail(savedEmail)
        setShowGuestForm(false)

        // If there's a saved chat room ID, try to restore it
        if (savedChatRoomId && savedChatRoomId !== '0') {
          const roomId = parseInt(savedChatRoomId)
          if (!isNaN(roomId)) {
            onChatRoomCreated(roomId)
          }
        }
      }
    } catch (error) {
      console.error('Error loading chat data from localStorage:', error)
    }
  }, [onChatRoomCreated])







  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && !isMinimized) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isMinimized])

  const fetchMessages = useCallback(async () => {
    if (!chatRoomId || chatRoomId === 0) {
      setMessages([])
      return
    }

    // Prevent multiple simultaneous fetches
    if (fetchingRef.current) return
    fetchingRef.current = true
    setIsFetchingMessages(true)
    
    try {
      const response = await fetch(`/api/chat/${chatRoomId}`, {
        cache: 'no-store', // Ensure fresh data
        headers: {
          'Cache-Control': 'no-cache'
        }
      })

      if (!response.ok) {
        let errorData = {}
        try {
          errorData = await response.json()
        } catch (e) {
          console.debug('Could not parse error response as JSON')
        }

        // If chat room not found, reset chat room ID to allow creating new one
        if (response.status === 404) {
          console.log(`Chat room ${chatRoomId} not found, resetting...`)
          onChatRoomCreated(0)
          setMessages([])
          // Clear invalid chat room ID from localStorage
          if (typeof window !== 'undefined') {
            localStorage.removeItem('chatRoomId')
          }
          return
        }

        // Log other errors for debugging
        console.error('Fetch messages error:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
          url: response.url,
          chatRoomId
        })
        return
      }

      const data = await response.json()

      if (data.success && Array.isArray(data.messages)) {
        // Transform the raw query results to match the expected format
        const transformedMessages = data.messages.map((msg: {
          id: number
          content: string
          createdAt: string | Date
          isFromAdmin: boolean
          user_name?: string
          user_email?: string
          admin_name?: string
          admin_email?: string
        }) => ({
          id: msg.id,
          content: msg.content,
          createdAt: typeof msg.createdAt === 'string' ? msg.createdAt : (msg.createdAt instanceof Date ? msg.createdAt.toISOString() : String(msg.createdAt)),
          isFromAdmin: msg.isFromAdmin,
          user: msg.user_name ? { name: msg.user_name, email: msg.user_email } : undefined,
          admin: msg.admin_name ? { name: msg.admin_name, email: msg.admin_email } : undefined
        }))

        // Remove duplicates based on message ID and sort by creation time
        const uniqueMessages = transformedMessages
          .filter((msg: ChatMessage, index: number, self: ChatMessage[]) =>
            index === self.findIndex(m => m.id === msg.id)
          )
          .sort((a: ChatMessage, b: ChatMessage) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

        setMessages(uniqueMessages)
      } else if (data.success && !data.messages) {
        // Chat room exists but has no messages yet
        setMessages([])
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
      // Don't show error to user for fetch failures, just log them
    } finally {
      fetchingRef.current = false
      setIsFetchingMessages(false)
    }
  }, [chatRoomId, onChatRoomCreated])

  // Fetch messages and poll when chat is open
  useEffect(() => {
    if (chatRoomId && chatRoomId > 0 && isOpen) {
      fetchMessages()
      // Poll for new messages every 5 seconds, but only if we have a valid chat room
      const interval = setInterval(() => {
        if (chatRoomId && chatRoomId > 0) {
          fetchMessages()
        }
      }, 5000)
      return () => clearInterval(interval)
    } else if (!chatRoomId || chatRoomId === 0) {
      // Clear messages if no valid chat room
      setMessages([])
    }
  }, [chatRoomId, isOpen, fetchMessages])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && !isMinimized) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isMinimized])

  const sendMessage = async () => {
    if (!newMessage.trim()) return

    // Client-side validation
    if (newMessage.trim().length > 1000) {
      showToast('მესიჯი ძალიან გრძელია. მაქსიმუმ 1000 სიმბოლო.', 'warning')
      return
    }

    // Validate guest form if creating new chat room
    if (!chatRoomId && !session && (!guestName.trim() || !guestEmail.trim())) {
      showToast('გთხოვთ შეიყვანოთ სახელი და ელ-ფოსტა', 'warning')
      setShowGuestForm(true)
      return
    }

    // Validate email format if provided
    if (guestEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
      showToast('გთხოვთ შეიყვანოთ სწორი ელ-ფოსტა', 'warning')
      return
    }

    setIsLoading(true)
    const messageToSend = newMessage.trim()
    setNewMessage('') // Clear input immediately for better UX

    try {
      if (!chatRoomId) {
        // Create new chat room
        const requestBody = {
          message: messageToSend,
          guestName: guestName || undefined,
          guestEmail: guestEmail || undefined
        }

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error('Create chat room error:', errorData)
          throw new Error(`HTTP error! status: ${response.status} - ${errorData.message || errorData.error || 'Unknown error'}`)
        }

        const data = await response.json()

        if (data.success && data.chatRoomId) {
          onChatRoomCreated(data.chatRoomId)
          setShowGuestForm(false)
          // Save guest info and chat room ID to localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('chatGuestName', guestName)
            localStorage.setItem('chatGuestEmail', guestEmail)
            localStorage.setItem('chatRoomId', data.chatRoomId.toString())
          }
          // Clear messages and let the useEffect handle fetching
          setMessages([])
        } else {
          throw new Error(data.message || 'Failed to create chat room')
        }
      } else {
        // Send message to existing chat room
        const requestBody = { content: messageToSend }

        const response = await fetch(`/api/chat/${chatRoomId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error('Send message error:', errorData)
          throw new Error(`HTTP error! status: ${response.status} - ${errorData.message || errorData.error || 'Unknown error'}`)
        }

        const data = await response.json()

        if (data.success && data.message) {
          // Transform the message to match expected format
          const transformedMessage = {
            id: data.message.id,
            content: data.message.content,
            createdAt: data.message.createdAt,
            isFromAdmin: data.message.isFromAdmin,
            user: data.message.user_name ? { name: data.message.user_name, email: data.message.user_email } : undefined,
            admin: data.message.admin_name ? { name: data.message.admin_name, email: data.message.admin_email } : undefined
          }

          // Add message only if it doesn't already exist
          setMessages(prev => {
            const exists = prev.some(msg => msg.id === transformedMessage.id)
            if (exists) {
              return prev
            }
            return [...prev, transformedMessage]
          })
        } else {
          throw new Error(data.message || 'Failed to send message')
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)
      // Restore message if sending failed
      setNewMessage(messageToSend)

      // Show more specific error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      showToast(`შეცდომა მესიჯის გაგზავნისას: ${errorMessage}`, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const startNewChat = () => {
    if (!session) {
      setShowGuestForm(true)
    }
    setMessages([])
    onChatRoomCreated(0) // Reset chat room ID
  }

  const endChat = async () => {
    if (!chatRoomId) return

    setIsEndingChat(true)
    try {
      const response = await fetch(`/api/chat/${chatRoomId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // Clear localStorage
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem('chatGuestName')
            localStorage.removeItem('chatGuestEmail')
            localStorage.removeItem('chatRoomId')
          } catch (error) {
            console.error('Error clearing localStorage:', error)
          }
        }

        // Reset state
        setMessages([])
        onChatRoomCreated(0)
        setShowGuestForm(true)
        setGuestName('')
        setGuestEmail('')

        showToast('ლაპარაკი წარმატებით დასრულდა', 'success')
      } else {
        const errorData = await response.json().catch(() => ({}))
        showToast(errorData.message || 'შეცდომა ლაპარაკის დასრულებისას', 'error')
      }
    } catch (error) {
      console.error('Error ending chat:', error)
      showToast('შეცდომა ლაპარაკის დასრულებისას', 'error')
    } finally {
      setIsEndingChat(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className={`fixed bottom-[15px] right-4 z-50 bg-white shadow-2xl border border-gray-200 ${isMinimized ? 'w-80 h-16 rounded-xl' : 'w-96 h-[80%] rounded-xl overflow-hidden'
      } transition-all duration-300 flex flex-col`}>
      {/* Header */}
      <div className={`bg-[#1B3729] text-white p-4 flex items-center justify-between ${isMinimized ? 'rounded-xl' : 'rounded-t-xl'
        }`}>
        <div className="flex items-center space-x-2">
          <MessageCircle className="w-5 h-5" />
          <span className="font-semibold">Live Chat</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-white hover:text-gray-300 transition-colors p-1 rounded hover:bg-white/10"
            aria-label={isMinimized ? 'გაფართოება' : 'შემცირება'}
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onToggle}
            className="text-white hover:text-gray-300 transition-colors p-1 rounded hover:bg-white/10"
            aria-label="დახურვა"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="flex flex-col flex-1 ">
          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto bg-gray-50 ">
            {isFetchingMessages && messages.length === 0 ? (
              <div className="text-center md:text-[18px] text-[16px] py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B3729] mx-auto mb-4"></div>
                <p className="text-gray-500">იტვირთება...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center md:text-[18px] text-[16px]  py-8">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="font-medium text-black">დაიწყეთ საუბარი!</p>
                <p className="text-[16px] text-gray-500 mt-2">ჩვენი გუნდი მზადაა დაგეხმაროთ</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isFromAdmin ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-lg shadow-sm ${message.isFromAdmin
                          ? 'bg-blue-100 text-gray-800'
                          : 'bg-[#1B3729] text-white'
                        }`}
                    >
                      {/* Show sender name */}
                      <div className="flex items-center justify-between mb-1">
                        <p className={`text-[14px] font-semibold ${message.isFromAdmin ? 'text-blue-700' : 'text-gray-200'
                          }`}>
                          {message.isFromAdmin
                            ? 'ადმინისტრატორი'
                            : (message.user?.name || guestName || 'მომხმარებელი')
                          }
                        </p>
                      </div>
                      <p className="text-[16px] break-words">{message.content}</p>
                      <p className={`text-[12px] mt-2 ${message.isFromAdmin ? 'text-gray-500' : 'text-gray-300'
                        }`}>
                        {formatDateTime(message.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Guest Form */}
          {showGuestForm && !chatRoomId && !session && (
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="space-y-3">
                <div>
                  <label className="block text-[16px] text-black font-medium  mb-1">
                    სახელი
                  </label>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="w-full p-2 border text-black placeholder:text-gray-500  border-black rounded-md focus:ring-2 focus:ring-[#1B3729] focus:border-transparent text-[16px]"
                    placeholder="შეიყვანეთ თქვენი სახელი"
                  />
                </div>
                <div>
                  <label className="block text-[16px] text-black font-medium  mb-1">
                    ელ-ფოსტა
                  </label>
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    className="w-full p-2 border text-black placeholder:text-gray-500 border-black rounded-md focus:ring-2 focus:ring-[#1B3729] focus:border-transparent text-[16px]"
                    placeholder="შეიყვანეთ თქვენი ელ-ფოსტა"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-gray-200 bg-white rounded-b-xl">
            <div className="flex space-x-2">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="შეიყვანეთ თქვენი შეტყობინება..."
                className="flex-1 text-black p-2 border placeholder:text-gray-500 border-black rounded-md resize-none focus:ring-2 focus:ring-[#1B3729] focus:border-transparent text-[14px]"
                rows={2}
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !newMessage.trim()}
                className="bg-[#1B3729] text-white p-2 rounded-md hover:bg-[#2a4d3a] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                aria-label="გაგზავნა"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-2 flex gap-2">
              {!chatRoomId && !showGuestForm && !session && (
                <button
                  onClick={startNewChat}
                  className="text-[16px] text-black hover:text-[#2a4d3a] transition-colors"
                >
                  ახალი საუბრის დაწყება
                </button>
              )}

              {chatRoomId && !session && (
                <button
                  onClick={endChat}
                  disabled={isEndingChat}
                  className="text-[14px] text-red-600 hover:text-red-800 transition-colors disabled:opacity-50"
                >
                  {isEndingChat ? 'დასრულდება...' : 'ლაპარაკის დასრულება'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ChatWidget
