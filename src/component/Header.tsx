'use client'

import React, { useState, useEffect, Suspense, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Search, Menu, User, LogOut, ShoppingCart, ChevronRight, Plus, X } from 'lucide-react'
import Image from '@/component/AppImage'
import { useSession, signOut } from 'next-auth/react'
import { CHILDREN_PRODUCT_CATEGORIES, MEN_PRODUCT_CATEGORIES, WOMEN_PRODUCT_CATEGORIES } from '@/lib/product-categories'
import { resetShopBrowserFilters } from '@/lib/shop-browser-state'
import MobileBottomNav from '@/component/MobileBottomNav'

const HeaderContent = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
 
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState<string | null>(null)
  const [isMobileUserDropdownOpen, setIsMobileUserDropdownOpen] = useState(false)
  const [isDesktopUserDropdownOpen, setIsDesktopUserDropdownOpen] = useState(false)
  const [cartItemCount, setCartItemCount] = useState(0)
  const [searchValue, setSearchValue] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('ქალი')
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null)
  const { data: session, status } = useSession()
  const isAuthenticated = status === 'authenticated' && !!session
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const headerRef = useRef<HTMLElement>(null)
  const [headerBottom, setHeaderBottom] = useState(0)

  const updateHeaderBottom = useCallback(() => {
    if (!headerRef.current) return
    setHeaderBottom(headerRef.current.getBoundingClientRect().bottom)
  }, [])

  useEffect(() => {
    updateHeaderBottom()
    window.addEventListener('resize', updateHeaderBottom)
    return () => window.removeEventListener('resize', updateHeaderBottom)
  }, [isSearchOpen, isMobileMenuOpen, updateHeaderBottom])

  useEffect(() => {
    if (!isMobileMenuOpen) return
    const frameId = window.requestAnimationFrame(updateHeaderBottom)
    return () => window.cancelAnimationFrame(frameId)
  }, [isMobileMenuOpen, updateHeaderBottom])

  // Update active category based on URL params
  useEffect(() => {
    const gender = searchParams?.get('gender')
    if (gender === 'women') {
      setActiveCategory('ქალი')
    } else if (gender === 'men') {
      setActiveCategory('მამაკაცი')
    } else if (gender === 'children') {
      setActiveCategory('ბავშვები')
    }
  }, [searchParams])

  const [openMain, setOpenMain] = useState(false)
  const [activeSub, setActiveSub] = useState<string | null>(null)
  let closeTimeout: NodeJS.Timeout

  // --- CART COUNT POLLING ---
  const fetchCartCount = async () => {
    if (!session?.user?.id) {
      setCartItemCount(0)
      return
    }

    try {
      const res = await fetch('/api/cart')
      const data = await res.json()
      if (data.success && data.cart) setCartItemCount(data.cart.totalItems || 0)
    } catch (err) {
      console.error('Cart fetch error:', err)
    }
  }

  useEffect(() => {
    if (session?.user?.id) {
      fetchCartCount()
      // Poll cart count every 10 seconds (reduced frequency)
      const interval = setInterval(fetchCartCount, 10000)
      return () => clearInterval(interval)
    }
  }, [session?.user?.id])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (closeTimeout) {
        clearTimeout(closeTimeout)
      }
    }
  }, [])

  // Close mobile user dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      const target = event.target as HTMLElement
      if (isMobileUserDropdownOpen && !target.closest('.mobile-user-dropdown')) {
        setIsMobileUserDropdownOpen(false)
      }
    }

    if (isMobileUserDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isMobileUserDropdownOpen])

  // Close desktop user dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      const target = event.target as HTMLElement
      if (isDesktopUserDropdownOpen && !target.closest('.desktop-user-dropdown')) {
        setIsDesktopUserDropdownOpen(false)
      }
    }

    if (isDesktopUserDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isDesktopUserDropdownOpen])

  // --- MENU HANDLERS ---
  const handleMouseEnterMain = () => {
    clearTimeout(closeTimeout)
    setOpenMain(true)
  }

  const handleMouseLeaveMain = () => {
    closeTimeout = setTimeout(() => {
      setOpenMain(false)
      setActiveSub(null)
    }, 150)
  }

  const handleMouseEnterDropdown = () => {
    clearTimeout(closeTimeout)
  }

  const handleMouseLeaveDropdown = () => {
    closeTimeout = setTimeout(() => {
      setOpenMain(false)
      setActiveSub(null)
    }, 150)
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((open) => {
      const next = !open
      if (next) {
        setIsMobileUserDropdownOpen(false)
        setIsSearchOpen(false)
      }
      return next
    })
  }
  const toggleSearch = () => setIsSearchOpen(!isSearchOpen)
  const toggleMobileDropdown = (dropdown: string) =>
    setMobileDropdownOpen(mobileDropdownOpen === dropdown ? null : dropdown)

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
    setMobileDropdownOpen(null)
  }

  const closeAllOverlays = () => {
    closeMobileMenu()
    setIsSearchOpen(false)
    setIsMobileUserDropdownOpen(false)
    setIsDesktopUserDropdownOpen(false)
  }

  const handleLogoClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    closeAllOverlays()
    event.preventDefault()
    resetShopBrowserFilters()
    router.replace('/')
  }

  useEffect(() => {
    closeAllOverlays()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  useEffect(() => {
    if (!isMobileMenuOpen) {
      document.body.style.overflow = ''
      return
    }

    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileMenuOpen])

  const newProductHref = !isAuthenticated
    ? '/auth/signup'
    : session.user.role === 'ADMIN'
      ? '/admin/products/new'
      : session.user.role === 'SUPPORT'
        ? '/support/products/new'
        : '/account/products/new'

  const profileHref = !isAuthenticated
    ? '/auth/signin'
    : session.user.role === 'ADMIN'
      ? '/admin'
      : session.user.role === 'SUPPORT'
        ? '/support'
        : '/account/profile'

  const handleSearchSubmit = (event?: React.FormEvent) => {
    event?.preventDefault()
    const query = searchValue.trim()
    if (!query) return
    setIsSearchOpen(false)
    setIsMobileMenuOpen(false)
    router.push(`/shop?search=${encodeURIComponent(query)}`)
  }

  return (
    <>
    <header ref={headerRef} className="sticky bg-[#1B3729] text-gray-900 shadow-sm top-0 z-50">
      <div className="container max-w-7xl mx-auto px-3 py-3 sm:px-4 sm:py-4 lg:px-6">
        <div className="flex items-center justify-between gap-2 sm:gap-4 min-w-0">
          {/* --- Logo --- */}
          <Link
            href="/"
            onClick={handleLogoClick}
            className="group flex items-center space-x-3 transition-all duration-300 hover:scale-105 flex-shrink-0"
          >
            <div className="relative overflow-hidden rounded-full">
              <Image
                src="/logo.jpg"
                className="w-[50px] h-[50px] md:w-16 md:h-16 rounded-full transition-transform duration-300 group-hover:scale-110"
                alt="logo"
                width={64}
                height={64}
              />
            </div>
         
          </Link>

          {/* --- Desktop Search + Add Product (logged in only) --- */}
          <div className="hidden lg:flex flex-1 items-center gap-3 max-w-2xl mx-8 min-w-0">
            <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-0">
              <input
                type="text"
                placeholder="მოძებნე სასურველი პროდუქტი"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="w-full bg-white pl-10 pr-4 py-3 text-black border placeholder:text-gray-500 border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
              />
              <button type="submit" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                <Search className="w-5 h-5" />
              </button>
            </form>
            <Link
              href={newProductHref}
              className="flex-shrink-0 inline-flex items-center gap-2 bg-white text-[#1B3729] font-bold text-[16px] px-4 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors whitespace-nowrap"
            >
              <Plus className="w-5 h-5" />
              <span>ახალი პროდუქტი</span>
            </Link>
          </div>

          {/* --- Desktop Navigation Links and Icons --- */}
          <nav className="hidden lg:flex items-center space-x-6 flex-shrink-0">
            {/* Navigation Links */}
            <Link href="/" className="text-white font-bold transition-colors  text-[16px] md:text-[18px] font-regular">
              მთავარი
            </Link>
            <Link href="/shop" className="text-white font-bold transition-colors  text-[16px] md:text-[18px] font-regular">
              პროდუქტები
            </Link>
            <Link href="/about" className="text-white font-bold transition-colors  text-[16px] md:text-[18px] font-regular">
              ჩვენს შესახებ
            </Link>
            <Link href="/rules" className="text-white font-bold transition-colors  text-[16px] md:text-[18px] font-regular">
              წესები
            </Link>

            {/* Icons */}
            <div className="flex items-center space-x-4 ml-2">
            

              {/* Cart Icon */}
              <Link href="/cart" className="relative p-2 text-white  transition-colors">
                <ShoppingCart className="w-6 h-6" />
                {cartItemCount > 0 && (
                  <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {cartItemCount}
                  </span>
                )}
              </Link>

              {/* User Icon */}
              {isAuthenticated ? (
                <div className="relative group desktop-user-dropdown">
                  <button
                    onClick={() => setIsDesktopUserDropdownOpen(!isDesktopUserDropdownOpen)}
                    className="p-2 text-white font-bold cursor-pointer transition-colors touch-manipulation"
                    aria-label="User menu"
                  >
                    <User className="w-6 h-6" />
                  </button>
                  <div className={`absolute -right-20 top-full mt-2 w-54 bg-white border border-gray-200 rounded-xl shadow-xl z-50 transition-all duration-300 ${isDesktopUserDropdownOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
                    }`}>
                    <div className="py-2 text-black">
                      <p className="px-4 font-semibold">{session.user.name}</p>
                      {session.user.role === 'ADMIN' ? (
                        <Link
                          href="/admin"
                          className="block md:text-[20px] text-[16px] px-4 py-2 hover:bg-gray-100"
                          onClick={() => setIsDesktopUserDropdownOpen(false)}
                        >
                          ადმინისტრატორი
                        </Link>
                      ) : session.user.role === 'SUPPORT' ? (
                        <Link
                          href="/support"
                          className="block md:text-[20px] text-[16px] px-4 py-2 hover:bg-gray-100"
                          onClick={() => setIsDesktopUserDropdownOpen(false)}
                        >
                          საფორთი
                        </Link>
                      ) : (
                        <Link
                          href="/account/profile"
                          className="block  md:text-[20px] text-[16px] hover:bg-gray-100 text-black px-4 py-2"
                          onClick={() => setIsDesktopUserDropdownOpen(false)}
                        >
                          პროფილი
                        </Link>
                      )}
                      <button
                        onClick={() => {
                          setIsDesktopUserDropdownOpen(false)
                          signOut()
                        }}
                        className="w-full text-left cursor-pointer md:text-[20px] text-[16px] px-4 py-2 hover:bg-gray-100 flex items-center space-x-2"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>გასვლა</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <Link href="/auth/signin" className="p-2 text-white font-bold  transition-colors">
                  <User className="w-6 h-6" />
                </Link>
              )}
            </div>
          </nav>

          {/* --- Mobile/Tablet: Search Icon and Menu --- */}
          <div className="flex lg:hidden items-center gap-1 sm:gap-2 flex-shrink-0">
            {/* Hidden below 420px — moved to bottom nav */}
            <div className="hidden min-[426px]:flex items-center gap-1 sm:gap-2">
            <Link
              href={newProductHref}
              onClick={closeAllOverlays}
              className="inline-flex items-center gap-1 bg-white text-[#1B3729] font-bold text-xs sm:text-sm px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg whitespace-nowrap"
              aria-label="ახალი პროდუქტი"
            >
              <Plus className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">ახალი</span>
            </Link>

            {/* Account Section */}
            {isAuthenticated ? (
              <div className="relative mobile-user-dropdown">
                <button
                  onClick={() => setIsMobileUserDropdownOpen(!isMobileUserDropdownOpen)}
                  className="p-2 text-white touch-manipulation"
                  aria-label="User menu"
                >
                  <User className="w-5 h-5" />
                </button>
                {isMobileUserDropdownOpen && (
                  <div className="absolute left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-50">
                    <div className="py-2">
                      <p className="px-4 py-2 font-semibold text-black">{session.user.name}</p>
                      {session.user.role === 'ADMIN' ? (
                        <Link
                          href="/admin"
                          className="block px-4 py-2 text-black hover:bg-gray-100"
                          onClick={() => setIsMobileUserDropdownOpen(false)}
                        >
                          ადმინისტრატორი
                        </Link>
                      ) : session.user.role === 'SUPPORT' ? (
                        <Link
                          href="/support"
                          className="block px-4 py-2 text-black hover:bg-gray-100"
                          onClick={() => setIsMobileUserDropdownOpen(false)}
                        >
                          საფორთი
                        </Link>
                      ) : (
                        <Link
                          href="/account/profile"
                          className="block px-4 py-2 text-black hover:bg-gray-100"
                          onClick={() => setIsMobileUserDropdownOpen(false)}
                        >
                          პროფილი
                        </Link>
                      )}
                      <button
                        onClick={() => {
                          setIsMobileUserDropdownOpen(false)
                          signOut()
                        }}
                        className="w-full text-left px-4 py-2 text-black hover:bg-gray-100 flex items-center space-x-2"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>გასვლა</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/auth/signin"
                className="p-2 text-white touch-manipulation"
                aria-label="შესვლა"
              >
                <User className="w-5 h-5" />
              </Link>
            )}

            <Link href="/cart" onClick={closeAllOverlays} className="relative p-2 text-white touch-manipulation">
              <ShoppingCart className="w-5 h-5" />
              {cartItemCount > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </Link>
            </div>

            <button
              type="button"
              onClick={toggleSearch}
              className="p-2 text-white touch-manipulation"
              aria-label="ძებნა"
            >
              <Search className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={toggleMobileMenu}
              className="p-2 text-white touch-manipulation"
              aria-label={isMobileMenuOpen ? 'მენიუს დახურვა' : 'მენიუს გახსნა'}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* --- Search Bar (Mobile/Tablet) --- */}
      {isSearchOpen && (
        <div className="lg:hidden bg-white border-t border-gray-200 py-4">
          <div className="container mx-auto px-4">
            <form onSubmit={handleSearchSubmit} className="relative max-w-md mx-auto">
              <input
                type="text"
                placeholder="მოძებნე სასურველი პროდუქტი"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="w-full placeholder:text-gray-400 md:text-[18px] text-[16px] text-gray-900 bg-gray-50 pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 "
              />
              <button type="submit" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                <Search className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- Mobile Menu --- */}
      {isMobileMenuOpen && (
        <>
          <button
            type="button"
            className="lg:hidden fixed inset-x-0 bottom-0 max-[425px]:bottom-16 z-40 bg-black/40"
            style={{ top: headerBottom }}
            onClick={closeMobileMenu}
            aria-label="მენიუს დახურვა"
          />
          <div
            className="lg:hidden fixed inset-x-0 bottom-0 max-[425px]:bottom-16 z-50 flex flex-col bg-white border-t border-gray-200 shadow-xl"
            style={{ top: headerBottom }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
              <span className="text-base font-semibold text-black">მენიუ</span>
              <button
                type="button"
                onClick={closeMobileMenu}
                className="p-2 -mr-2 text-gray-600 touch-manipulation"
                aria-label="დახურვა"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-4 sm:py-4">
            <nav className="space-y-1">
              <Link
                href="/"
                onClick={(e) => {
                  closeMobileMenu()
                  handleLogoClick(e)
                }}
                className="block px-3 py-2.5 text-black hover:bg-gray-100 rounded-lg text-base"
              >
                მთავარი
              </Link>
              <Link
                href="/shop"
                onClick={closeMobileMenu}
                className="block px-3 py-2.5 text-black hover:bg-gray-100 rounded-lg text-base"
              >
                პროდუქტები
              </Link>
              <Link
                href={newProductHref}
                onClick={closeMobileMenu}
                className="block px-3 py-2.5 text-black hover:bg-gray-100 rounded-lg text-base max-[425px]:flex min-[426px]:hidden items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                ახალი პროდუქტი
              </Link>

              {/* Menu Categories */}
              <div className="space-y-1 pt-1">
                {['ქალი', 'მამაკაცი', 'ბავშვები'].map((item) => (
                  <div key={item}>
                    <button
                      type="button"
                      onClick={() => toggleMobileDropdown(item)}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-black hover:bg-gray-100 rounded-lg text-base touch-manipulation"
                    >
                      <span>{item}</span>
                      <ChevronRight className={`w-4 h-4 flex-shrink-0 transition-transform ${mobileDropdownOpen === item ? 'rotate-90' : ''}`} />
                    </button>
                    {mobileDropdownOpen === item && (
                      <div className="pl-2 sm:pl-4 space-y-0.5 mt-0.5 max-h-[50vh] overflow-y-auto overscroll-contain">
                        {item === 'ქალი' && (
                          <>
                            <Link href="/shop?gender=women" onClick={closeMobileMenu} className="block px-3 py-2 text-black font-semibold hover:bg-gray-100 rounded-lg text-sm sm:text-base">
                              ყველა
                            </Link>
                            {WOMEN_PRODUCT_CATEGORIES.map((category, index) => (
                              <Link
                                key={category.slug}
                                href={`/shop?gender=women&category=${encodeURIComponent(category.slug)}`}
                                onClick={closeMobileMenu}
                                className="block px-3 py-2 text-black hover:bg-gray-100 rounded-lg text-sm sm:text-base break-words"
                              >
                                {index + 1}. {category.name}
                              </Link>
                            ))}
                          </>
                        )}
                        {item === 'მამაკაცი' && (
                          <>
                            <Link href="/shop?gender=men" onClick={closeMobileMenu} className="block px-3 py-2 text-black font-semibold hover:bg-gray-100 rounded-lg text-sm sm:text-base">
                              ყველა
                            </Link>
                            {MEN_PRODUCT_CATEGORIES.map((category, index) => (
                              <Link
                                key={category.slug}
                                href={`/shop?gender=men&category=${encodeURIComponent(category.slug)}`}
                                onClick={closeMobileMenu}
                                className="block px-3 py-2 text-black hover:bg-gray-100 rounded-lg text-sm sm:text-base break-words"
                              >
                                {index + 1}. {category.name}
                              </Link>
                            ))}
                          </>
                        )}
                        {item === 'ბავშვები' && (
                          <>
                            <Link href="/shop?gender=children" onClick={closeMobileMenu} className="block px-3 py-2 text-black font-semibold hover:bg-gray-100 rounded-lg text-sm sm:text-base">
                              ყველა
                            </Link>
                            {CHILDREN_PRODUCT_CATEGORIES.map((category, index) => (
                              <Link
                                key={category.slug}
                                href={`/shop?gender=children&category=${encodeURIComponent(category.slug)}`}
                                onClick={closeMobileMenu}
                                className="block px-3 py-2 text-black hover:bg-gray-100 rounded-lg text-sm sm:text-base break-words"
                              >
                                {index + 1}. {category.name}
                              </Link>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <Link href="/about" onClick={closeMobileMenu} className="block px-3 py-2.5 text-black hover:bg-gray-100 rounded-lg text-base">
                ჩვენს შესახებ
              </Link>
              <Link href="/rules" onClick={closeMobileMenu} className="block px-3 py-2.5 text-black hover:bg-gray-100 rounded-lg text-base">
                წესები
              </Link>
            </nav>
            </div>
          </div>
        </>
      )}

      {/* --- Category Navigation Bar --- */}
      {/* --- Category Navigation Bar (DESKTOP styled like image) --- */}
      <div className=" bg-[#1B3729] shadow-md hidden lg:block relative">
        <div className="container mx-auto px-6">
          <nav className="flex  items-center justify-center gap-10">
            <div className="h-9 w-[2px] bg-white/50"></div>
            {['ქალი', 'მამაკაცი', 'ბავშვები'].map((category, index) => {
              const isActive = activeCategory === category
              const isHovered = hoveredCategory === category
              return (
                <React.Fragment key={category}>
                  {index > 0 && (
                    <div className="h-9 w-[2px] bg-white/50"></div>
                  )}
                  <div
                    className="relative"
                    onMouseEnter={() => setHoveredCategory(category)}
                    onMouseLeave={() => setHoveredCategory(null)}
                  >
                    <Link
                      href={`/shop?gender=${category === 'ქალი'
                        ? 'women'
                        : category === 'მამაკაცი'
                          ? 'men'
                          : 'children'
                        }`}
                      onClick={() => setActiveCategory(category)}
                      className={`px-12 md:text-[20px] text-[16px] py-4  transition-all text-center block ${isActive
                          ? ' text-white text-underline font-bold'
                          : 'text-white text-underline'
                        }`}
                    >
                      {category}
                    </Link>
                    
                    {/* Dropdown Menu */}
                    {isHovered && (
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-0 bg-white rounded-xl shadow-xl border border-gray-200 w-80 z-50 max-h-96 overflow-y-auto">
                        <div className="py-2">
                          {category === 'ქალი' && (
                            <>
                              <Link href="/shop?gender=women" className="block px-4 py-2 text-gray-900 hover:bg-gray-100 text-sm font-semibold">
                                ყველა
                              </Link>
                              {WOMEN_PRODUCT_CATEGORIES.map((womenCategory, index) => (
                                <Link
                                  key={womenCategory.slug}
                                  href={`/shop?gender=women&category=${encodeURIComponent(womenCategory.slug)}`}
                                  className="block px-4 py-2 text-gray-900 hover:bg-gray-100 text-sm"
                                >
                                  {index + 1}. {womenCategory.name}
                                </Link>
                              ))}
                            </>
                          )}
                          {category === 'მამაკაცი' && (
                            <>
                              <Link href="/shop?gender=men" className="block px-4 py-2 text-gray-900 hover:bg-gray-100 text-sm font-semibold">
                                ყველა
                              </Link>
                              {MEN_PRODUCT_CATEGORIES.map((menCategory, index) => (
                                <Link
                                  key={menCategory.slug}
                                  href={`/shop?gender=men&category=${encodeURIComponent(menCategory.slug)}`}
                                  className="block px-4 py-2 text-gray-900 hover:bg-gray-100 text-sm"
                                >
                                  {index + 1}. {menCategory.name}
                                </Link>
                              ))}
                            </>
                          )}
                          {category === 'ბავშვები' && (
                            <>
                              <Link href="/shop?gender=children" className="block px-4 py-2 text-gray-900 hover:bg-gray-100 text-sm font-semibold">
                                ყველა
                              </Link>
                              {CHILDREN_PRODUCT_CATEGORIES.map((childrenCategory, index) => (
                                <Link
                                  key={childrenCategory.slug}
                                  href={`/shop?gender=children&category=${encodeURIComponent(childrenCategory.slug)}`}
                                  className="block px-4 py-2 text-gray-900 hover:bg-gray-100 text-sm"
                                >
                                  {index + 1}. {childrenCategory.name}
                                </Link>
                              ))}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </React.Fragment>
              )
            })}
            <div className="h-9 w-[2px] bg-white/50"></div>
          </nav>
        </div>
      </div>


    </header>

    <MobileBottomNav
      cartItemCount={cartItemCount}
      isAuthenticated={isAuthenticated}
      profileHref={profileHref}
    />
    </>
  )
}

const Header = () => {
  return (
    <Suspense fallback={
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-xl font-bold text-black">
              Dressla.ge
            </Link>
          </div>
        </div>
      </header>
    }>
      <HeaderContent />
    </Suspense>
  )
}

export default Header
