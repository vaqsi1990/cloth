'use client'

import React from 'react'

interface ChatTypingIndicatorProps {
  show: boolean
  align?: 'start' | 'end'
}

const DOT_COUNT = 10

const ChatTypingIndicator: React.FC<ChatTypingIndicatorProps> = ({
  show,
  align = 'start',
}) => {
  if (!show) return null

  return (
    <div
      className={`flex ${align === 'end' ? 'justify-end' : 'justify-start'} px-1 py-1`}
      aria-label="ბეჭდავს"
      role="status"
    >
      <div className="inline-flex items-center px-3 py-2 rounded-2xl bg-gray-200/90 border border-gray-200 min-h-[36px]">
        <span className="inline-flex items-end gap-0.5 text-gray-600 text-xl sm:text-2xl font-bold leading-none tracking-tight">
          {Array.from({ length: DOT_COUNT }).map((_, index) => (
            <span
              key={index}
              className="inline-block animate-bounce"
              style={{
                animationDelay: `${index * 100}ms`,
                animationDuration: '0.85s',
              }}
              aria-hidden="true"
            >
              .
            </span>
          ))}
        </span>
      </div>
    </div>
  )
}

export default ChatTypingIndicator
