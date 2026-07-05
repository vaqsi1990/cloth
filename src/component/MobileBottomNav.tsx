'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, MessageCircle, User, ShoppingCart } from 'lucide-react'
import { useUserChatNotification } from '@/components/UserChatNotificationProvider'

type MobileBottomNavProps = {
  cartItemCount: number
  isAuthenticated: boolean
  profileHref: string
}

const MobileBottomNav = ({
  cartItemCount,
  isAuthenticated,
  profileHref,
}: MobileBottomNavProps) => {
  const pathname = usePathname()
  const { unreadCount } = useUserChatNotification()

  const isHome = pathname === '/'
  const isChats = pathname.startsWith('/account/chats')
  const isProfile =
    (pathname.startsWith('/account') && !pathname.startsWith('/account/chats')) ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/support') ||
    pathname.startsWith('/auth')
  const isCart = pathname === '/cart'

  const chatHref = isAuthenticated ? '/account/chats' : '/auth/signin'

  const navItemClass = (active: boolean) =>
    `flex flex-col items-center justify-center flex-1 min-w-0 py-1.5 gap-0.5 touch-manipulation transition-colors ${
      active ? 'text-[#1B3729]' : 'text-gray-500'
    }`

  const labelClass = (active: boolean) =>
    `text-[10px] leading-tight truncate max-w-full px-0.5 ${
      active ? 'font-semibold text-[#1B3729]' : 'text-gray-500'
    }`

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 hidden max-[425px]:flex"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="მთავარი ნავიგაცია"
    >
      <div className="flex items-stretch justify-around w-full h-16 px-1">
        <Link href="/" className={navItemClass(isHome)} aria-current={isHome ? 'page' : undefined}>
          <Home className="w-6 h-6 flex-shrink-0" strokeWidth={isHome ? 2.5 : 2} />
          <span className={labelClass(isHome)}>მთავარი</span>
        </Link>

        <Link
          href={chatHref}
          className={navItemClass(isChats)}
          aria-label="ჩათი"
          aria-current={isChats ? 'page' : undefined}
        >
          <span className="relative flex-shrink-0">
            <MessageCircle className="w-6 h-6" strokeWidth={isChats ? 2.5 : 2} />
            {isAuthenticated && unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-orange-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 px-0.5 flex items-center justify-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </span>
          <span className={labelClass(isChats)}>ჩათი</span>
        </Link>

        <Link
          href={profileHref}
          className={navItemClass(isProfile)}
          aria-current={isProfile ? 'page' : undefined}
        >
          <User className="w-6 h-6 flex-shrink-0" strokeWidth={isProfile ? 2.5 : 2} />
          <span className={labelClass(isProfile)}>{isAuthenticated ? 'შენ' : 'შესვლა'}</span>
        </Link>

        <Link href="/cart" className={navItemClass(isCart)} aria-current={isCart ? 'page' : undefined}>
          <span className="relative flex-shrink-0">
            <ShoppingCart className="w-6 h-6" strokeWidth={isCart ? 2.5 : 2} />
            {cartItemCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-orange-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 px-0.5 flex items-center justify-center">
                {cartItemCount > 99 ? '99+' : cartItemCount}
              </span>
            )}
          </span>
          <span className={labelClass(isCart)}>კალათა</span>
        </Link>
      </div>
    </nav>
  )
}

export default MobileBottomNav
