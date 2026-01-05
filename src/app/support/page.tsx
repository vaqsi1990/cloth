'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Users,
  ShoppingCart,
  MessageCircle,
  Package,
} from 'lucide-react'

const SupportDashboard = () => {
  const { data: session, status } = useSession()
  const router = useRouter()

  // Redirect unauthenticated users
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  // ---------------------
  // Loading states
  // ---------------------
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-black">იტვირთება...</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null
  }

  // ---------------------
  // Access denied
  // ---------------------
  if (!session || session.user.role !== 'SUPPORT') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-black mb-4">წვდომა აკრძალულია</h1>
          <p className="text-black mb-6">თქვენ არ გაქვთ ამ გვერდზე წვდომა.</p>
          <Link
            href="/"
            className="px-6 py-2 bg-black md:text-[18px] text-[16px] text-white rounded-lg font-bold uppercase tracking-wide transition-colors"
          >
            მთავარ გვერდზე დაბრუნება
          </Link>
        </div>
      </div>
    )
  }

  // ---------------------
  // Quick Actions for Support
  // ---------------------
  const quickActions = [
    {
      title: 'მომხმარებლების მართვა',
      description: 'ნახე და მართე მომხმარებლები',
      href: '/support/users',
      icon: Users,
      color: 'bg-green-600',
    },
    {
      title: 'შეკვეთების მართვა',
      description: 'ნახე და მართე შეკვეთები',
      href: '/support/orders',
      icon: ShoppingCart,
      color: 'bg-purple-600',
    },
    {
      title: 'Live Chat',
      description: 'მომხმარებლებთან საუბარი',
      href: '/support/chat',
      icon: MessageCircle,
      color: 'bg-indigo-600',
    },
    {
      title: 'პროდუქტების მართვა',
      description: 'შეცვალე ან წაშალე არსებული პროდუქტები',
      href: '/support/products',
      icon: Package,
      color: 'bg-indigo-600',
    },
  ]

  // ---------------------
  // Render Dashboard
  // ---------------------
  return (
    <div className="min-h-screen ">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="md:text-[24px] text-[20px] font-bold text-gray-900">საფორთის პანელი</h1>
              <p className="text-black mt-1">მოგესალმებით, {session.user.name}</p>
            </div>
            <Link
              href="/"
              className="px-4 py-2 bg-black md:text-[18px] text-[16px] text-white rounded-lg font-bold uppercase tracking-wide transition-colors"
            >
              მთავარ გვერდზე დაბრუნება
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Quick Actions */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-black mb-6">საფორთის შესაძლებლობები</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quickActions.map((action, index) => (
              <Link
                key={index}
                href={action.href}
                className="group block p-6 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all duration-300 hover:shadow-md"
              >
                <div className="flex items-center space-x-4">
                  <div
                    className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}
                  >
                    <action.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-black md:text-[20px] text-[18px] group-hover:text-black transition-colors">
                      {action.title}
                    </h3>
                    <p className="md:text-[18px] text-[16px] text-black mt-1">
                      {action.description}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SupportDashboard

