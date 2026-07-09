'use client'

import React, { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Truck, MapPin, Settings, Package } from 'lucide-react'
import { isCourier } from '@/lib/roles'

const CourierDashboard = () => {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session || !isCourier(session.user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-black mb-4">წვდომა აკრძალულია</h1>
          <Link href="/" className="px-6 py-2 bg-black text-white rounded-lg">
            მთავარ გვერდზე დაბრუნება
          </Link>
        </div>
      </div>
    )
  }

  const quickActions = [
    {
      title: 'მიტანები',
      description: 'საიდან აიღო და სად მიიტანო ნივთი',
      href: '/courier/deliveries',
      icon: MapPin,
      color: 'bg-emerald-700',
    },
    {
      title: 'პარამეტრები',
      description: 'პროფილი და პაროლი',
      href: '/courier/settings',
      icon: Settings,
      color: 'bg-gray-700',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-700 rounded-xl flex items-center justify-center">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">კურიერის პანელი</h1>
                <p className="text-gray-600 mt-1">მოგესალმებით, {session.user.name}</p>
              </div>
            </div>
            <Link
              href="/"
              className="px-4 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              მთავარი
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-6">
            <Package className="w-5 h-5 text-gray-600" />
            <h2 className="text-xl font-bold text-black">სამუშაო გვერდები</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="group block p-6 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all hover:shadow-md"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}
                  >
                    <action.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-black text-lg">{action.title}</h3>
                    <p className="text-gray-600 mt-1">{action.description}</p>
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

export default CourierDashboard
