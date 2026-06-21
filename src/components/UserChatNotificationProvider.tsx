'use client'

import React, { createContext, useContext } from 'react'
import { useSession } from 'next-auth/react'
import { isAdminOrSupport } from '@/lib/roles'
import { useChatNotifications } from '@/hooks/useChatNotifications'

interface UserChatNotificationContextValue {
  unreadCount: number
  latestUnreadChatRoomId: number | null
  soundEnabled: boolean
  toggleSound: () => void
  setActiveChatRoomId: (chatRoomId: number | null) => void
  acknowledgeActiveChat: () => void
}

const UserChatNotificationContext = createContext<UserChatNotificationContextValue>({
  unreadCount: 0,
  latestUnreadChatRoomId: null,
  soundEnabled: true,
  toggleSound: () => {},
  setActiveChatRoomId: () => {},
  acknowledgeActiveChat: () => {},
})

export function useUserChatNotification() {
  return useContext(UserChatNotificationContext)
}

export default function UserChatNotificationProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const isStaffChatUser =
    status === 'authenticated' && isAdminOrSupport(session?.user?.role)
  const isRegularChatUser = status === 'authenticated' && !isStaffChatUser
  const {
    unreadCount,
    latestUnreadChatRoomId,
    soundEnabled,
    toggleSound,
    setActiveChatRoomId,
    acknowledgeActiveChat,
  } = useChatNotifications({
    enabled: isRegularChatUser,
    endpoint: '/api/chat/unread-count',
    storageKey: 'user-chat-sound-enabled',
  })

  return (
    <UserChatNotificationContext.Provider
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
    </UserChatNotificationContext.Provider>
  )
}
