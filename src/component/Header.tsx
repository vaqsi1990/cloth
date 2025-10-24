'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {  Search, Menu, User,  LogOut, Mail, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import { useSession, signOut } from 'next-auth/react'

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState<string | null>(null)
  const [cartItemCount, setCartItemCount] = useState(0)
  const { data: session } = useSession()

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

  return (
    <header className="bg-[#1B3729] text-white shadow-lg sticky top-0 z-50">
      <div className="container max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* --- Logo --- */}
          <Link href="/" className="group flex items-center space-x-3 transition-all duration-300 hover:scale-105">
            <div className="relative overflow-hidden rounded-full">
              <Image
                src="/logo.jpg"
                className="rounded-full transition-transform duration-300 group-hover:scale-110"
                alt="logo"
                width={80}
                height={80}
              />
            </div>

          </Link>

          {/* --- Desktop Navigation (Centered) --- */}
          <nav className="hidden mx-auto md:flex items-center space-x-4">
            {/* --- Multi-level Categories --- */}
            <div
              className="relative"
              onMouseEnter={handleMouseEnterMain}
              onMouseLeave={handleMouseLeaveMain}
            >
              <button className="text-white px-4 py-2 rounded-lg hover:bg-gray-50 hover:text-black transition-all text-[20px]">
                მენიუ
              </button>

              {openMain && (
                <div
                  className="absolute left-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-gray-200 w-56 z-50"
                  onMouseEnter={handleMouseEnterDropdown}
                  onMouseLeave={handleMouseLeaveDropdown}
                >
                  {['ქალი', 'მამაკაცი', 'ბავშვები'].map((item) => (
                    <div
                      key={item}
                      className="relative group"
                      onMouseEnter={() => setActiveSub(item)}
                      onMouseLeave={() => setActiveSub(null)}
                    >
                      <div className="flex items-center justify-between px-4 py-3 text-black hover:bg-gray-100 cursor-pointer text-[20px]">
                        <span>{item}</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>

                      {/* --- Submenu --- */}
                      {activeSub === item && (
                        <div
                          className="absolute left-full top-0 ml-1 bg-white rounded-xl border border-gray-200 shadow-lg w-80 z-50"
                          onMouseEnter={() => setActiveSub(item)}
                          onMouseLeave={() => setActiveSub(null)}
                        >
                          {item === 'ქალი' && (
                            <div className="py-2">
                              <p className="text-black flex items-center gap-2 text-[17px] border-b border-gray-200 px-4 py-2 font-bold  hover:bg-gray-100"><Image src="/icon/woman-clothes.png" alt="everyday" width={20} height={20} />  ყოველდღიური ტანსაცმელი</p>
                              <Link href="/shop?gender=women" className="block text-black text-[17px] px-4 py-2 hover:bg-gray-100">
                                პალტოები და მოსასხამი
                              </Link>
                              <Link href="/shop?gender=women&category=dresses" className="block text-black text-[17px] px-4 py-2 hover:bg-gray-100">
                                კაბები
                              </Link>
                              <Link href="/shop?gender=women&category=tops" className="block text-black text-[17px] px-4 py-2 hover:bg-gray-100">
                                შარვლები
                              </Link>
                              <Link href="/shop?gender=women&category=bottoms" className="block text-black text-[17px] px-4 py-2 hover:bg-gray-100">
                                ქვედაბოლოები
                              </Link>
                              <p className="text-black flex items-center gap-2 text-[17px] border-b border-gray-200 px-4 py-2 font-bold  hover:bg-gray-100"><Image src="/icon/wedding-ring.png" alt="everyday" width={20} height={20} /> საქორწინო და სადღესასწაულო</p>
                              <Link href="/shop?gender=women" className="block text-black text-[17px] px-4 py-2 hover:bg-gray-100">
                                საქორწინო კაბები
                              </Link>
                              <Link href="/shop?gender=women" className="block text-black text-[17px] px-4 py-2 hover:bg-gray-100">
                                საღამოს ტანსაცმელი
                              </Link>
                              <p className="text-black flex items-center gap-2 text-[17px]  border-b border-gray-200 px-4 py-2 font-bold  hover:bg-gray-100"><Image src="/icon/swimming-suit.png" alt="everyday" width={20} height={20} /> სათხილამურო & სპორტული</p>
                              <Link href="/shop?gender=women" className="block text-black text-[17px] px-4 py-2 hover:bg-gray-100">
                                სათხილამურო ქურთუკი
                              </Link>
                              <Link href="/shop?gender=women" className="block text-black text-[17px] px-4 py-2 hover:bg-gray-100">
                                თერმო ტანსაცმელი
                              </Link>
                              <Link href="/shop?gender=women" className="block text-black text-[17px] px-4 py-2 hover:bg-gray-100">
                                სათვალე
                              </Link>
                              <Link href="/shop?gender=women" className="block text-black text-[17px] px-4 py-2 hover:bg-gray-100">
                                ჩაფხუტი
                              </Link>
                              <p className="text-black flex items-center gap-2 text-[17px] border-b border-gray-200 px-4 py-2 font-bold  hover:bg-gray-100"><Image src="/icon/party-mask.png" alt="everyday" width={20} height={20} /> კულტურული & თემატური</p>

                              <Link href="/shop?gender=women" className="block text-black text-[17px] px-4 py-2 hover:bg-gray-100">
                                ტრადიციული ტანსაცმელი
                              </Link>
                              <Link href="/shop?gender=women" className="block text-black text-[17px] px-4 py-2 hover:bg-gray-100">
                                ქოსფლეის კოსტუმები
                              </Link>
                            </div>
                          )}

                          {item === 'მამაკაცი' && (
                            <div className="py-2">
                              <Link href="/shop?gender=men" className="block text-black text-[17px] px-4 py-2 hover:bg-gray-100">
                                შარვალ კოსტუმი
                              </Link>
                              <Link href="/shop?gender=men&category=suits" className="block text-black text-[17px] px-4 py-2 hover:bg-gray-100">
                                პიჯაკი
                              </Link>
                              <Link href="/shop?gender=men&category=pants" className="block text-black text-[17px] px-4 py-2 hover:bg-gray-100">
                                ტრადიციული და კულტურული ტანსაცმელი
                              </Link>
                              <Link href="/shop?gender=men&category=pants" className="block text-black text-[17px] px-4 py-2 hover:bg-gray-100">
                                სათხილამურო ტანსაცმელი
                              </Link>
                              <Link href="/shop?gender=men&category=pants" className="block text-black text-[17px] px-4 py-2 hover:bg-gray-100">
                                სათხილამურო სათვალე
                              </Link>
                              <Link href="/shop?gender=men&category=pants" className="block text-black text-[17px] px-4 py-2 hover:bg-gray-100">
                                ჩაფხუტი
                              </Link>
                            </div>
                          )}

                          {item === 'ბავშვები' && (
                            <div className="py-2">
                              <Link href="/shop?gender=children" className="block text-black text-[17px] px-4 py-2 hover:bg-gray-100">
                                კაბები
                              </Link>
                              <Link href="/shop?gender=children&category=tshirts" className="block text-black text-[17px] px-4 py-2 hover:bg-gray-100">
                                ტრადიციული და კულტურული ტანსაცმელი
                              </Link>
                              <Link href="/shop?gender=children&category=dresses" className="block text-black text-[17px] px-4 py-2 hover:bg-gray-100">
                                სათხილამურო ტანსაცმელი
                              </Link>
                              <Link href="/shop?gender=children&category=dresses" className="block text-black text-[17px] px-4 py-2 hover:bg-gray-100">
                                სათხილამურო სათვალე
                              </Link>
                              <Link href="/shop?gender=children&category=dresses" className="block text-black text-[17px] px-4 py-2 hover:bg-gray-100">
                                ჩაფხუტი
                              </Link>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  <Link href="/about" className="block text-black text-[17px] px-4 py-2 hover:bg-gray-100">ჩვენს შესახებ</Link>
                  <Link href="/politics" className="block text-black text-[17px] px-4 py-2 hover:bg-gray-100">საიტის პოლიტიკა</Link>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <button onClick={toggleSearch} className="group cursor-pointer p-2 text-white hover:text-gray-200 text-[20px]">
                <Search className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </button>

              {/* Account Section */}
              {session ? (
                <div className="relative group">
                  <button className="p-2 text-white hover:text-gray-200">
                    <User className="w-5 h-5" />
                  </button>
                  <div className="absolute -right-20 top-full mt-2 w-54 bg-white border border-gray-200 rounded-xl shadow-xl z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300">
                    <div className="py-2 text-black">
                      <p className="px-4 font-semibold">{session.user.name}</p>
                      {session.user.role === 'ADMIN' ? (
                        <Link href="/admin" className="block px-4 py-2 hover:bg-gray-100">
                          ადმინისტრატორი
                        </Link>
                      ) : (
                        <Link href="/account" className="block px-4 py-2 hover:bg-gray-100">
                          პროფილი
                        </Link>
                      )}
                      <button
                        onClick={() => signOut()}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center space-x-2"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>გასვლა</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <Link href="/auth/signin" className="text-[18px]  md:text-[20px] font-medium hover:text-gray-200">
                  შესვლა
                </Link>
              )}

              <button className="p-2 text-white hover:text-gray-200">
                <Mail className="w-5 h-5" />
              </button>

              <button onClick={toggleMobileMenu} className="md:hidden p-2 text-white hover:text-gray-200">
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </nav>

          {/* --- Right side icons --- */}
          <div className="flex md:hidden items-center space-x-4">
            <button onClick={toggleSearch} className="group cursor-pointer p-2 text-white hover:text-gray-200">
              <Search className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>

            {/* Account Section */}
            {session ? (
              <div className="relative group">
                <button className="p-2 text-white hover:text-gray-200">
                  <User className="w-5 h-5" />
                </button>
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300">
                  <div className="py-2 text-black">
                    <p className="px-4 font-semibold">{session.user.name}</p>
                    {session.user.role === 'ADMIN' ? (
                      <Link href="/admin" className="block px-4 py-2 hover:bg-gray-100">
                        ადმინისტრატორი
                      </Link>
                    ) : (
                      <Link href="/account" className="block px-4 py-2 hover:bg-gray-100">
                        პროფილი
                      </Link>
                    )}
                    <button
                      onClick={() => signOut()}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center space-x-2"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>გასვლა</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <Link href="/auth/signin" className="text-sm hover:text-gray-200">
                შესვლა
              </Link>
            )}

            <button className="p-2 text-white hover:text-gray-200">
              <Mail className="w-5 h-5" />
            </button>

            <button onClick={toggleMobileMenu} className="md:hidden p-2 text-white hover:text-gray-200">
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* --- Search Bar --- */}
      {isSearchOpen && (
        <div className="bg-white border-t border-gray-100 py-4">
          <div className="container mx-auto px-4">
            <div className="relative max-w-md mx-auto">
              <input
                type="text"
                placeholder="მოძებნე ნივთები..."
                className="w-full placeholder:text-black text-black pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-300"
              />
              <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

export default Header
