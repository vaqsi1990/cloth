'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import ChatUnreadBadge from '@/components/ChatUnreadBadge'
import { getAccountNavItems } from '@/components/account/account-nav'
import { useUserChatUnreadCount } from '@/hooks/useUserChatUnreadCount'
import type { AccountSection } from '@/lib/account-routes'

function sectionFromPathname(pathname: string): AccountSection | null {
  if (!pathname.startsWith('/account')) return null
  if (pathname.startsWith('/account/products')) return 'products'

  const segment = pathname.split('/')[2]
  const items = getAccountNavItems(undefined)
  if (items.some((item) => item.id === segment)) {
    return segment as AccountSection
  }
  return null
}

export default function AccountShell({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const currentSection = sectionFromPathname(pathname)
  const isChatsSection = currentSection === 'chats'
  const navItems = getAccountNavItems(session?.user?.role)
  const { unreadCount: polledChatUnread } = useUserChatUnreadCount(!!session?.user?.id)
  const [localChatUnreadCount, setLocalChatUnreadCount] = useState(0)
  const chatsUnreadCount = Math.max(polledChatUnread, localChatUnreadCount)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    }
  }, [status, router])

  useEffect(() => {
    if (!session?.user?.id) {
      setLocalChatUnreadCount(0)
      return
    }

    let cancelled = false

    const refreshLocalUnread = async () => {
      try {
        const response = await fetch('/api/chat', { cache: 'no-store' })
        const data = await response.json()
        if (!cancelled && data.success) {
          const rooms = Array.isArray(data.chatRooms) ? data.chatRooms : []
          setLocalChatUnreadCount(rooms.filter((room: { is_unread?: boolean }) => room.is_unread).length)
        }
      } catch {
        // ignore background sync errors
      }
    }

    void refreshLocalUnread()
    const interval = setInterval(refreshLocalUnread, 10000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [session?.user?.id])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-gray-300 border-t-[#1B3729] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-black">იტვირთება...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const renderNav = (layout: 'vertical' | 'horizontal') =>
    navItems.map((item) => {
      const isActive = currentSection === item.id
      const isChatsTab = item.id === 'chats'
      const baseClass =
        layout === 'vertical'
          ? 'w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-colors text-[16px] overflow-visible'
          : 'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-[14px] sm:text-[16px] whitespace-nowrap shrink-0 overflow-visible'

      return (
        <Link
          key={item.id}
          href={item.href}
          className={`${baseClass} ${
            isActive ? 'bg-[#1B3729] text-white' : 'text-black hover:bg-gray-50'
          }`}
        >
          <span className="flex items-center gap-3 min-w-0">
            <item.icon className="w-5 h-5 shrink-0" />
            <span>{item.label}</span>
          </span>
          {isChatsTab && (
            <ChatUnreadBadge
              count={chatsUnreadCount}
              className="relative shrink-0"
              pulse={!isActive}
            />
          )}
        </Link>
      )
    })

  return (
    <div className="min-h-screen">
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-black">ჩემი ანგარიში</h1>
              <p className="text-red-600 font-semibold md:text-[22px] text-[20px] mt-2">
                ადმინისტრაციის სამუშაო საათები 08:00 - 22:00
              </p>
              <p className="text-black md:text-[18px] text-[16px] mt-1">
                მოგესალმებით, {session.user.name}
              </p>
            </div>
            <Link
              href="/"
              className="px-4 py-2 bg-[#1B3729] md:text-[18px] text-[16px] font-bold uppercase tracking-widest text-white rounded-lg transition-colors"
            >
              მთავარ გვერდზე დაბრუნება
            </Link>
          </div>
        </div>
      </div>

      <div className={`container mx-auto px-4 ${isChatsSection ? 'py-4 lg:py-6' : 'py-8'}`}>
        {isChatsSection ? (
          <div className="w-full min-w-0 space-y-4">
            <div className="overflow-x-auto -mx-1 px-1">
              <div className="bg-white rounded-xl p-2 shadow-sm border border-gray-100 inline-flex min-w-full md:flex md:flex-wrap gap-1">
                {renderNav('horizontal')}
              </div>
            </div>
            {children}
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="lg:w-64 flex-shrink-0">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-black">
                <nav className="space-y-2 overflow-visible">{renderNav('vertical')}</nav>
              </div>
            </div>
            <div className="flex-1 min-w-0">{children}</div>
          </div>
        )}
      </div>
    </div>
  )
}
