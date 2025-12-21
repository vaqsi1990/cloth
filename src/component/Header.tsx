'use client'

import React, { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, Menu, User, LogOut, ShoppingCart, ChevronRight,  } from 'lucide-react'
import Image from 'next/image'
import { useSession, signOut } from 'next-auth/react'

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
    <header className=" bg-[#1B3729] text-gray-900 shadow-sm  top-0 z-50">
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
                className="w-full bg-white pl-10 pr-4 py-3 text-black border placeholder:text-gray-500 border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
              />
              <button type="submit" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500  ">
                <Search className="w-5 h-5" />
              </button>
            </form>
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
              {session ? (
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
                <Link href="/auth/signin" className="p-2 text-white font-bold  transition-colors">
                  <User className="w-6 h-6" />
                </Link>
              )}
            </div>
          </nav>

          {/* --- Mobile/Tablet: Search Icon and Menu --- */}
          <div className="flex lg:hidden items-center space-x-4">
            <button onClick={toggleSearch} className="group cursor-pointer p-2 text-white">
              <Search className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>

            {/* Account Section */}
            {session ? (
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
              <Link href="/auth/signin" className="text-sm md:text-[20px] text-[16px] text-white">
                შესვლა
              </Link>
            )}

            <Link href="/cart" className="relative p-2 text-white">
              <ShoppingCart className="w-5 h-5" />
              {cartItemCount > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </Link>

            <button onClick={toggleMobileMenu} className="md:hidden p-2 text-white">
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
        <div className="lg:hidden border-t border-gray-200 h-screen bg-white">
          <div className="container mx-auto px-4 py-4">
            <nav className="space-y-2">
              {/* Menu Categories */}
              <div className="space-y-1">
                {['ქალი', 'მამაკაცი', 'ბავშვები'].map((item) => (
                  <div key={item}>
                    <button
                      onClick={() => toggleMobileDropdown(item)}
                      className="w-full flex items-center justify-between px-4 py-3 text-black md:text-[18px] text-[16px] hover:bg-gray-100 rounded-lg text-[18px]"
                    >
                      <span>{item}</span>
                      <ChevronRight className={`w-4 h-4 transition-transform ${mobileDropdownOpen === item ? 'rotate-90' : ''}`} />
                    </button>
                    {mobileDropdownOpen === item && (
                      <div className="pl-4 space-y-1 mt-1 max-h-96 overflow-y-auto">
                        {item === 'ქალი' && (
                          <>
                            <Link href="/shop?gender=women&category=პალტოები და მოსასხამი" onClick={closeMobileMenu} className="block px-4 py-2 text-black hover:bg-gray-100 rounded-lg text-[16px]">
                              1. ქალების პალტოები & მოსასხამი
                            </Link>
                            <Link href="/shop?gender=women&category=კაბები" onClick={closeMobileMenu} className="block px-4 py-2 text-black hover:bg-gray-100 rounded-lg text-[16px]">
                              2. ქალების კაბები
                            </Link>
                            <Link href="/shop?gender=women" onClick={closeMobileMenu} className="block px-4 py-2 text-black hover:bg-gray-100 rounded-lg text-[16px]">
                              3. ქალების ორ ნაწილად შეკრული კომპლექტები
                            </Link>
                            <Link href="/shop?gender=women&category=შარვლები" onClick={closeMobileMenu} className="block px-4 py-2 text-black hover:bg-gray-100 rounded-lg text-[16px]">
                              4. ქალების შარვლები
                            </Link>
                            <Link href="/shop?gender=women&category=ქვედაბოლოები" onClick={closeMobileMenu} className="block px-4 py-2 text-black hover:bg-gray-100 rounded-lg text-[16px]">
                              5. ქალების ქვედაბოლოები
                            </Link>
                            <Link href="/shop?gender=women&category=ქალების კოსტუმი" onClick={closeMobileMenu} className="block px-4 py-2 text-black hover:bg-gray-100 rounded-lg text-[16px]">
                              6. ქალების კოსტუმი
                            </Link>
                            <Link href="/shop?gender=women&category=საქორწინო კაბები" onClick={closeMobileMenu} className="block px-4 py-2 text-black hover:bg-gray-100 rounded-lg text-[16px]">
                              7. ქალების საქორწინო & სადღესასწაულო ტანსაცმელი
                            </Link>
                            <Link href="/shop?gender=women&category=სათხილამურო ქურთუკი" onClick={closeMobileMenu} className="block px-4 py-2 text-black hover:bg-gray-100 rounded-lg text-[16px]">
                              8. სათხილამურო ტანსაცმელი
                            </Link>
                            <Link href="/shop?gender=women&category=სათვალე" onClick={closeMobileMenu} className="block px-4 py-2 text-black hover:bg-gray-100 rounded-lg text-[16px]">
                              9. სათხილამურო სათვალე
                            </Link>
                            <Link href="/shop?gender=women&category=ჩაფხუტი" onClick={closeMobileMenu} className="block px-4 py-2 text-black hover:bg-gray-100 rounded-lg text-[16px]">
                              10. ჩაფხუტი
                            </Link>
                            <Link href="/shop?gender=women&category=ტრადიციული ტანსაცმელი" onClick={closeMobileMenu} className="block px-4 py-2 text-black hover:bg-gray-100 rounded-lg text-[16px]">
                              11. ქალების ტრადიციული & კულტურული ტანსაცმელი
                            </Link>
                            <Link href="/shop?gender=women&category=ქოსფლეის კოსტუმები" onClick={closeMobileMenu} className="block px-4 py-2 text-black hover:bg-gray-100 rounded-lg text-[16px]">
                              12. ქალების კოსფლეის კოსტიუმები
                            </Link>
                          </>
                        )}
                        {item === 'მამაკაცი' && (
                          <>
                            <Link href="/shop?gender=men&category=შარვალ კოსტუმი" onClick={closeMobileMenu} className="block px-4 py-2 text-black hover:bg-gray-100 rounded-lg text-[16px]">
                              1. შარვალ კოსტუმი
                            </Link>
                            <Link href="/shop?gender=men&category=პიჯაკი" onClick={closeMobileMenu} className="block px-4 py-2 text-black hover:bg-gray-100 rounded-lg text-[16px]">
                              2. პიჯაკი
                            </Link>
                            <Link href="/shop?gender=men&category=ტრადიციული ტანსაცმელი" onClick={closeMobileMenu} className="block px-4 py-2 text-black hover:bg-gray-100 rounded-lg text-[16px]">
                              3. ტრადიციული და კულტურული ტანსაცმელი
                            </Link>
                            <Link href="/shop?gender=men&category=სათხილამურო ქურთუკი" onClick={closeMobileMenu} className="block px-4 py-2 text-black hover:bg-gray-100 rounded-lg text-[16px]">
                              4. სათხილამურო ტანსაცმელი
                            </Link>
                            <Link href="/shop?gender=men&category=სათვალე" onClick={closeMobileMenu} className="block px-4 py-2 text-black hover:bg-gray-100 rounded-lg text-[16px]">
                              5. სათხილამურო სათვალე
                            </Link>
                            <Link href="/shop?gender=men&category=ჩაფხუტი" onClick={closeMobileMenu} className="block px-4 py-2 text-black hover:bg-gray-100 rounded-lg text-[16px]">
                              6. ჩაფხუტი
                            </Link>
                          </>
                        )}
                        {item === 'ბავშვები' && (
                          <>
                            <Link href="/shop?gender=children&category=ბავშვთა კაბები" onClick={closeMobileMenu} className="block px-4 py-2 text-black hover:bg-gray-100 rounded-lg text-[16px]">
                              1. კაბები
                            </Link>
                            <Link href="/shop?gender=children&category=ბავშვთა ტრადიციული ტანსაცმელი" onClick={closeMobileMenu} className="block px-4 py-2 text-black hover:bg-gray-100 rounded-lg text-[16px]">
                              2. ტრადიციული და კულტურული ტანსაცმელი
                            </Link>
                            <Link href="/shop?gender=children&category=ბავშვთა სათხილამურო ტანსაცმელი" onClick={closeMobileMenu} className="block px-4 py-2 text-black hover:bg-gray-100 rounded-lg text-[16px]">
                              3. სათხილამურო ტანსაცმელი
                            </Link>
                            <Link href="/shop?gender=children&category=თერმო ტანსაცმელი" onClick={closeMobileMenu} className="block px-4 py-2 text-black hover:bg-gray-100 rounded-lg text-[16px]">
                              4. მეორე ფენა
                            </Link>
                            <Link href="/shop?gender=children&category=სათვალე" onClick={closeMobileMenu} className="block px-4 py-2 text-black hover:bg-gray-100 rounded-lg text-[16px]">
                              5. სათხილამურო სათვალე
                            </Link>
                            <Link href="/shop?gender=children&category=ჩაფხუტი" onClick={closeMobileMenu} className="block px-4 py-2 text-black hover:bg-gray-100 rounded-lg text-[16px]">
                              6. ჩაფხუტი
                            </Link>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Other Links */}
              <Link href="/about" onClick={closeMobileMenu} className="block px-4 py-3 text-black hover:bg-gray-100 rounded-lg text-[18px]">
                ჩვენს შესახებ
              </Link>
              <Link href="/politics" onClick={closeMobileMenu} className="block px-4 py-3 text-black hover:bg-gray-100 rounded-lg text-[18px]">
                საიტის პოლიტიკა
              </Link>
            </nav>
          </div>
        </div>
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
                              <Link href="/shop?gender=women&category=პალტოები და მოსასხამი" className="block px-4 py-2 text-gray-900 hover:bg-gray-100 text-sm">
                                1. ქალების პალტოები & მოსასხამი
                              </Link>
                              <Link href="/shop?gender=women&category=კაბები" className="block px-4 py-2 text-gray-900 hover:bg-gray-100 text-sm">
                                2. ქალების კაბები
                              </Link>
                              <Link href="/shop?gender=women" className="block px-4 py-2 text-gray-900 hover:bg-gray-100 text-sm">
                                3. ქალების ორ ნაწილად შეკრული კომპლექტები
                              </Link>
                              <Link href="/shop?gender=women&category=შარვლები" className="block px-4 py-2 text-gray-900 hover:bg-gray-100 text-sm">
                                4. ქალების შარვლები
                              </Link>
                              <Link href="/shop?gender=women&category=ქვედაბოლოები" className="block px-4 py-2 text-gray-900 hover:bg-gray-100 text-sm">
                                5. ქალების ქვედაბოლოები
                              </Link>
                              <Link href="/shop?gender=women&category=ქალების კოსტუმი" className="block px-4 py-2 text-gray-900 hover:bg-gray-100 text-sm">
                                6. ქალების კოსტუმი
                              </Link>
                              <Link href="/shop?gender=women&category=საქორწინო კაბები" className="block px-4 py-2 text-gray-900 hover:bg-gray-100 text-sm">
                                7. ქალების საქორწინო & სადღესასწაულო ტანსაცმელი
                              </Link>
                              <Link href="/shop?gender=women&category=სათხილამურო ქურთუკი" className="block px-4 py-2 text-gray-900 hover:bg-gray-100 text-sm">
                                8. სათხილამურო ტანსაცმელი
                              </Link>
                              <Link href="/shop?gender=women&category=სათვალე" className="block px-4 py-2 text-gray-900 hover:bg-gray-100 text-sm">
                                9. სათხილამურო სათვალე
                              </Link>
                              <Link href="/shop?gender=women&category=ჩაფხუტი" className="block px-4 py-2 text-gray-900 hover:bg-gray-100 text-sm">
                                10. ჩაფხუტი
                              </Link>
                              <Link href="/shop?gender=women&category=ტრადიციული ტანსაცმელი" className="block px-4 py-2 text-gray-900 hover:bg-gray-100 text-sm">
                                11. ქალების ტრადიციული & კულტურული ტანსაცმელი
                              </Link>
                              <Link href="/shop?gender=women&category=ქოსფლეის კოსტუმები" className="block px-4 py-2 text-gray-900 hover:bg-gray-100 text-sm">
                                12. ქალების კოსფლეის კოსტიუმები
                              </Link>
                            </>
                          )}
                          {category === 'მამაკაცი' && (
                            <>
                              <Link href="/shop?gender=men&category=შარვალ კოსტუმი" className="block px-4 py-2 text-gray-900 hover:bg-gray-100 text-sm">
                                1. შარვალ კოსტუმი
                              </Link>
                              <Link href="/shop?gender=men&category=პიჯაკი" className="block px-4 py-2 text-gray-900 hover:bg-gray-100 text-sm">
                                2. პიჯაკი
                              </Link>
                              <Link href="/shop?gender=men&category=ტრადიციული ტანსაცმელი" className="block px-4 py-2 text-gray-900 hover:bg-gray-100 text-sm">
                                3. ტრადიციული და კულტურული ტანსაცმელი
                              </Link>
                              <Link href="/shop?gender=men&category=სათხილამურო ქურთუკი" className="block px-4 py-2 text-gray-900 hover:bg-gray-100 text-sm">
                                4. სათხილამურო ტანსაცმელი
                              </Link>
                              <Link href="/shop?gender=men&category=სათვალე" className="block px-4 py-2 text-gray-900 hover:bg-gray-100 text-sm">
                                5. სათხილამურო სათვალე
                              </Link>
                              <Link href="/shop?gender=men&category=ჩაფხუტი" className="block px-4 py-2 text-gray-900 hover:bg-gray-100 text-sm">
                                6. ჩაფხუტი
                              </Link>
                            </>
                          )}
                          {category === 'ბავშვები' && (
                            <>
                              <Link href="/shop?gender=children&category=ბავშვთა კაბები" className="block px-4 py-2 text-gray-900 hover:bg-gray-100 text-sm">
                                1. კაბები
                              </Link>
                              <Link href="/shop?gender=children&category=ბავშვთა ტრადიციული ტანსაცმელი" className="block px-4 py-2 text-gray-900 hover:bg-gray-100 text-sm">
                                2. ტრადიციული და კულტურული ტანსაცმელი
                              </Link>
                              <Link href="/shop?gender=children&category=ბავშვთა სათხილამურო ტანსაცმელი" className="block px-4 py-2 text-gray-900 hover:bg-gray-100 text-sm">
                                3. სათხილამურო ტანსაცმელი
                              </Link>
                              <Link href="/shop?gender=children&category=თერმო ტანსაცმელი" className="block px-4 py-2 text-gray-900 hover:bg-gray-100 text-sm">
                                4. მეორე ფენა
                              </Link>
                              <Link href="/shop?gender=children&category=სათვალე" className="block px-4 py-2 text-gray-900 hover:bg-gray-100 text-sm">
                                5. სათხილამურო სათვალე
                              </Link>
                              <Link href="/shop?gender=children&category=ჩაფხუტი" className="block px-4 py-2 text-gray-900 hover:bg-gray-100 text-sm">
                                6. ჩაფხუტი
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
