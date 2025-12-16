'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { MessageCircle, Send, Clock, XCircle, Play, Trash2, Menu, X, ArrowLeft } from 'lucide-react'
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
  const [showChatList, setShowChatList] = useState(true)
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
      // On mobile, hide chat list when chat is selected
      const handleResize = () => {
        if (window.innerWidth < 1024) {
          setShowChatList(false)
        } else {
          setShowChatList(true)
        }
      }
      handleResize()
      window.addEventListener('resize', handleResize)
      // Poll for new messages every 5 seconds (reduced frequency)
      const interval = setInterval(() => {
        fetchMessages()
      }, 5000)
      return () => {
        clearInterval(interval)
        window.removeEventListener('resize', handleResize)
      }
    } else {
      // Show chat list when no chat is selected
      setShowChatList(true)
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
      <div className="flex-shrink-0 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 bg-white border-b border-gray-200">
        <h1 className="text-base sm:text-lg md:text-[20px] font-bold text-black">Live Chat მართვა</h1>
      
      </div>

      <div className="flex-1 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 min-h-0">
        <div className="relative flex lg:grid lg:grid-cols-4 gap-4 sm:gap-6 h-[calc(100vh-120px)] sm:h-[calc(100vh-140px)] lg:h-[calc(100vh-100px)]">
          {/* Chat Rooms List */}
          <div className={`bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-full min-h-0 w-full lg:w-auto transition-all duration-300 ${selectedChatRoom && !showChatList ? 'hidden lg:flex' : 'flex'}`}>
            <div className="flex-shrink-0 p-3 sm:p-4 lg:p-4 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                <h2 className="text-base sm:text-lg md:text-[20px] font-semibold text-black">საუბრები</h2>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-2 sm:px-3 py-1.5 border border-gray-300 rounded-md text-xs sm:text-sm md:text-[16px] focus:ring-2 focus:ring-[#1B3729] focus:border-transparent w-full sm:w-auto bg-white"
                >
                  <option value="">ყველა</option>
                  <option value="PENDING">ლოდინი</option>
                  <option value="ACTIVE">აქტიური</option>
                  <option value="CLOSED">დახურული</option>
                </select>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {chatRooms.length === 0 ? (
                <div className="p-3 sm:p-4 text-center text-black">
                  <MessageCircle className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-black" />
                  <p className="text-sm sm:text-base md:text-[18px]">საუბრები არ არის</p>
                </div>
              ) : (
                <div className="space-y-2 p-2 sm:p-4 lg:p-3">
                  {chatRooms.map((room) => (
                    <div
                      key={room.id}
                      onClick={() => {
                        setSelectedChatRoom(room)
                        // On mobile, hide chat list when chat is selected
                        if (window.innerWidth < 1024) {
                          setShowChatList(false)
                        }
                      }}
                      className={`p-2.5 sm:p-3 lg:p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                        selectedChatRoom?.id === room.id
                          ? 'bg-[#1B3729] text-white shadow-md'
                          : 'bg-gray-50 hover:bg-gray-100 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1 sm:mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-xs sm:text-sm md:text-base">
                            #{room.id}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-xs sm:text-sm md:text-[18px]">
                        <p className="font-medium break-words">
                          {room.user?.name || room.guestName || 'უცნობი მომხმარებელი'}
                        </p>
                        <p className="text-xs sm:text-sm black md:text-[18px] opacity-75 break-all">
                          {room.user?.email || room.guestEmail}
                        </p>
                        <p className="text-xs sm:text-sm md:text-[18px] opacity-75 mt-1">
                          {formatDateTime(room.updatedAt)}
                        </p>
                        <div className="mt-1 sm:mt-2 flex justify-end">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              openDeleteModal(room)
                            }}
                            className="text-red-500 cursor-pointer text-xs sm:text-sm md:text-[18px] flex items-center space-x-1"
                          >
                            <Trash2 className="w-4 h-4 sm:w-5 sm:h-6" />
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
          <div className={`lg:col-span-3 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col  h-full min-h-0 w-full lg:w-auto ${selectedChatRoom && !showChatList ? 'flex' : 'hidden lg:flex'} ${!selectedChatRoom ? 'hidden lg:flex' : ''}`}>
            {selectedChatRoom ? (
              <>
                {/* Chat Header */}
                <div className="flex-shrink-0 p-3 sm:p-4 lg:p-5 border-b border-gray-200 bg-white">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                    <div className="min-w-0 flex items-center gap-2 lg:gap-3">
                      <button
                        onClick={() => {
                          setShowChatList(true)
                          setSelectedChatRoom(null)
                        }}
                        className="lg:hidden p-1 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
                        title="სიაში დაბრუნება"
                      >
                        <ArrowLeft className="w-5 h-5 text-black" />
                      </button>
                      <div className="min-w-0">
                        <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold text-black">
                          საუბარი #{selectedChatRoom.id}
                        </h3>
                        <p className="text-xs sm:text-sm md:text-base lg:text-lg text-black break-words mt-0.5">
                          {selectedChatRoom.user?.name || selectedChatRoom.guestName || 'უცნობი მომხმარებელი'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {selectedChatRoom.status === 'PENDING' && (
                        <button
                          onClick={() => updateChatRoomStatus(selectedChatRoom.id, 'assign')}
                          className="px-2 sm:px-3 py-1 bg-[#1B3729] text-white rounded-md text-xs sm:text-sm md:text-[18px] font-bold hover:bg-[#2a4d3a] transition-colors whitespace-nowrap"
                        >
                          მიღება
                        </button>
                      )}
                      {selectedChatRoom.status === 'ACTIVE' && (
                        <button
                          onClick={() => updateChatRoomStatus(selectedChatRoom.id, 'close')}
                          className="px-2 sm:px-3 py-1 bg-red-500 text-white rounded-md text-xs sm:text-sm md:text-[18px] font-bold hover:bg-red-600 transition-colors whitespace-nowrap"
                        >
                          დახურვა
                        </button>
                      )}
                      {selectedChatRoom.status === 'CLOSED' && (
                        <button
                          onClick={() => updateChatRoomStatus(selectedChatRoom.id, 'reopen')}
                          className="px-2 sm:px-3 py-1 bg-green-500 text-white rounded-md text-xs sm:text-sm md:text-[18px] hover:bg-green-600 transition-colors whitespace-nowrap"
                        >
                          გახსნა
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 min-h-0 overflow-y-auto bg-gray-50 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  <div className="p-3 sm:p-4 lg:p-6">
                    {messages.length === 0 ? (
                      <div className="text-center text-gray-500 py-12 flex flex-col items-center justify-center">
                        <MessageCircle className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-black" />
                        <p className="text-xs sm:text-sm md:text-base">შეტყობინებები არ არის</p>
                      </div>
                    ) : (
                      <div className="space-y-3 sm:space-y-4 pb-4">
                        {messages.map((message, index) => (
                          <div
                            key={`${message.id}-${message.createdAt}-${index}`}
                            className={`flex ${message.isFromAdmin ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[85%] sm:max-w-[75%] lg:max-w-[65%] p-3 sm:p-4 rounded-lg shadow-sm ${
                                message.isFromAdmin
                                  ? 'bg-[#1B3729] text-white'
                                  : 'bg-white text-black border border-gray-200'
                              }`}
                            >
                              {/* Show sender name */}
                              <div className="flex items-center justify-between mb-1">
                                <p className={`text-xs sm:text-sm md:text-[18px] font-medium ${
                                  message.isFromAdmin ? 'text-white' : 'text-black'
                                }`}>
                                  {message.isFromAdmin 
                                    ? (message.admin?.name || 'ადმინისტრატორი')
                                    : (message.user?.name || selectedChatRoom?.guestName || 'მომხმარებელი')
                                  }
                                </p>
                              </div>
                              <p className="text-xs sm:text-sm md:text-[18px] break-words">{message.content}</p>
                              <p className={`text-xs sm:text-sm md:text-[18px] mt-1 ${
                                message.isFromAdmin ? 'text-white' : 'text-black'
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
                <div className="flex-shrink-0 p-3 sm:p-4 lg:p-5 border-t border-gray-200 bg-white">
                  <div className="flex gap-2 lg:gap-3">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="შეიყვანეთ თქვენი პასუხი..."
                      className="flex-1 p-3 sm:p-3.5 lg:p-4 text-sm sm:text-base text-black border placeholder:text-gray-500 border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-[#1B3729] focus:border-transparent"
                      rows={2}
                      disabled={isLoading}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={isLoading || !newMessage.trim()}
                      className="bg-[#1B3729] text-white px-4 sm:px-5 lg:px-6 py-3 sm:py-3.5 lg:py-4 rounded-lg hover:bg-[#2a4d3a] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex-shrink-0 flex items-center justify-center"
                    >
                      <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center p-4">
                  <MessageCircle className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-gray-300" />
                  <p className="text-sm sm:text-base md:text-[18px]">აირჩიეთ საუბარი</p>
                  <p className="text-sm sm:text-base md:text-[18px]">მარცხნივ ჩამონათვალიდან</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full">
              <h3 className="text-base sm:text-lg md:text-[18px] font-semibold text-black mb-3 sm:mb-4">
              საუბრის წაშლა
            </h3>
            <p className="text-sm sm:text-base text-black mb-3 sm:mb-4">
              ნამდვილად გსურთ საუბრის წაშლა? ეს მოქმედება შეუქცევადია.
            </p>
            <p className="text-xs sm:text-sm md:text-[18px] text-black mb-3 sm:mb-4 break-words">
              საუბარი #{chatRoomToDelete?.id} - {chatRoomToDelete?.user?.name || chatRoomToDelete?.guestName || 'უცნობი მომხმარებელი'}
            </p>
            <div className="mb-3 sm:mb-4">
              <label className="block text-xs sm:text-sm md:text-[18px] font-medium text-black mb-2">
                დასადასტურებლად შეიყვანეთ &quot;DELETE&quot;:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full p-2 text-sm sm:text-base text-black border border-gray-300 rounded-md placeholder:text-gray-500"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={deleteChatRoom}
                disabled={deleteConfirmText !== 'DELETE'}
                className="flex-1 bg-red-500 text-xs sm:text-sm md:text-[18px] font-bold text-white py-2 px-4 rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                წაშლა
              </button>
              <button
                onClick={closeDeleteModal}
                className="flex-1 bg-gray-300 text-xs sm:text-sm md:text-[18px] font-bold text-black py-2 px-4 rounded-md transition-colors"
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
