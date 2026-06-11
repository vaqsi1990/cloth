'use client'

import React, { createContext, useContext } from 'react'
import { useSession } from 'next-auth/react'
import { useSupportChatNotifications } from '@/hooks/useSupportChatNotifications'

interface SupportChatNotificationContextValue {
  unreadCount: number
  soundEnabled: boolean
  toggleSound: () => void
  setActiveChatRoomId: (chatRoomId: number | null) => void
  acknowledgeActiveChat: () => void
}

const SupportChatNotificationContext = createContext<SupportChatNotificationContextValue>({
  unreadCount: 0,
  soundEnabled: true,
  toggleSound: () => {},
  setActiveChatRoomId: () => {},
  acknowledgeActiveChat: () => {},
})

export function useSupportChatNotification() {
  return useContext(SupportChatNotificationContext)
}

export default function SupportChatNotificationProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const isSupportUser = status === 'authenticated' && session?.user?.role === 'SUPPORT'
  const {
    unreadCount,
    soundEnabled,
    toggleSound,
    setActiveChatRoomId,
    acknowledgeActiveChat,
  } = useSupportChatNotifications(isSupportUser)

  return (
    <SupportChatNotificationContext.Provider
      value={{
        unreadCount,
        soundEnabled,
        toggleSound,
        setActiveChatRoomId,
        acknowledgeActiveChat,
      }}
    >
      {children}
    </SupportChatNotificationContext.Provider>
  )
}
