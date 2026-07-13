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
  MapPin,
  Info,
  Ticket,
  ShieldBan,
  Import,
} from 'lucide-react'
import ChatUnreadBadge from '@/components/ChatUnreadBadge'
import { useSupportChatNotification } from '@/components/SupportChatNotificationProvider'
import {
  buildAdminAlertsQuery,
  type AdminDashboardSection,
} from '@/lib/admin-dashboard-seen'

// ---------------------
// Types
// ---------------------
interface AdminAlerts {
  pendingProductApprovals: number
  newUsers: number
  newOrders: number
  newPaidSales: number
  productsSince: number
}

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
  const [alerts, setAlerts] = useState<AdminAlerts>({
    pendingProductApprovals: 0,
    newUsers: 0,
    newOrders: 0,
    newPaidSales: 0,
    productsSince: 0,
  })
  const { unreadCount: unreadChatCount } = useSupportChatNotification()
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
    // SUPPORT doesn't need stats, only ADMIN does
  }, [status, session?.user?.role])

  useEffect(() => {
    const fetchAdminAlerts = async () => {
      try {
        const query = buildAdminAlertsQuery(['users', 'products', 'orders', 'salesInfo'])
        const response = await fetch(
          `/api/admin/alerts${query ? `?${query}` : ''}`,
          { cache: 'no-store' },
        )
        const result = await response.json()
        if (result.success && result.alerts) {
          setAlerts(result.alerts)
        }
      } catch (error) {
        console.error('Error fetching admin alerts:', error)
      }
    }

    if (status === 'authenticated' && session?.user?.role === 'ADMIN') {
      void fetchAdminAlerts()
      const interval = setInterval(() => {
        void fetchAdminAlerts()
      }, 30000)
      return () => clearInterval(interval)
    }
  }, [status, session?.user?.role])

  const getActionAlertCount = (title: string): number => {
    switch (title) {
      case 'მომხმარებლების მართვა':
        return alerts.newUsers
      case 'პროდუქტების მართვა':
        return alerts.productsSince || alerts.pendingProductApprovals
      case 'შეკვეთების მართვა':
        return alerts.newOrders
      case 'შეკვეთების ინფორმაცია':
        return alerts.newPaidSales
      default:
        return 0
    }
  }

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
  // Access denied - Only ADMIN
  // ---------------------
  if (!session || session.user.role !== 'ADMIN') {
    // Redirect SUPPORT to their own page
    if (session?.user?.role === 'SUPPORT') {
      router.push('/support')
      return null
    }
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
      title: 'შეკვეთების ინფორმაცია',
      description: 'ნახე და მართე შეკვეთები',
      href: '/admin/info',
      icon: Info,
      color: 'bg-gray-600',
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
      title: 'შავი სია',
      description: 'დაბლოკილი მომხმარებლების ინფორმაცია',
      href: '/admin/blacklist',
      icon: ShieldBan,
      color: 'bg-red-700',
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
      title: 'ქირავების მოთხოვნები',
      description: 'მოთხოვნები დაჯავშნამდე',
      href: '/admin/inquiries',
      icon: MessageCircle,
      color: 'bg-emerald-700',
    },
    {
      title: 'მიტანის ქალაქები',
      description: 'დაამატე და მართე მიტანის ქალაქები',
      href: '/admin/delivery-cities',
      icon: MapPin,
      color: 'bg-teal-600',
    },
    {
      title: 'ვაუჩერები',
      description: 'შექმენი ფასდაკლების კოდები ლარში',
      href: '/admin/vouchers',
      icon: Ticket,
      color: 'bg-amber-600',
    },
    {
      title: 'პარამეტრები',
      description: 'შეცვალე პროფილი და პაროლი',
      href: '/admin/settings',
      icon: User,
      color: 'bg-gray-600',
    },
    {
      title: 'ანალიტიკა',
      description: 'ვიზიტორები და IP სტატისტიკა',
      href: '/admin/analytics',
      icon: BarChart3,
      color: 'bg-indigo-600',
    },
    {
      title: 'იმპორტი',
      description: 'დააიმპორტე პროდუქტები ერთი იუზერიდან სხვაზე',
      href: '/admin/import',
      icon: Import,
      color: 'bg-indigo-600',
    },
    {
      title: 'ახალი პროდუქტი',
      description: 'დაამატე ახალი პროდუქტი კატალოგში',
      href: '/admin/products/new',
      icon: Plus,
      color: 'bg-black',
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
            <div className="flex items-center gap-3">
              <Link
                href="/admin/chat"
                className="relative flex items-center gap-2 px-4 py-2 bg-[#1B3729] text-white rounded-lg hover:bg-[#2a4d3a] transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                <span className="md:text-[16px] text-[14px] font-medium">Live Chat</span>
                <ChatUnreadBadge count={unreadChatCount} className="absolute -top-2 -right-2" />
              </Link>
              <Link
                href="/"
                className="px-4 py-2 bg-black md:text-[18px] text-[16px] text-white rounded-lg font-bold uppercase tracking-wide transition-colors"
              >
                მთავარ გვერდზე დაბრუნება
              </Link>
            </div>
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
            {quickActions.map((action, index) => {
              const alertCount = getActionAlertCount(action.title)
              return (
              <Link
                key={index}
                href={action.href}
                className="group block p-6 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all duration-300 hover:shadow-md relative"
              >
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <div
                      className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}
                    >
                      <action.icon className="w-6 h-6 text-white" />
                    </div>
                    {action.title === 'Live Chat' && (
                      <ChatUnreadBadge count={unreadChatCount} className="absolute -top-2 -right-2" />
                    )}
                    {alertCount > 0 && action.title !== 'Live Chat' && (
                      <ChatUnreadBadge count={alertCount} className="absolute -top-2 -right-2" />
                    )}
                  </div>
                  <div>
                    <h3 className={`font-semibold md:text-[20px] text-[18px] group-hover:text-black transition-colors ${
                      alertCount > 0 ? 'text-red-600' : 'text-black'
                    }`}>
                      {action.title}
                    </h3>
                    <p className="md:text-[18px] text-[16px] text-black mt-1">
                      {action.description}
                    </p>
                  </div>
                </div>
              </Link>
            )})}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
