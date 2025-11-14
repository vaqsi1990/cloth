'use client'

import React from 'react'
import { CheckCircle, ShoppingCart, Package, RotateCcw } from 'lucide-react'

const HowItWorks = () => {
  const steps = [
    {
      id: 1,
      icon: CheckCircle,
      title: 'აირჩიე',
      desc: 'იპოვე შენი სტილი კოლექციიდან — ნებისმიერი შემთხვევისთვის.',
      color: 'from-blue-500/90 to-indigo-500/90',
    },
    {
      id: 2,
      icon: ShoppingCart,
      title: 'დაჯავშნე',
      desc: 'მარტივად დაამატე კალათაში და დააფიქსირე თარიღი.',
      color: 'from-emerald-500/90 to-teal-500/90',
    },
    {
      id: 3,
      icon: Package,
      title: 'მიიღე',
      desc: 'მიწოდება სწრაფად და ფრთხილად — როგორც გეკუთვნის.',
      color: 'from-violet-500/90 to-purple-500/90',
    },
    {
      id: 4,
      icon: RotateCcw,
      title: 'დააბრუნე',
      desc: 'გამოიყენე, გაიბრწყინე და მარტივად დააბრუნე.',
      color: 'from-amber-500/90 to-orange-500/90',
    },
  ]

  return (
    <section className="px-4 pb-14 mx-auto max-w-7xl ">
    
      <div className="text-center mb-12">
        <h2 className="text-[20px] md:text-[30px] font-semibold uppercase tracking-widest text-gray-900 mb-3">
          როგორ მუშაობს
        </h2>
        
      </div>


      <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
      
        <div className="bg-white rounded-3xl shadow-lg p-8 border border-gray-100 hover:-translate-y-2 hover:shadow-xl transition-all duration-500">
          <div className="flex items-center justify-between mb-6">
            <p className="text-2xl font-bold text-gray-900">ნაბიჯი 1</p>
            <svg className="w-6 text-black transform rotate-90 sm:rotate-0" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <polyline points="15,5 22,12 15,19"></polyline>
            </svg>
          </div>
          <p className="text-black text-[18px] md:text-[20px] leading-relaxed">
         აირჩიე
          </p>
        </div>

      
        <div className="bg-white rounded-3xl shadow-lg p-8 border border-gray-100 hover:-translate-y-2 hover:shadow-xl transition-all duration-500">
          <div className="flex items-center justify-between mb-6">
            <p className="text-2xl font-bold text-gray-900">ნაბიჯი 2</p>
            <svg className="w-6 text-black transform rotate-90 sm:rotate-0" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <polyline points="15,5 22,12 15,19"></polyline>
            </svg>
          </div>
          <p className="text-black text-[18px] md:text-[20px] leading-relaxed">
         დაჯავშნე
          </p>
        </div>

    
        <div className="bg-white rounded-3xl shadow-lg p-8 border border-gray-100 hover:-translate-y-2 hover:shadow-xl transition-all duration-500">
          <div className="flex items-center justify-between mb-6">
            <p className="text-2xl font-bold text-gray-900">ნაბიჯი 3</p>
            <svg className="w-6 text-black transform rotate-90 sm:rotate-0" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <polyline points="15,5 22,12 15,19"></polyline>
            </svg>
          </div>
          <p className="text-black text-[18px] md:text-[20px] leading-relaxed">
         მიიღე
          </p>
        </div>

 
        <div className="bg-white rounded-3xl shadow-lg p-8 border border-gray-100 hover:-translate-y-2 hover:shadow-xl transition-all duration-500">
          <div className="flex items-center justify-between mb-6">
            <p className="text-2xl font-bold text-gray-900">დასრულება</p>
            <svg className="w-8 text-green-500" stroke="currentColor" viewBox="0 0 24 24">
              <polyline fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                strokeMiterlimit="10" points="6,12 10,16 18,8"></polyline>
            </svg>
          </div>
          <p className="text-black text-[18px] md:text-[20px] leading-relaxed">
         დააბრუნე
          </p>
        </div>
      </div>
    </section>

  )
}

export default HowItWorks
