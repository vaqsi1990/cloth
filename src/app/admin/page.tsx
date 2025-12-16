'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Plus,
  Users,
  Package,
  ShoppingCart,
  BarChart3,
  User,
  MessageCircle,
} from 'lucide-react'

// ---------------------
// Types
// ---------------------
interface AdminStats {
  totalProducts: number
  totalUsers: number
  totalOrders: number
  totalRevenue: number
}

// ---------------------
// Component
// ---------------------
const AdminDashboard = () => {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats>({
    totalProducts: 0,
    totalUsers: 0,
    totalOrders: 0,
    totalRevenue: 0,
  })
  const [statsLoading, setStatsLoading] = useState(false)
  const hasFetchedRef = useRef(false)

  // Redirect unauthenticated users
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])



  // Fetch stats once when ADMIN is authenticated
  useEffect(() => {
    const fetchAdminStats = async () => {
      try {
        setStatsLoading(true)
        const response = await fetch('/api/admin/stats')
        const result = await response.json()

        if (result.success && result.stats) {
          setStats({
            totalProducts: result.stats.totalProducts,
            totalUsers: result.stats.totalUsers,
            totalOrders: result.stats.totalOrders,
            totalRevenue: result.stats.totalRevenue,
          })
        } else {
          console.error('Stats API failed:', result)
        }
      } catch (error) {
        console.error('Error fetching admin stats:', error)
      } finally {
        setStatsLoading(false)
      }
    }

    const userRole = session?.user?.role
    if (status === 'authenticated' && userRole === 'ADMIN' && !hasFetchedRef.current) {
      hasFetchedRef.current = true
      fetchAdminStats()
    }
  }, [status, session?.user?.role])

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
  if (!session || session.user.role !== 'ADMIN') {
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
  // Stats + Quick Actions
  // ---------------------
  const statsData = [
    {
      title: 'მთლიანი პროდუქტები',
      value: stats.totalProducts.toString(),
      icon: Package,
      color: 'bg-blue-500',
    },
    {
      title: 'მომხმარებლები',
      value: stats.totalUsers.toString(),
      icon: Users,
      color: 'bg-green-500',
    },
    {
      title: 'შეკვეთები',
      value: stats.totalOrders.toString(),
      icon: ShoppingCart,
      color: 'bg-purple-500',
    },
    {
      title: 'შემოსავალი',
      value: `₾${stats.totalRevenue.toFixed(2)}`,
      icon: BarChart3,
      color: 'bg-orange-500',
    },
  ]

  const quickActions = [
    {
      title: 'ახალი პროდუქტი',
      description: 'დაამატე ახალი პროდუქტი კატალოგში',
      href: '/admin/products/new',
      icon: Plus,
      color: 'bg-black',
    },
    {
      title: 'პროდუქტების მართვა',
      description: 'შეცვალე ან წაშალე არსებული პროდუქტები',
      href: '/admin/products',
      icon: Package,
      color: 'bg-blue-600',
    },
    {
      title: 'მომხმარებლების მართვა',
      description: 'ნახე და მართე მომხმარებლები',
      href: '/admin/users',
      icon: Users,
      color: 'bg-green-600',
    },
    {
      title: 'შეკვეთების მართვა',
      description: 'ნახე და მართე შეკვეთები',
      href: '/admin/orders',
      icon: ShoppingCart,
      color: 'bg-purple-600',
    },
    {
      title: 'Live Chat',
      description: 'მომხმარებლებთან საუბარი',
      href: '/admin/chat',
      icon: MessageCircle,
      color: 'bg-indigo-600',
    },
    {
      title: 'პარამეტრები',
      description: 'შეცვალე პროფილი და პაროლი',
      href: '/admin/settings',
      icon: User,
      color: 'bg-gray-600',
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
              <h1 className="md:text-[24px] text-[20px] font-bold text-gray-900">ადმინ პანელი</h1>
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
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsData.map((stat, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="md:text-[18px] text-[16px] font-medium text-black">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {statsLoading ? (
                      <span className="inline-block w-8 h-6 bg-gray-200 rounded animate-pulse"></span>
                    ) : (
                      stat.value
                    )}
                  </p>
                </div>
                <div
                  className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}
                >
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
       

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
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

export default AdminDashboard
