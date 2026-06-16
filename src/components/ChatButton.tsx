'use client'

import React from 'react'
import { MessageCircle } from 'lucide-react'
import ChatUnreadBadge from '@/components/ChatUnreadBadge'

interface ChatButtonProps {
  onClick: () => void
  unreadCount?: number
}

const ChatButton: React.FC<ChatButtonProps> = ({ onClick, unreadCount = 0 }) => {
  return (
    <button
      onClick={onClick}
      className="bg-[#1B3729] text-white p-4 rounded-full shadow-lg hover:bg-[#2a4d3a] transition-all duration-300 hover:scale-110 group relative"
    >
      <MessageCircle className="w-6 h-6" />
      <ChatUnreadBadge count={unreadCount} className="absolute -top-1 -right-1" />
      
      {/* Tooltip */}
      <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
        Live Chat
        <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
      </div>
    </button>
  )
}

export default ChatButton
