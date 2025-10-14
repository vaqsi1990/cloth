'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ShoppingBag, Search, Menu,  User } from 'lucide-react'
import Image from 'next/image'
import { useCart } from '@/context/CartContext'

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const { getTotalItems } = useCart()

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const toggleSearch = () => {
    setIsSearchOpen(!isSearchOpen)
  }

  return (
    <header className="bg-white  shadow-md sticky top-0 z-50">
   

      {/* Main header */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="text-2xl font-bold text-gray-900 hover:text-gray-700 transition-colors">
           <Image src="/logo.jpg" className='rounded-full' alt="logo" width={60} height={60} />
          </Link>

                     {/* Desktop Navigation */}
           <nav className="hidden lg:flex items-center space-x-8">
             <Link href="/shop?category=women" className="text-black md:text-[20px] text-[18px]  font-medium transition-colors">
           ქალი
             </Link>
             <Link href="/shop?category=men" className="text-black md:text-[20px] text-[18px]  font-medium transition-colors">
             მამაკაცი
             </Link>
             <Link href="/shop?category=children" className="text-black md:text-[20px] text-[18px]  font-medium transition-colors">
             ბავშვები
             </Link>
            
          
            
          
          </nav>

          {/* Search, Account, Cart */}
          <div className="flex items-center space-x-4">
            {/* Search */}
            <button
              onClick={toggleSearch}
              className="p-2 text-black cursor-pointer  transition-colors"
              aria-label="Search"
            >
              <Search className="w-5 h-5 md:w-7 md:h-7 cursor-pointer" />
            </button>

            {/* Account */}
            <Link href="/account" className="p-2 text-black  transition-colors">
              <User className="w-5 h-5 md:w-7 md:h-7 cursor-pointer" />
            </Link>

            {/* Cart */}
            <Link href="/cart" className="p-2 text-black  transition-colors relative">
              <ShoppingBag className="w-5 h-5 md:w-7 md:h-7 cursor-pointer" />
              {getTotalItems() > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {getTotalItems()}
                </span>
              )}
            </Link>

            {/* Mobile menu button */}
            <button
              onClick={toggleMobileMenu}
                className="lg:hidden p-2 text-black  transition-colors"
              aria-label="Toggle mobile menu"
            >
              <Menu className="w-6 h-6 cursor-pointer" />
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      {isSearchOpen && (
        <div className="bg-white border-t border-black py-4">
          <div className="container mx-auto px-4">
            <div className="relative max-w-md mx-auto">
              <input
                type="text"
                placeholder="მოძებნე ნივთები..."
                className="w-full pl-10 pr-4 py-2 border border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Search className="absolute cursor-pointer left-3 top-2.5 w-5 h-5 text-black" />
            </div>
          </div>
        </div>
      )}

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="lg:hidden h-screen bg-white border-t border-black">
          <nav className="container mx-auto px-4 py-4">
                         <div className="flex flex-col space-y-4">
               <Link 
                 href="/shop?category=women" 
                 className="text-black hover:text-gray-900 font-medium py-2 transition-colors"
                 onClick={() => setIsMobileMenuOpen(false)}
               >
                 ქალი
               </Link>
               <Link 
                 href="/shop?category=men" 
                 className="text-black hover:text-gray-900 font-medium py-2 transition-colors"
                 onClick={() => setIsMobileMenuOpen(false)}
               >
                 მამაკაცი
               </Link>
               <Link 
                 href="/shop?category=children" 
                 className="text-black hover:text-gray-900 font-medium py-2 transition-colors"
                 onClick={() => setIsMobileMenuOpen(false)}
               >
                 ბავშვები
               </Link>
             
            
            
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}

export default Header