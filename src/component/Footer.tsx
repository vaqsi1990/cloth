import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Facebook, Instagram, Mail, Phone, MapPin } from 'lucide-react'

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white">
      {/* Main Footer Content */}
      <div className="bg-[#1B3729] text-white py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-around  text-center md:text-left gap-12">

            {/* Logo & Company Info */}
            <div className="space-y-4 flex flex-col items-center">
              

              <div className="flex items-center justify-around space-x-4">
                <Link href="#" className="text-white font-bold text-[18px] hover:text-white transition-colors">
                  <Facebook className="w-7 h-7" />
                </Link>
                <Link href="#" className="text-white font-bold text-[18px] hover:text-white transition-colors">
                  <Instagram className="w-7 h-7" />
                </Link>
                <Link href="#" className="text-white font-bold text-[18px] hover:text-white transition-colors">
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-.88-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Navigation */}
            <div className="space-y-4 flex flex-col items-center">
              <h4 className="text-white font-bold text-[18px] font-semibold text-white mb-4">ნავიგაცია</h4>
              <ul className="space-y-2 text-center">
                <li><Link href="/" className="text-white font-normal text-[18px] transition-colors text-sm">მთავარი</Link></li>
                <li><Link href="/shop?gender=women&category=dresses" className="text-white font-normal text-[18px] transition-colors text-sm">მაღაზია</Link></li>
                <li><Link href="/shop?category=women" className="text-white font-normal text-[18px] transition-colors text-sm">ქალების კოლექცია</Link></li>
                <li><Link href="/shop?category=men" className="text-white font-normal text-[18px] transition-colors text-sm">კაცების კოლექცია</Link></li>
                <li><Link href="/shop?category=children" className="text-white font-normal text-[18px] transition-colors text-sm">ბავშვების კოლექცია</Link></li>
              </ul>
            </div>

            {/* Contact Info */}
            <div className="space-y-4 flex flex-col items-center">
              <h4 className="text-white font-bold text-[18px] font-bold mb-4">კონტაქტი</h4>
              <div className="space-y-3 text-center">
                <div className="flex items-center justify-center space-x-3">
                  <MapPin className="w-4 h-4 text-white" />
                  <span className="text-white font-normal text-[18px]">
                    123 Fashion Street<br />Tbilisi, Georgia
                  </span>
                </div>
                <div className="flex items-center justify-center space-x-3">
                  <Phone className="w-4 h-4 text-white" />
                  <span className="text-white font-normal text-[18px]">+995 123 456 789</span>
                </div>
                <div className="flex items-center justify-center space-x-3">
                  <Mail className="w-4 h-4 text-white" />
                  <span className="text-white font-normal text-[18px]">info@style.ge</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </footer>
  )
}

export default Footer
