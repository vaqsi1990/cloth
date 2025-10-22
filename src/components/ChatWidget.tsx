'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { MessageCircle, Send, X, Minimize2, Maximize2 } from 'lucide-react'
import { formatDateTime } from '@/utils/dateUtils'

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
  const [isMinimized, setIsMinimized] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [showGuestForm, setShowGuestForm] = useState(false)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (chatRoomId && isOpen) {
      fetchMessages()
      // Poll for new messages every 2 seconds (more frequent)
      const interval = setInterval(fetchMessages, 2000)
      return () => clearInterval(interval)
    }
  }, [chatRoomId, isOpen])

  const fetchMessages = useCallback(async () => {
    if (!chatRoomId) return

    try {
      const response = await fetch(`/api/chat/${chatRoomId}`, {
        cache: 'no-store', // Ensure fresh data
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success && data.messages) {
        // Transform the raw query results to match the expected format
        const transformedMessages = data.messages.map((msg: {
          id: number
          content: string
          createdAt: string
          isFromAdmin: boolean
          user_name?: string
          user_email?: string
          admin_name?: string
          admin_email?: string
        }) => ({
          id: msg.id,
          content: msg.content,
          createdAt: msg.createdAt,
          isFromAdmin: msg.isFromAdmin,
          user: msg.user_name ? { name: msg.user_name, email: msg.user_email } : undefined,
          admin: msg.admin_name ? { name: msg.admin_name, email: msg.admin_email } : undefined
        }))
        setMessages(transformedMessages)
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }, [chatRoomId])

  const sendMessage = async () => {
    if (!newMessage.trim()) return

    setIsLoading(true)
    const messageToSend = newMessage.trim()
    setNewMessage('') // Clear input immediately for better UX
    
    try {
      if (!chatRoomId) {
        // Create new chat room
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: messageToSend,
            guestName: guestName || undefined,
            guestEmail: guestEmail || undefined
          })
        })
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        if (data.success) {
          onChatRoomCreated(data.chatRoomId)
          setShowGuestForm(false)
          // Fetch messages immediately after creating room
          setTimeout(() => fetchMessages(), 500)
        } else {
          throw new Error(data.message || 'Failed to create chat room')
        }
      } else {
        // Send message to existing chat room
        const response = await fetch(`/api/chat/${chatRoomId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: messageToSend })
        })
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
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
          setMessages(prev => [...prev, transformedMessage])
        } else {
          throw new Error(data.message || 'Failed to send message')
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)
      // Restore message if sending failed
      setNewMessage(messageToSend)
      alert('შეცდომა მესიჯის გაგზავნისას. სცადეთ კვლავ.')
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
    setShowGuestForm(true)
    setMessages([])
    onChatRoomCreated(0) // Reset chat room ID
  }

  if (!isOpen) return null

  return (
    <div className={`fixed bottom-4 right-4 z-50 bg-white rounded-lg shadow-2xl border border-gray-200 ${
      isMinimized ? 'w-80 h-16' : 'w-96 h-[80%]'
    } transition-all duration-300`}>
      {/* Header */}
      <div className="bg-[#1B3729] text-white p-4 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MessageCircle className="w-5 h-5" />
          <span className="font-semibold">Live Chat</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-white hover:text-gray-300 transition-colors"
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onToggle}
            className="text-white hover:text-gray-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto h-[50%] bg-gray-50">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>დაიწყეთ საუბარი!</p>
                <p className="text-sm">ჩვენი გუნდი მზადაა დაგეხმაროთ.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isFromAdmin ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        message.isFromAdmin
                          ? 'bg-blue-100 text-gray-800'
                          : 'bg-[#1B3729] text-white'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        message.isFromAdmin ? 'text-gray-500' : 'text-gray-300'
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
          {showGuestForm && !chatRoomId && (
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    სახელი
                  </label>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#1B3729] focus:border-transparent"
                    placeholder="შეიყვანეთ თქვენი სახელი"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ელ-ფოსტა
                  </label>
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#1B3729] focus:border-transparent"
                    placeholder="შეიყვანეთ თქვენი ელ-ფოსტა"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-gray-200 bg-white">
            <div className="flex space-x-2">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="შეიყვანეთ თქვენი შეტყობინება..."
                className="flex-1 p-2 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-[#1B3729] focus:border-transparent"
                rows={2}
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !newMessage.trim()}
                className="bg-[#1B3729] text-white p-2 rounded-md hover:bg-[#2a4d3a] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            
            {!chatRoomId && !showGuestForm && (
              <button
                onClick={startNewChat}
                className="mt-2 text-sm text-[#1B3729] hover:text-[#2a4d3a] transition-colors"
              >
                ახალი საუბრის დაწყება
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default ChatWidget
