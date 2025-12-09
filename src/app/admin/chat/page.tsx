'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { MessageCircle, Send, Clock, XCircle, Play, Trash2 } from 'lucide-react'
import { formatDateTime } from '@/utils/dateUtils'
import { showToast } from '@/utils/toast'

interface ChatMessage {
  id: number
  content: string
  createdAt: string
  isFromAdmin: boolean
  user?: { name: string; email: string }
  admin?: { name: string; email: string }
}

interface ChatRoom {
  id: number
  createdAt: string
  updatedAt: string
  status: 'PENDING' | 'ACTIVE' | 'CLOSED'
  guestName?: string
  guestEmail?: string
  user?: { name: string; email: string }
  admin?: { name: string; email: string }
  messages: ChatMessage[]
  _count: { messages: number }
}

const AdminChatPage = () => {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([])
  const [selectedChatRoom, setSelectedChatRoom] = useState<ChatRoom | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [chatRoomToDelete, setChatRoomToDelete] = useState<ChatRoom | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

 
  const fetchChatRooms = useCallback(async () => {
    try {
      const url = filterStatus ? `/api/admin/chat?status=${filterStatus}` : '/api/admin/chat'
      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setChatRooms(data.chatRooms)
      }
    } catch (error) {
      console.error('Error fetching chat rooms:', error)
    }
  }, [filterStatus])

  const fetchMessages = useCallback(async () => {
    if (!selectedChatRoom) return

    try {
      const response = await fetch(`/api/chat/${selectedChatRoom.id}`, {
        cache: 'no-store',
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
        
        // Remove duplicates based on message ID to prevent React key conflicts
        const uniqueMessages = transformedMessages.filter((message: ChatMessage, index: number, self: ChatMessage[]) => 
          index === self.findIndex((m: ChatMessage) => m.id === message.id)
        )
        
        setMessages(uniqueMessages)
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }, [selectedChatRoom])

  useEffect(() => {
    if (status === 'loading') {
      return
    }

    if (!session || session.user.role !== 'ADMIN') {
      router.push('/auth/signin')
      return
    }

    fetchChatRooms()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session?.user?.role, fetchChatRooms])

  useEffect(() => {
    if (selectedChatRoom) {
      fetchMessages()
      // Poll for new messages every 5 seconds (reduced frequency)
      const interval = setInterval(() => {
        fetchMessages()
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [selectedChatRoom, fetchMessages])



  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChatRoom) return

    setIsLoading(true)
    const messageToSend = newMessage.trim()
    setNewMessage('') // Clear input immediately
    
    try {
      const response = await fetch(`/api/chat/${selectedChatRoom.id}`, {
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
        
        // Add new message only if it doesn't already exist to prevent duplicates
        setMessages(prev => {
          const exists = prev.some(msg => msg.id === transformedMessage.id)
          if (exists) {
            return prev
          }
          return [...prev, transformedMessage]
        })
        fetchChatRooms() // Refresh chat rooms list
      } else {
        throw new Error(data.message || 'Failed to send message')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      // Restore message if sending failed
      setNewMessage(messageToSend)
      showToast('შეცდომა მესიჯის გაგზავნისას. სცადეთ კვლავ.', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const updateChatRoomStatus = async (chatRoomId: number, action: string) => {
    try {
      const response = await fetch('/api/admin/chat', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatRoomId, action })
      })
      
      const data = await response.json()
      if (data.success) {
        fetchChatRooms()
        if (selectedChatRoom?.id === chatRoomId) {
          setSelectedChatRoom(data.chatRoom)
        }
      }
    } catch (error) {
      console.error('Error updating chat room status:', error)
    }
  }

  const deleteChatRoom = async () => {
    if (!chatRoomToDelete || deleteConfirmText !== 'DELETE') {
      showToast('გთხოვთ შეიყვანოთ "DELETE" დასადასტურებლად', 'warning')
      return
    }

    try {
      const response = await fetch('/api/admin/chat', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatRoomId: chatRoomToDelete.id })
      })
      
      const data = await response.json()
      if (data.success) {
        fetchChatRooms()
        if (selectedChatRoom?.id === chatRoomToDelete.id) {
          setSelectedChatRoom(null)
          setMessages([])
        }
        setShowDeleteModal(false)
        setDeleteConfirmText('')
        setChatRoomToDelete(null)
        showToast('საუბარი წარმატებით წაიშალა', 'success')
      } else {
        showToast('შეცდომა საუბრის წაშლისას: ' + data.message, 'error')
      }
    } catch (error) {
      console.error('Error deleting chat room:', error)
      showToast('შეცდომა საუბრის წაშლისას', 'error')
    }
  }

  const openDeleteModal = (chatRoom: ChatRoom) => {
    setChatRoomToDelete(chatRoom)
    setShowDeleteModal(true)
    setDeleteConfirmText('')
  }

  const closeDeleteModal = () => {
    setShowDeleteModal(false)
    setDeleteConfirmText('')
    setChatRoomToDelete(null)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-4 h-4 text-yellow-500" />
      case 'ACTIVE':
        return <Play className="w-4 h-4 text-green-500" />
      case 'CLOSED':
        return <XCircle className="w-4 h-4 text-gray-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'ACTIVE':
        return 'bg-green-100 text-green-800'
      case 'CLOSED':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#1B3729] mx-auto"></div>
          <p className="mt-4 text-black">იტვირთება...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-shrink-0 px-4 sm:px-6 lg:px-8 py-6 bg-white border-b border-gray-200">
        <h1 className="md:text-[20px] text-[18px] font-bold text-black">Live Chat მართვა</h1>
      
      </div>

      <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
          {/* Chat Rooms List */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="md:text-[20px] text-[16px] font-semibold text-gray-900">საუბრები</h2>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-md md:text-[18px] text-[16px] focus:ring-2 focus:ring-[#1B3729] focus:border-transparent"
                >
                  <option value="">ყველა</option>
                  <option value="PENDING">ლოდინი</option>
                  <option value="ACTIVE">აქტიური</option>
                  <option value="CLOSED">დახურული</option>
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {chatRooms.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="md:text-[18px] text-[16px]">საუბრები არ არის</p>
                </div>
              ) : (
                <div className="space-y-2 p-4">
                  {chatRooms.map((room) => (
                    <div
                      key={room.id}
                      onClick={() => setSelectedChatRoom(room)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedChatRoom?.id === room.id
                          ? 'bg-[#1B3729] text-white'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          
                          
                          <span className="font-medium">
                            #{room.id}
                          </span>
                        </div>
                      
                      </div>
                      
                      <div className="md:text-[18px] text-[16px]">
                        <p className="font-medium">
                          {room.user?.name || room.guestName || 'უცნობი მომხმარებელი'}
                        </p>
                        <p className="md:text-[18px] text-[16px] opacity-75">
                          {room.user?.email || room.guestEmail}
                        </p>
                        <p className="md:text-[18px] text-[16px] opacity-75 mt-1">
                          {formatDateTime(room.updatedAt)}
                        </p>
                        <div className="mt-2 flex justify-end">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              openDeleteModal(room)
                            }}
                            className="text-red-500 cursor-pointer md:text-[18px] text-[16px] flex items-end space-x-1"
                          >
                            <Trash2 className="w-6 h-6" />
                          
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Chat Messages */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col chat-container">
            {selectedChatRoom ? (
              <>
                {/* Chat Header */}
                <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="md:text-[18px] text-[16px] font-semibold text-black">
                        საუბარი #{selectedChatRoom.id}
                      </h3>
                      <p className="md:text-[18px] text-[16px] text-black">
                        {selectedChatRoom.user?.name || selectedChatRoom.guestName || 'უცნობი მომხმარებელი'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {selectedChatRoom.status === 'PENDING' && (
                        <button
                          onClick={() => updateChatRoomStatus(selectedChatRoom.id, 'assign')}
                          className="px-3 py-1 bg-[#1B3729] text-white rounded-md md:text-[18px] font-bold text-[16px] hover:bg-[#2a4d3a] transition-colors"
                        >
                          მიღება
                        </button>
                      )}
                      {selectedChatRoom.status === 'ACTIVE' && (
                        <button
                          onClick={() => updateChatRoomStatus(selectedChatRoom.id, 'close')}
                          className="px-3 py-1 bg-red-500 text-white rounded-md md:text-[18px] font-bold text-[16px] hover:bg-red-600 transition-colors"
                        >
                          დახურვა
                        </button>
                      )}
                      {selectedChatRoom.status === 'CLOSED' && (
                        <button
                          onClick={() => updateChatRoomStatus(selectedChatRoom.id, 'reopen')}
                          className="px-3 py-1 bg-green-500 text-white rounded-md md:text-[18px] text-[16px] hover:bg-green-600 transition-colors"
                        >
                          გახსნა
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto bg-gray-50 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  <div className="p-4 h-full">
                    {messages.length === 0 ? (
                      <div className="text-center text-gray-500 py-8 h-full flex flex-col items-center justify-center">
                        <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>შეტყობინებები არ არის</p>
                      </div>
                    ) : (
                      <div className="space-y-4 pb-4">
                        {messages.map((message, index) => (
                          <div
                            key={`${message.id}-${message.createdAt}-${index}`}
                            className={`flex ${message.isFromAdmin ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[70%] p-3 rounded-lg ${
                                message.isFromAdmin
                                  ? 'bg-[#1B3729] text-white'
                                  : 'bg-white text-gray-800 border border-gray-200'
                              }`}
                            >
                              {/* Show sender name */}
                              <div className="flex items-center justify-between mb-1">
                                <p className={`md:text-[18px] text-[16px] font-medium ${
                                  message.isFromAdmin ? 'text-gray-300' : 'text-black'
                                }`}>
                                  {message.isFromAdmin 
                                    ? (message.admin?.name || 'ადმინისტრატორი')
                                    : (message.user?.name || selectedChatRoom?.guestName || 'მომხმარებელი')
                                  }
                                </p>
                              </div>
                              <p className="md:text-[18px] text-[16px]">{message.content}</p>
                              <p className={`md:text-[18px] text-[16px] mt-1 ${
                                message.isFromAdmin ? 'text-gray-300' : 'text-gray-500'
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
                </div>

                {/* Message Input */}
                <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-white">
                  <div className="flex space-x-2">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="შეიყვანეთ თქვენი პასუხი..."
                      className="flex-1 p-3 text-black border placeholder:text-gray-500 text-black placeholder:text-[18px] border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-[#1B3729] focus:border-transparent"
                      rows={2}
                      disabled={isLoading}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={isLoading || !newMessage.trim()}
                      className="bg-[#1B3729] text-white p-3 rounded-md hover:bg-[#2a4d3a] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="md:text-[18px] text-[16px]">აირჩიეთ საუბარი</p>
                  <p className="md:text-[18px] text-[16px]">მარცხნივ ჩამონათვალიდან</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="md:text-[18px] text-[16px] font-semibold text-black mb-4">
              საუბრის წაშლა
            </h3>
            <p className="text-black mb-4">
              ნამდვილად გსურთ საუბრის წაშლა? ეს მოქმედება შეუქცევადია.
            </p>
            <p className="md:text-[18px] text-[16px] text-black mb-4">
              საუბარი #{chatRoomToDelete?.id} - {chatRoomToDelete?.user?.name || chatRoomToDelete?.guestName || 'უცნობი მომხმარებელი'}
            </p>
            <div className="mb-4">
              <label className="block md:text-[18px] text-[16px] font-medium text-black mb-2">
                დასადასტურებლად შეიყვანეთ &quot;DELETE&quot;:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full p-2 border text-black border-gray-300 rounded-md placeholder:text-gray-500"
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={deleteChatRoom}
                disabled={deleteConfirmText !== 'DELETE'}
                className="flex-1 bg-red-500 md:text-[18px] text-[16px] font-bold text-white py-2 px-4 rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                წაშლა
              </button>
              <button
                onClick={closeDeleteModal}
                className="flex-1 bg-gray-300 md:text-[18px] text-[16px] font-bold text-black py-2 px-4 rounded-md  transition-colors"
              >
                გაუქმება
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminChatPage
