'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Plus, MessageCircle, User, ShoppingCart, LogOut } from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'
import { useUserChatNotification } from '@/components/UserChatNotificationProvider'

type MobileBottomNavProps = {
  cartItemCount: number
  isAuthenticated: boolean
  profileHref: string
  newProductHref: string
}

const MobileBottomNav = ({
  cartItemCount,
  isAuthenticated,
  profileHref,
  newProductHref,
}: MobileBottomNavProps) => {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { unreadCount } = useUserChatNotification()
  const [mounted, setMounted] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setIsProfileMenuOpen(false)
  }, [pathname])

  // Avoid SSR/client mismatch for session-dependent hrefs, labels, and badges.
  const showAuthenticated = mounted && isAuthenticated
  const addProductHref = mounted ? newProductHref : '/auth/signup'
  const accountHref = mounted ? profileHref : '/auth/signin'
  const chatHref = showAuthenticated ? '/account/chats' : '/auth/signin'
  const profileLabel = showAuthenticated
    ? session?.user?.name?.trim() || 'პროფილი'
    : 'შესვლა'
  const showUnreadBadge = showAuthenticated && unreadCount > 0
  const showCartBadge = mounted && cartItemCount > 0

  const isHome = mounted && pathname === '/'
  const isNewProduct =
    mounted &&
    (pathname === newProductHref || pathname.endsWith('/products/new'))
  const isChats = mounted && pathname.startsWith('/account/chats')
  const isProfile =
    mounted &&
    ((pathname.startsWith('/account') && !pathname.startsWith('/account/chats')) ||
      pathname.startsWith('/admin') ||
      pathname.startsWith('/support') ||
      pathname.startsWith('/auth'))
  const isCart = mounted && pathname === '/cart'

  const navItemClass = (active: boolean) =>
    `flex flex-col items-center justify-center flex-1 min-w-0 py-1.5 gap-0.5 touch-manipulation transition-colors ${active ? 'text-[#1B3729]' : 'text-gray-500'
    }`

  const labelClass = (active: boolean) =>
    `text-[9px] leading-tight text-center line-clamp-2 max-w-full px-0.5 ${active ? 'font-semibold text-[#1B3729]' : 'text-gray-500'
    }`

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="მთავარი ნავიგაცია"
    >
      <div className="flex items-stretch justify-around w-full h-16 px-0.5">
        <Link
          href="/"
          className={navItemClass(isHome)}
          aria-current={isHome ? 'page' : undefined}
        >
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
            {showUnreadBadge && (
              <span className="absolute -top-1.5 -right-2 bg-orange-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 px-0.5 flex items-center justify-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </span>
          <span className={labelClass(isChats)}>ჩათი</span>
        </Link>
        <Link
          href={addProductHref}
          className={navItemClass(isNewProduct)}
          aria-current={isNewProduct ? 'page' : undefined}
          aria-label="ახალი პროდუქტის დამატება"
        >
          <Plus className="w-6 h-6 flex-shrink-0" strokeWidth={isNewProduct ? 2.5 : 2} />
          <span className={labelClass(isNewProduct)}>+ დამატება</span>
        </Link>
        {showAuthenticated ? (
          <div className="relative flex flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setIsProfileMenuOpen((open) => !open)}
              className={navItemClass(isProfile)}
              aria-expanded={isProfileMenuOpen}
              aria-haspopup="menu"
              aria-label="პროფილის მენიუ"
            >
              <User className="w-6 h-6 flex-shrink-0" strokeWidth={isProfile ? 2.5 : 2} />
              <span className={labelClass(isProfile)}>{profileLabel}</span>
            </button>
            {isProfileMenuOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-40"
                  aria-label="მენიუს დახურვა"
                  onClick={() => setIsProfileMenuOpen(false)}
                />
                <div className="absolute bottom-full left-1/2 z-50 mb-2 w-48 -translate-x-1/2 rounded-xl border border-gray-200 bg-white shadow-xl">
                  <div className="py-2">
                    <p className="px-4 py-2 font-semibold text-black">{session?.user?.name}</p>
                    <Link
                      href={accountHref}
                      className="block px-4 py-2 text-black hover:bg-gray-100"
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      {session?.user?.role === 'ADMIN'
                        ? 'ადმინისტრატორი'
                        : session?.user?.role === 'SUPPORT'
                          ? 'საფორთი'
                          : 'პროფილი'}
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false)
                        signOut()
                      }}
                      className="flex w-full items-center space-x-2 px-4 py-2 text-left text-black hover:bg-gray-100"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>გასვლა</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <Link
            href={accountHref}
            className={navItemClass(isProfile)}
            aria-current={isProfile ? 'page' : undefined}
          >
            <User className="w-6 h-6 flex-shrink-0" strokeWidth={isProfile ? 2.5 : 2} />
            <span className={labelClass(isProfile)}>{profileLabel}</span>
          </Link>
        )}

        <Link href="/cart" className={navItemClass(isCart)} aria-current={isCart ? 'page' : undefined}>
          <span className="relative flex-shrink-0">
            <ShoppingCart className="w-6 h-6" strokeWidth={isCart ? 2.5 : 2} />
            {showCartBadge && (
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
