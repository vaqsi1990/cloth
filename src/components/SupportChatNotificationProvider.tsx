'use client'

import React, { createContext, useContext } from 'react'
import { useSession } from 'next-auth/react'
import { isAdminOrSupport } from '@/lib/roles'
import { useSupportChatNotifications } from '@/hooks/useSupportChatNotifications'

interface SupportChatNotificationContextValue {
  unreadCount: number
  latestUnreadChatRoomId: number | null
  soundEnabled: boolean
  toggleSound: () => void
  setActiveChatRoomId: (chatRoomId: number | null) => void
  acknowledgeActiveChat: () => void
}

const SupportChatNotificationContext = createContext<SupportChatNotificationContextValue>({
  unreadCount: 0,
  latestUnreadChatRoomId: null,
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
  const isStaffChatUser =
    status === 'authenticated' && isAdminOrSupport(session?.user?.role)
  const {
    unreadCount,
    latestUnreadChatRoomId,
    soundEnabled,
    toggleSound,
    setActiveChatRoomId,
    acknowledgeActiveChat,
  } = useSupportChatNotifications(isStaffChatUser)

  return (
    <SupportChatNotificationContext.Provider
      value={{
        unreadCount,
        latestUnreadChatRoomId,
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
