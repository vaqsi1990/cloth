'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ShoppingBag, Search, Menu, User, ChevronDown, LogOut } from 'lucide-react'
import Image from 'next/image'
import { useCart } from '@/hooks/useCart'
import { useSession, signOut } from 'next-auth/react'

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState<string | null>(null)
  const { getTotalItems } = useCart()
  const { data: session, status } = useSession()

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const toggleSearch = () => {
    setIsSearchOpen(!isSearchOpen)
  }

  const handleMouseEnter = (dropdown: string) => {
    setActiveDropdown(dropdown)
  }

  const handleMouseLeave = () => {
    setActiveDropdown(null)
  }
  

  const toggleMobileDropdown = (dropdown: string) => {
    setMobileDropdownOpen(mobileDropdownOpen === dropdown ? null : dropdown)
  }

  return (
    <header className="bg-[#1B3729] text-white shadow-lg sticky top-0 z-50 border-b border-gray-100">
      {/* Main header */}
      <div className="container max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="group flex items-center space-x-3 transition-all duration-300 hover:scale-105">
            <div className="relative overflow-hidden rounded-full ">
              <Image
                src="/logo.jpg"
                className='rounded-full transition-transform duration-300 group-hover:scale-110'
                alt="logo"
                width={80}
                height={80}
              />
            </div>
           
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            {/* Women Dropdown */}
            {/* Women Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => handleMouseEnter('women')}
              onMouseLeave={handleMouseLeave}
            >
              <button
                className="group flex items-center space-x-1 px-4 py-2 rounded-lg text-white md:text-[18px] text-[16px] font-medium transition-all duration-300 hover:text-gray-900 hover:bg-gray-50 cursor-pointer  "
              >
                  <span className="relative">
                    ქალი
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-black transition-all duration-300 group-hover:w-full"></span>
                  </span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-300 ${activeDropdown === 'women' ? 'rotate-180' : ''
                    }`}
                />
              </button>

              {/* Dropdown menu */}
              <div
                className={`absolute top-full left-0 mt-2 w-56 bg-white/95 backdrop-blur-md border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden transition-all duration-300 ${activeDropdown === 'women'
                  ? 'opacity-100 visible translate-y-0'
                  : 'opacity-0 invisible -translate-y-2'
                  }`}
              >
                <div className="py-2">
                   <Link
                     href="/shop?gender=women"
                     className="group flex items-center px-4 py-3 text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-gray-900 transition-all duration-300"
                   >
                     <span className="group-hover:translate-x-1 transition-transform duration-300">
                       ყველა ქალის ტანსაცმელი
                     </span>
                   </Link>
                   <Link
                     href="/shop?gender=women&category=dresses"
                     className="group flex items-center px-4 py-3 text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-gray-900 transition-all duration-300"
                   >
                     <span className="group-hover:translate-x-1 transition-transform duration-300">
                       კაბები
                     </span>
                   </Link>
                   <Link
                     href="/shop?gender=women&category=tops"
                     className="group flex items-center px-4 py-3 text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-gray-900 transition-all duration-300"
                   >
                     <span className="group-hover:translate-x-1 transition-transform duration-300">
                     ზედა ტანსაცმელი
                     </span>
                   </Link>
                   <Link
                     href="/shop?gender=women&category=bottoms"
                     className="group flex items-center px-4 py-3 text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-gray-900 transition-all duration-300"
                   >
                     <span className="group-hover:translate-x-1 transition-transform duration-300">
                     ქვედა ტანსაცმელი
                     </span>
                   </Link>
                   <Link
                     href="/shop?gender=women&category=bottoms"
                     className="group flex items-center px-4 py-3 text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-gray-900 transition-all duration-300"
                   >
                     <span className="group-hover:translate-x-1 transition-transform duration-300">
                    აქსესუარები
                     </span>
                   </Link>
                   <Link
                     href="/shop?gender=women&category=bottoms"
                     className="group flex items-center px-4 py-3 text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-gray-900 transition-all duration-300"
                   >
                     <span className="group-hover:translate-x-1 transition-transform duration-300">
                    კლასიკური სამოსი
                     </span>
                   </Link>
                   <Link
                     href="/shop?gender=women&category=bottoms"
                     className="group flex items-center px-4 py-3 text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-gray-900 transition-all duration-300"
                   >
                     <span className="group-hover:translate-x-1 transition-transform duration-300">
                   ნაციონალური სამოსი
                     </span>
                   </Link>
                   <Link
                     href="/shop?gender=women&category=bottoms"
                     className="group flex items-center px-4 py-3 text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-gray-900 transition-all duration-300"
                   >
                     <span className="group-hover:translate-x-1 transition-transform duration-300">
                საკარნავალო კოსტუმები
                     </span>
                   </Link>
                </div>
              </div>
            </div>



            {/* Men Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => handleMouseEnter('men')}
              onMouseLeave={handleMouseLeave}
            >
              <button
                className="group flex items-center space-x-1 px-4 py-2 rounded-lg text-white md:text-[18px] text-[16px] font-medium transition-all duration-300 hover:text-gray-900 hover:bg-gray-50 cursor-pointer  "
              >
                  <span className="relative">
                    მამაკაცი
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-black transition-all duration-300 group-hover:w-full"></span>
                  </span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-300 ${activeDropdown === 'men' ? 'rotate-180' : ''
                    }`}
                />
              </button>

              {/* Dropdown */}
              <div
                className={`absolute top-full left-0 mt-2 w-56 bg-white/95 backdrop-blur-md border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden transition-all duration-300 ${activeDropdown === 'men'
                  ? 'opacity-100 visible translate-y-0'
                  : 'opacity-0 invisible -translate-y-2'
                  }`}
              >
                <div className="py-2">
                  <Link
                    href="/shop?gender=men"
                    className="group flex items-center px-4 py-3 text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-gray-900 transition-all duration-300"
                  >
                    <span className="group-hover:translate-x-1 transition-transform duration-300">
                      ყველა მამაკაცის ტანსაცმელი
                    </span>
                  </Link>
                  <Link
                    href="/shop?gender=men&category=tops"
                    className="group flex items-center px-4 py-3 text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-gray-900 transition-all duration-300"
                  >
                    <span className="group-hover:translate-x-1 transition-transform duration-300">
                      კოსტუმი
                    </span>
                  </Link>
                  <Link
                    href="/shop?gender=men&category=bottoms"
                    className="group flex items-center px-4 py-3 text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-gray-900 transition-all duration-300"
                  >
                    <span className="group-hover:translate-x-1 transition-transform duration-300">
                      ჯემპრი
                    </span>
                  </Link>
                  <Link
                    href="/shop?gender=men&category=outerwear"
                    className="group flex items-center px-4 py-3 text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-gray-900 transition-all duration-300"
                  >
                    <span className="group-hover:translate-x-1 transition-transform duration-300">
                     შარვალი
                    </span>
                  </Link>
                  <Link
                    href="/shop?gender=men&category=outerwear"
                    className="group flex items-center px-4 py-3 text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-gray-900 transition-all duration-300"
                  >
                    <span className="group-hover:translate-x-1 transition-transform duration-300">
                    ჩოხა
                    </span>
                  </Link>
                  
                  <Link
                    href="/shop?gender=men&category=outerwear"
                    className="group flex items-center px-4 py-3 text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-gray-900 transition-all duration-300"
                  >
                    <span className="group-hover:translate-x-1 transition-transform duration-300">
                    კლასიკური სამოსი
                    </span>
                  </Link>
                  <Link
                    href="/shop?gender=men&category=outerwear"
                    className="group flex items-center px-4 py-3 text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-gray-900 transition-all duration-300"
                  >
                    <span className="group-hover:translate-x-1 transition-transform duration-300">
                   საკარნავალო კოსტუმები
                    </span>
                  </Link>
                </div>
              </div>
            </div>
            {/* Children Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => handleMouseEnter('children')}
              onMouseLeave={handleMouseLeave}
            >
              <button
                className="group flex items-center space-x-1 px-4 py-2 rounded-lg text-white md:text-[18px] text-[16px] font-medium transition-all duration-300 hover:text-gray-900 hover:bg-gray-50 cursor-pointer  "
              >
                  <span className="relative">
                    ბავშვები
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-black transition-all duration-300 group-hover:w-full"></span>
                  </span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-300 ${activeDropdown === 'children' ? 'rotate-180' : ''
                    }`}
                />
              </button>

              {/* Dropdown */}
              <div
                className={`absolute top-full left-0 mt-2 w-56 bg-white/95 backdrop-blur-md border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden transition-all duration-300 ${activeDropdown === 'children'
                    ? 'opacity-100 visible translate-y-0'
                    : 'opacity-0 invisible -translate-y-2'
                  }`}
              >
                <div className="py-2">
                   <Link
                     href="/shop?gender=children"
                     className="group flex items-center px-4 py-3 text-black hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-gray-900 transition-all duration-300"
                   >
                     <span className="group-hover:translate-x-1 transition-transform duration-300">
                       ყველა ბავშვის ტანსაცმელი
                     </span>
                   </Link>
                   <Link
                     href="/shop?gender=children&category=dresses"
                     className="group flex items-center px-4 py-3 text-black hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-gray-900 transition-all duration-300"
                   >
                     <span className="group-hover:translate-x-1 transition-transform duration-300">
                      მაისურები
                     </span>
                   </Link>
                   <Link
                     href="/shop?gender=children&category=tops"
                     className="group flex items-center px-4 py-3 text-black hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-gray-900 transition-all duration-300"
                   >
                     <span className="group-hover:translate-x-1 transition-transform duration-300">
                  სვიტრები/ჯემპრები
                     </span>
                   </Link>
                   <Link
                     href="/shop?gender=children&category=bottoms"
                     className="group flex items-center px-4 py-3 text-black hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50  transition-all duration-300"
                   >
                     <span className="group-hover:translate-x-1 transition-transform duration-300">
                     ქვედა ტანსაცმელი(შარვლები, ქვედაკაბები)
                     </span>
                   </Link>
                   <Link
                     href="/shop?gender=women&category=bottoms"
                     className="group flex items-center px-4 py-3 text-black hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50  transition-all duration-300"
                   >
                     <span className="group-hover:translate-x-1 transition-transform duration-300">
                    კაბები(გოგონებისთვის)
                     </span>
                   </Link>

                   <Link
                     href="/shop?gender=women&category=bottoms"
                     className="group flex items-center px-4 py-3 text-black hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50  transition-all duration-300"
                   >
                     <span className="group-hover:translate-x-1 transition-transform duration-300">
                   ტრადიციული ტანსაცმელი
                     </span>
                   </Link>
                </div>
              </div>
            </div>

          </nav>

          {/* Search, Account, Cart */}
          <div className="flex items-center space-x-2">
            {/* Search */}
            <button
              onClick={toggleSearch}
              className="group cursor-pointer p-3 rounded-full text-white  transition-all duration-300 hover:shadow-sm"
              aria-label="Search"
            >
              <Search className="w-5 cursor-pointer h-5 transition-transform duration-300 group-hover:scale-110" />
            </button>

            {/* Account */}
            {session ? (
              session.user.role === 'ADMIN' ? (
                <div className="flex items-center space-x-2">
                  <Link
                    href="/admin"
                    className="px-4 py-2 bg-black text-white text-[16px] font-bold uppercase tracking-wide rounded-lg  transition-colors"
                  >
                    ადმინ პანელი
                  </Link>
                  <button
                    onClick={() => signOut()}
                    className="px-4 py-2 text-[16px] font-bold uppercase tracking-wide text-white cursor-pointer transition-colors"
                  >
                    გასვლა
                  </button>
                </div>
              ) : (
                <div className="relative group">
                  <button className="group cursor-pointer p-3 rounded-full text-white  transition-all duration-300 hover:shadow-sm">
                    <User className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
                  </button>
                  
                  {/* User Dropdown */}
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white/95 backdrop-blur-md border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300">
                    <div className="py-2">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-[16px] font-medium text-black">{session.user.name}</p>
                        <p className="text-[16px] text-black">{session.user.email}</p>
                      </div>
                      
                      <Link
                        href="/account"
                        className="block cursor-pointer px-4 py-2 text-[16px] text-black hover:bg-gray-50 transition-colors"
                      >
                        პროფილი
                      </Link>
                      
                      <button
                        onClick={() => signOut()}
                        className="w-full cursor-pointer text-left px-4 py-2 text-[16px] text-black font-bold uppercase tracking-wide hover:bg-gray-50 transition-colors flex items-center space-x-2"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>გასვლა</span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  href="/auth/signin"
                  className="cursor-pointer px-4 py-2 text-[16px] font-medium text-white  transition-colors"
                >
                  შესვლა
                </Link>
                <Link
                  href="/auth/signup"
                  className="px-4 py-2 cursor-pointer bg-[#1B3729] text-white text-[16px] font-medium rounded-lg transition-colors"
                >
                  რეგისტრაცია
                </Link>
              </div>
            )}

            {/* Cart */}
            <Link
              href="/cart"
              className="group relative cursor-pointer p-3 rounded-full text-white   transition-all duration-300 hover:shadow-sm"
            >
              <ShoppingBag className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
              {getTotalItems() > 0 && (
                <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium shadow-lg animate-pulse">
                  {getTotalItems()}
                </span>
              )}
            </Link>

            {/* Mobile menu button */}
            <button
              onClick={toggleMobileMenu}
              className="lg:hidden group cursor-pointer p-3 rounded-full text-white  transition-all duration-300 hover:shadow-sm"
              aria-label="Toggle mobile menu"
            >
              <Menu className="w-6 h-6 transition-transform duration-300 group-hover:scale-110" />
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      {isSearchOpen && (
        <div className="bg-white/95 backdrop-blur-md border-t border-gray-100 py-4 animate-in slide-in-from-top-2 duration-300">
          <div className="container mx-auto px-4">
            <div className="relative max-w-md mx-auto">
              <input
                type="text"
                placeholder="მოძებნე ნივთები..."
                className="w-full placeholder:text-black text-black pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent transition-all duration-300 shadow-sm hover:shadow-md"
              />
              <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
            </div>
          </div>
        </div>
      )}

    
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-[#1B3729] text-white border-t border-gray-100 animate-in slide-in-from-top-2 duration-300">
          <nav className="container mx-auto px-4 py-6">
            <div className="flex flex-col space-y-2">
              {/* Women Dropdown */}
              <div className="border-b border-gray-600 pb-2">
                <button
                  onClick={() => toggleMobileDropdown('women')}
                  className="flex items-center justify-between w-full px-4 py-3 rounded-lg text-white text-[16px] transition-all duration-300 hover:bg-gray-700"
                >
                  <span>ქალი</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-300 ${mobileDropdownOpen === 'women' ? 'rotate-180' : ''}`}
                  />
                </button>
                {mobileDropdownOpen === 'women' && (
                  <div className="mt-2 ml-4 space-y-1">
                    <Link
                      href="/shop?gender=women"
                      className="block px-4 py-2 text-white text-[14px] hover:text-white transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      ყველა ქალის ტანსაცმელი
                    </Link>
                    <Link
                      href="/shop?gender=women&category=dresses"
                      className="block px-4 py-2 text-white text-[14px] hover:text-white transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      კაბები
                    </Link>
                    <Link
                      href="/shop?gender=women&category=tops"
                      className="block px-4 py-2 text-white text-[14px] hover:text-white transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      ზედა ტანსაცმელი
                    </Link>
                    <Link
                      href="/shop?gender=women&category=bottoms"
                      className="block px-4 py-2 text-white text-[14px] hover:text-white transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      ქვედა ტანსაცმელი
                    </Link>
                    <Link
                      href="/shop?gender=women&category=accessories"
                      className="block px-4 py-2 text-white text-[14px] hover:text-white transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      აქსესუარები
                    </Link>
                    <Link
                      href="/shop?gender=women&category=classic"
                      className="block px-4 py-2 text-white text-[14px] hover:text-white transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      კლასიკური სამოსი
                    </Link>
                    <Link
                      href="/shop?gender=women&category=traditional"
                      className="block px-4 py-2 text-white text-[14px] hover:text-white transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      ნაციონალური სამოსი
                    </Link>
                    <Link
                      href="/shop?gender=women&category=carnival"
                      className="block px-4 py-2 text-white text-[14px] hover:text-white transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      საკარნავალო კოსტუმები
                    </Link>
                  </div>
                )}
              </div>

              {/* Men Dropdown */}
              <div className="border-b border-gray-600 pb-2">
                <button
                  onClick={() => toggleMobileDropdown('men')}
                  className="flex items-center justify-between w-full px-4 py-3 rounded-lg text-white text-[16px] transition-all duration-300 hover:bg-gray-700"
                >
                  <span>მამაკაცი</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-300 ${mobileDropdownOpen === 'men' ? 'rotate-180' : ''}`}
                  />
                </button>
                {mobileDropdownOpen === 'men' && (
                  <div className="mt-2 ml-4 space-y-1">
                    <Link
                      href="/shop?gender=men"
                      className="block px-4 py-2 text-white text-[14px] hover:text-white transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      ყველა მამაკაცის ტანსაცმელი
                    </Link>
                    <Link
                      href="/shop?gender=men&category=suits"
                      className="block px-4 py-2 text-white text-[14px] hover:text-white transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      კოსტუმი
                    </Link>
                    <Link
                      href="/shop?gender=men&category=jumpers"
                      className="block px-4 py-2 text-white text-[14px] hover:text-white transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      ჯემპრი
                    </Link>
                    <Link
                      href="/shop?gender=men&category=pants"
                      className="block px-4 py-2 text-white text-[14px] hover:text-white transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      შარვალი
                    </Link>
                    <Link
                      href="/shop?gender=men&category=chokha"
                          className="block px-4 py-2 text-white text-[14px] hover:text-white transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      ჩოხა
                    </Link>
                    <Link
                      href="/shop?gender=men&category=classic"
                      className="block px-4 py-2 text-white text-[14px] hover:text-white transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      კლასიკური სამოსი
                    </Link>
                    <Link
                      href="/shop?gender=men&category=carnival"
                      className="block px-4 py-2 text-white text-[14px] hover:text-white transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      საკარნავალო კოსტუმები
                    </Link>
                  </div>
                )}
              </div>

              {/* Children Dropdown */}
              <div className="border-b border-gray-600 pb-2">
                <button
                  onClick={() => toggleMobileDropdown('children')}
                  className="flex items-center justify-between w-full px-4 py-3 rounded-lg text-white text-[16px] transition-all duration-300 hover:bg-gray-700"
                >
                  <span>ბავშვები</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-300 ${mobileDropdownOpen === 'children' ? 'rotate-180' : ''}`}
                  />
                </button>
                {mobileDropdownOpen === 'children' && (
                  <div className="mt-2 ml-4 space-y-1">
                    <Link
                      href="/shop?gender=children"
                      className="block px-4 py-2 text-white text-[14px] hover:text-white transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      ყველა ბავშვის ტანსაცმელი
                    </Link>
                    <Link
                      href="/shop?gender=children&category=shirts"
                      className="block px-4 py-2 text-white text-[14px] hover:text-white transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      მაისურები
                    </Link>
                    <Link
                      href="/shop?gender=children&category=sweaters"
                      className="block px-4 py-2 text-white text-[14px] hover:text-white transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      სვიტრები/ჯემპრები
                    </Link>
                    <Link
                      href="/shop?gender=children&category=bottoms"
                      className="block px-4 py-2 text-white text-[14px] hover:text-white transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      ქვედა ტანსაცმელი(შარვლები, ქვედაკაბები)
                    </Link>
                    <Link
                      href="/shop?gender=children&category=dresses"
                      className="block px-4 py-2 text-white text-[14px] hover:text-white transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      კაბები(გოგონებისთვის)
                    </Link>
                    <Link
                      href="/shop?gender=children&category=traditional"
                      className="block px-4 py-2 text-white text-[14px] hover:text-white transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      ტრადიციული ტანსაცმელი
                    </Link>
                  </div>
                )}
              </div>

              {/* Authentication Section */}
              <div className="border-t border-gray-600 pt-4 mt-4">
                {session ? (
                  session.user.role === 'ADMIN' ? (
                    <div className="space-y-2">
                      <Link
                        href="/admin"
                        className="block px-4 py-3 bg-black text-white text-[16px] font-bold uppercase tracking-wide rounded-lg text-center transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        ადმინ პანელი
                      </Link>
                      <button
                        onClick={() => {
                          signOut()
                          setIsMobileMenuOpen(false)
                        }}
                        className="w-full px-4 py-3 text-[16px] font-bold uppercase tracking-wide text-white border border-white rounded-lg transition-colors"
                      >
                        გასვლა
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="px-4 py-2 border-b border-gray-600">
                        <p className="text-[16px] font-medium text-white">{session.user.name}</p>
                        <p className="text-[14px] text-gray-300">{session.user.email}</p>
                      </div>
                      
                      <Link
                        href="/account"
                        className="block px-4 py-3 text-white text-[16px] hover:bg-gray-700 rounded-lg transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        პროფილი
                      </Link>
                      
                      <button
                        onClick={() => {
                          signOut()
                          setIsMobileMenuOpen(false)
                        }}
                        className="w-full px-4 py-3 text-[16px] text-white font-bold uppercase tracking-wide hover:bg-gray-700 rounded-lg transition-colors flex items-center justify-center space-x-2"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>გასვლა</span>
                      </button>
                    </div>
                  )
                ) : (
                  <div className="space-y-2">
                    <Link
                      href="/auth/signin"
                      className="block px-4 py-3 text-white text-[16px] font-medium border border-white rounded-lg text-center transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      შესვლა
                    </Link>
                    <Link
                      href="/auth/signup"
                      className="block px-4 py-3 bg-white text-[#1B3729] text-[16px] font-medium rounded-lg text-center transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      რეგისტრაცია
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}

export default Header