'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, Menu, User, LogOut, ShoppingCart, ChevronRight, Heart } from 'lucide-react'
import Image from 'next/image'
import { useSession, signOut } from 'next-auth/react'

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
 
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState<string | null>(null)
  const [isMobileUserDropdownOpen, setIsMobileUserDropdownOpen] = useState(false)
  const [isDesktopUserDropdownOpen, setIsDesktopUserDropdownOpen] = useState(false)
  const [cartItemCount, setCartItemCount] = useState(0)
  const [searchValue, setSearchValue] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('ქალი')
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null)
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()

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
      const interval = setInterval(fetchCartCount, 2000)
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

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen)
  const toggleSearch = () => setIsSearchOpen(!isSearchOpen)
  const toggleMobileDropdown = (dropdown: string) =>
    setMobileDropdownOpen(mobileDropdownOpen === dropdown ? null : dropdown)

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
    setMobileDropdownOpen(null)
  }

  const handleSearchSubmit = (event?: React.FormEvent) => {
    event?.preventDefault()
    const query = searchValue.trim()
    if (!query) return
    setIsSearchOpen(false)
    setIsMobileMenuOpen(false)
    router.push(`/shop?search=${encodeURIComponent(query)}`)
  }

  return (
    <header className="bg-white text-gray-900 shadow-sm  top-0 z-50">
      <div className="container max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* --- Logo --- */}
          <Link href="/" className="group flex items-center space-x-3 transition-all duration-300 hover:scale-105 flex-shrink-0">
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

          {/* --- Desktop Search Bar (Centered) --- */}
          <div className="hidden lg:flex flex-1 max-w-2xl mx-8">
            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <input
                type="text"
                placeholder="მოძებნე სასურველი პროდუქტი"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="w-full placeholder:text-gray-400 text-gray-900 bg-gray-50 pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <button type="submit" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
                <Search className="w-5 h-5" />
              </button>
            </form>
          </div>

          {/* --- Desktop Navigation Links and Icons --- */}
          <nav className="hidden lg:flex items-center space-x-6 flex-shrink-0">
            {/* Navigation Links */}
            <Link href="/" className="text-black transition-colors  text-[16px] md:text-[18px] font-regular">
              მთავარი
            </Link>
            <Link href="/shop" className="text-black transition-colors  text-[16px] md:text-[18px] font-regular">
              პროდუქტები
            </Link>

            {/* Icons */}
            <div className="flex items-center space-x-4 ml-2">
              {/* Wishlist Icon */}
              <Link href="/wishlist" className="relative p-2 text-gray-700  transition-colors">
                <Heart className="w-6 h-6" />
              </Link>

              {/* Cart Icon */}
              <Link href="/cart" className="relative p-2 text-gray-700  transition-colors">
                <ShoppingCart className="w-6 h-6" />
                {cartItemCount > 0 && (
                  <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {cartItemCount}
                  </span>
                )}
              </Link>

              {/* User Icon */}
              {session ? (
                <div className="relative group desktop-user-dropdown">
                  <button
                    onClick={() => setIsDesktopUserDropdownOpen(!isDesktopUserDropdownOpen)}
                    className="p-2 text-gray-700 cursor-pointer transition-colors touch-manipulation"
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
                      ) : (
                        <Link
                          href="/account"
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
                <Link href="/auth/signin" className="p-2 text-gray-700 hover:text-purple-600 transition-colors">
                  <User className="w-6 h-6" />
                </Link>
              )}
            </div>
          </nav>

          {/* --- Mobile/Tablet: Search Icon and Menu --- */}
          <div className="flex lg:hidden items-center space-x-4">
            <button onClick={toggleSearch} className="group cursor-pointer p-2 text-gray-700">
              <Search className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>

            {/* Account Section */}
            {session ? (
              <div className="relative mobile-user-dropdown">
                <button
                  onClick={() => setIsMobileUserDropdownOpen(!isMobileUserDropdownOpen)}
                  className="p-2 text-gray-700 touch-manipulation"
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
                      ) : (
                        <Link
                          href="/account"
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
              <Link href="/auth/signin" className="text-sm md:text-[20px] text-[16px] text-gray-700">
                შესვლა
              </Link>
            )}

            <Link href="/cart" className="relative p-2 text-gray-700">
              <ShoppingCart className="w-5 h-5" />
              {cartItemCount > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </Link>

            <button onClick={toggleMobileMenu} className="md:hidden p-2 text-gray-700">
              <Menu className="w-6 h-6" />
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
                className="w-full placeholder:text-gray-400 md:text-[18px] text-[16px] text-gray-900 bg-gray-50 pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
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
        <div className="lg:hidden border-t border-gray-200 h-screen bg-white">
          <div className="container mx-auto px-4 py-4">
            <nav className="space-y-2">
              {/* Menu Categories */}
              <div className="space-y-1">
                {['ქალი', 'მამაკაცი', 'ბავშვები'].map((item) => (
                  <div key={item}>
                    <button
                      onClick={() => toggleMobileDropdown(item)}
                      className="w-full flex items-center justify-between px-4 py-3 text-gray-900 md:text-[18px] text-[16px] hover:bg-gray-100 rounded-lg text-[18px]"
                    >
                      <span>{item}</span>
                      <ChevronRight className={`w-4 h-4 transition-transform ${mobileDropdownOpen === item ? 'rotate-90' : ''}`} />
                    </button>
                    {mobileDropdownOpen === item && (
                      <div className="pl-4 space-y-1 mt-1">
                        {item === 'ქალი' && (
                          <>
                            <Link href="/shop?gender=women" onClick={closeMobileMenu} className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-[16px]">
                              პალტოები და მოსასხამი
                            </Link>
                            <Link href="/shop?gender=women&category=dresses" onClick={closeMobileMenu} className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-[16px]">
                              კაბები
                            </Link>
                            <Link href="/shop?gender=women&category=tops" onClick={closeMobileMenu} className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-[16px]">
                              შარვლები
                            </Link>
                            <Link href="/shop?gender=women&category=bottoms" onClick={closeMobileMenu} className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-[16px]">
                              ქვედაბოლოები
                            </Link>
                          </>
                        )}
                        {item === 'მამაკაცი' && (
                          <>
                            <Link href="/shop?gender=men" onClick={closeMobileMenu} className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-[16px]">
                              შარვალ კოსტუმი
                            </Link>
                            <Link href="/shop?gender=men&category=suits" onClick={closeMobileMenu} className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-[16px]">
                              პიჯაკი
                            </Link>
                            <Link href="/shop?gender=men&category=pants" onClick={closeMobileMenu} className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-[16px]">
                              ტრადიციული და კულტურული ტანსაცმელი
                            </Link>
                          </>
                        )}
                        {item === 'ბავშვები' && (
                          <>
                            <Link href="/shop?gender=children" onClick={closeMobileMenu} className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-[16px]">
                              კაბები
                            </Link>
                            <Link href="/shop?gender=children&category=dresses" onClick={closeMobileMenu} className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-[16px]">
                              სათხილამურო ტანსაცმელი
                            </Link>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Other Links */}
              <Link href="/about" onClick={closeMobileMenu} className="block px-4 py-3 text-gray-900 hover:bg-gray-100 rounded-lg text-[18px]">
                ჩვენს შესახებ
              </Link>
              <Link href="/politics" onClick={closeMobileMenu} className="block px-4 py-3 text-gray-900 hover:bg-gray-100 rounded-lg text-[18px]">
                საიტის პოლიტიკა
              </Link>
            </nav>
          </div>
        </div>
      )}

      {/* --- Category Navigation Bar --- */}
      {/* --- Category Navigation Bar (DESKTOP styled like image) --- */}
      <div className="bg-[#6E7FF3] shadow-md hidden lg:block relative">
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
                      <div className="absolute top-full -left-10  mt-0 bg-white rounded-xl shadow-xl border border-gray-200 w-64 z-50">
                        <div className="py-2">
                          {category === 'ქალი' && (
                            <>
                              <Link href="/shop?gender=women" className="block px-4 py-2 text-gray-900 hover:bg-gray-100 text-base">
                                პალტოები და მოსასხამი
                              </Link>
                              <Link href="/shop?gender=women&category=dresses" className="block px-4 py-2 text-gray-900 hover:bg-gray-100 text-base">
                                კაბები
                              </Link>
                              <Link href="/shop?gender=women&category=tops" className="block px-4 py-2 text-gray-900 hover:bg-gray-100 text-base">
                                შარვლები
                              </Link>
                              <Link href="/shop?gender=women&category=bottoms" className="block px-4 py-2 text-gray-900 hover:bg-gray-100 text-base">
                                ქვედაბოლოები
                              </Link>
                            </>
                          )}
                          {category === 'მამაკაცი' && (
                            <>
                              <Link href="/shop?gender=men" className="block px-4 py-2 text-gray-900 hover:bg-gray-100 text-base">
                                შარვალ კოსტუმი
                              </Link>
                              <Link href="/shop?gender=men&category=suits" className="block px-4 py-2 text-gray-900 hover:bg-gray-100 text-base">
                                პიჯაკი
                              </Link>
                              <Link href="/shop?gender=men&category=pants" className="block px-4 py-2 text-gray-900 hover:bg-gray-100 text-base">
                                ტრადიციული და კულტურული ტანსაცმელი
                              </Link>
                            </>
                          )}
                          {category === 'ბავშვები' && (
                            <>
                              <Link href="/shop?gender=children" className="block px-4 py-2 text-gray-900 hover:bg-gray-100 text-base">
                                კაბები
                              </Link>
                              <Link href="/shop?gender=children&category=dresses" className="block px-4 py-2 text-gray-900 hover:bg-gray-100 text-base">
                                სათხილამურო ტანსაცმელი
                              </Link>
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
  )
}

export default Header
