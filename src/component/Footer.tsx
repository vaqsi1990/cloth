import React from 'react'
import Link from 'next/link'
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin } from 'lucide-react'

const Footer = () => {


  return (
    <footer className="bg-gray-900 text-white">
      {/* Main Footer Content */}
      <div className="container text-center justify-center items-center mx-auto py-12">
        <div className="flex justify-center flex-col md:flex-row gap-14">
          
          {/* Company Info */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white mb-4">STYLE</h3>
            <p className="text-gray-300 flex flex-col text-sm leading-relaxed">
              Your premier destination for fashion and style. Discover the latest trends, <br/>
              quality clothing, and exceptional service that makes every shopping experience memorable.
            </p>
            <div className="flex justify-center items-center space-x-4">
              <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                <Facebook className="w-5 h-5" />
              </Link>
              <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                <Instagram className="w-5 h-5" />
              </Link>
              <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                <Twitter className="w-5 h-5" />
              </Link>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/shop?category=women" className="text-gray-300 hover:text-white transition-colors text-sm">
                  ქალების კოლექცია
                </Link>
              </li>
              <li>
                <Link href="/shop?category=men" className="text-gray-300 hover:text-white transition-colors text-sm">
                კაცების კოლექცია
                </Link>
              </li>
              <li>
                <Link href="/shop?category=children" className="text-gray-300 hover:text-white transition-colors text-sm">
                ბავშვების კოლექცია
                </Link>
              </li>
             
              <li>
                
              </li>
            </ul>
          </div>

          

          {/* Contact Info */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white mb-4">Contact Info</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className="text-gray-300 text-sm">
                  123 Fashion Street, Tbilisi, Georgia
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="w-4 h-4 text-gray-400" />
                <span className="text-gray-300 text-sm">
                  +995 123 456 789
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="text-gray-300 text-sm">
                  info@style.ge
                </span>
              </div>
            </div>
          </div>
        </div>

      
      </div>

     
     
    </footer>
  )
}

export default Footer
