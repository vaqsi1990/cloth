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
            <div className="space-y-6 flex flex-col items-center md:items-start max-w-sm">
              <div className="group   cursor-pointer">
                <Image
                  src="/logo.jpg"
                  className="w-16 h-16 md:w-20 md:h-20 rounded-full transition-transform duration-300 group-hover:scale-110 shadow-lg"
                  alt="Dressla Logo"
                  width={80}
                  height={80}
                  priority
                />
              </div>
              <p className='text-white text-center md:text-left text-base md:text-lg leading-relaxed max-w-xs md:max-w-sm'>
                Dressla — პლატფორმა, სადაც სხვადასხვა ბრენდი ერთ სივრცეში აერთიანებს ხარისხიან და მრავალფეროვან სტილს. მარტივი, სწრაფი და კომფორტული შოპინგი ყველასთვის.
              </p>
              <div className="flex  items-center justify-center md:justify-start gap-4 pt-2">
                <Link 
                  href="#" 
                  className="text-white hover:text-blue-400 transition-all duration-300 hover:scale-110"
                  aria-label="Facebook"
                >
                  <Facebook className="w-6 h-6 md:w-7 md:h-7" />
                </Link>
                <Link 
                  href="#" 
                  className="text-white hover:text-pink-500 transition-all duration-300 hover:scale-110"
                  aria-label="Instagram"
                >
                  <Instagram className="w-6 h-6 md:w-7 md:h-7" />
                </Link>
                <Link 
                  href="#" 
                  className="text-white hover:text-black transition-all duration-300 hover:scale-110"
                  aria-label="TikTok"
                >
                  <svg 
                    className="w-6 h-6 md:w-7 md:h-7" 
                    viewBox="0 0 24 24" 
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-.88-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Navigation */}
            <div className="space-y-4 flex flex-col items-start">
              <h2 className="text-white font-bold text-[18px] font-semibold text-white mb-4">ნავიგაცია</h2>
              <ul className="space-y-2 text-start">
                <li><Link href="/" className="text-white font-normal text-[18px] transition-colors text-sm">მთავარი</Link></li>
                <li><Link href="/about" className="text-white font-normal text-[18px] transition-colors text-sm">ჩვენს შესახებ</Link></li>
                <li><Link href="/shop?category=women" className="text-white font-normal text-[18px] transition-colors text-sm">ქალების კოლექცია</Link></li>
                <li><Link href="/shop?category=men" className="text-white font-normal text-[18px] transition-colors text-sm">კაცების კოლექცია</Link></li>
                <li><Link href="/shop?category=children" className="text-white font-normal text-[18px] transition-colors text-sm">ბავშვების კოლექცია</Link></li>
              </ul>
            </div>

            {/* Contact Info */}
            <div className="space-y-4 flex flex-col items-start">
              <h4 className="text-white font-bold text-[18px] font-bold mb-4">კონტაქტი</h4>
              <div className="space-y-3 text-start">
                <div className="flex items-center justify-center space-x-3">
                 <Image src="/frame1.png" alt="location" width={60} height={60} />
                  <span className="text-white font-normal text-[18px]">

                    ლეო დავითაშვილის ქუჩა 120, <br /> 0190 თბილისი, საქართველო
                  </span>
                </div>
                <div className="flex items-center justify-start space-x-3">
                  <Image src="/frame2.png" alt="phone" width={60} height={60} />
                  <span className="text-white font-normal text-[18px]">
                    (+995)599 55 53 95</span>
                </div>
                <div className="flex items-center justify-start space-x-3">
                  <Image src="/frame3.png" alt="email" width={60} height={60} />
                  <span className="text-white font-normal text-[18px]">dressla.online@gmail.com</span>
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
