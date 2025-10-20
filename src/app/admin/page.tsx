'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Users, Package, ShoppingCart, BarChart3, User } from 'lucide-react'

interface AdminStats {
  totalProducts: number
  totalUsers: number
  totalOrders: number
  totalRevenue: number
}

interface Order {
  id: number
  total: number
  status: string
  createdAt: string
  user?: {
    name: string
  }
  customerName?: string
}

interface Product {
  id: number
  name: string
  createdAt: string
  user?: {
    name: string
  }
}

interface User {
  id: string
  name: string
  email: string
  createdAt: string
}

interface RecentActivity {
  id: string
  type: 'product' | 'user' | 'order'
  action: string
  description: string
  timestamp: string
  user?: string
}

const AdminDashboard = () => {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats>({
    totalProducts: 0,
    totalUsers: 0,
    totalOrders: 0,
    totalRevenue: 0
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      fetchAdminStats()
    }
  }, [session])

  const fetchAdminStats = async () => {
    try {
      setLoading(true)
      
      // Fetch products count
      const productsResponse = await fetch('/api/products')
      const productsData = await productsResponse.json()
      const totalProducts = productsData.success ? productsData.products.length : 0

      // Fetch users count
      const usersResponse = await fetch('/api/admin/users')
      const usersData = await usersResponse.json()
      const totalUsers = usersData.success ? usersData.users.length : 0

      // Fetch orders count
      const ordersResponse = await fetch('/api/admin/orders')
      const ordersData = await ordersResponse.json()
      const totalOrders = ordersData.success ? ordersData.orders.length : 0

      // Calculate total revenue
      const totalRevenue = ordersData.success 
        ? ordersData.orders.reduce((sum: number, order: Order) => sum + order.total, 0)
        : 0

      setStats({
        totalProducts,
        totalUsers,
        totalOrders,
        totalRevenue
      })

      // Fetch recent activity
      await fetchRecentActivity(productsData, usersData, ordersData)
    } catch (error) {
      console.error('Error fetching admin stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRecentActivity = async (productsData: { success: boolean; products?: Product[] }, usersData: { success: boolean; users?: User[] }, ordersData: { success: boolean; orders?: Order[] }) => {
    try {
      const activities: RecentActivity[] = []

      // Recent products (last 3)
      if (productsData.success && productsData.products && productsData.products.length > 0) {
        const recentProducts = productsData.products.slice(0, 3)
        recentProducts.forEach((product: Product) => {
          activities.push({
            id: `product-${product.id}`,
            type: 'product',
            action: 'ახალი პროდუქტი დაემატა',
            description: product.name,
            timestamp: new Date(product.createdAt).toLocaleDateString('ka-GE'),
            user: product.user?.name || 'Unknown'
          })
        })
      }

      // Recent users (last 2)
      if (usersData.success && usersData.users && usersData.users.length > 0) {
        const recentUsers = usersData.users.slice(0, 2)
        recentUsers.forEach((user: User) => {
          activities.push({
            id: `user-${user.id}`,
            type: 'user',
            action: 'ახალი მომხმარებელი',
            description: user.name || user.email,
            timestamp: new Date(user.createdAt).toLocaleDateString('ka-GE')
          })
        })
      }

      // Recent orders (last 2)
      if (ordersData.success && ordersData.orders && ordersData.orders.length > 0) {
        const recentOrders = ordersData.orders.slice(0, 2)
        recentOrders.forEach((order: Order) => {
          activities.push({
            id: `order-${order.id}`,
            type: 'order',
            action: 'ახალი შეკვეთა',
            description: `შეკვეთა #${order.id}`,
            timestamp: new Date(order.createdAt).toLocaleDateString('ka-GE'),
            user: order.user?.name || order.customerName
          })
        })
      }

      // Sort by timestamp (most recent first) and take last 3
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setRecentActivity(activities.slice(0, 3))
    } catch (error) {
      console.error('Error fetching recent activity:', error)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!session || session.user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-black mb-4">Access Denied</h1>
          <p className="text-black mb-6">You don&apos;t have permission to access this page.</p>
          <Link
            href="/"
            className="px-6 py-2 bg-[#1B3729] text-white rounded-lg font-bold uppercase tracking-wide  transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    )
  }

  const statsData = [
    {
      title: 'მთლიანი პროდუქტები',
      value: stats.totalProducts.toString(),
      icon: Package,
      color: 'bg-blue-500'
    },
    {
      title: 'მომხმარებლები',
      value: stats.totalUsers.toString(),
      icon: Users,
      color: 'bg-green-500'
    },
    {
      title: 'შეკვეთები',
      value: stats.totalOrders.toString(),
      icon: ShoppingCart,
      color: 'bg-purple-500'
    },
    {
      title: 'შემოსავალი',
      value: `₾${stats.totalRevenue.toFixed(2)}`,
      icon: BarChart3,
      color: 'bg-orange-500'
    }
  ]

  const quickActions = [
    {
      title: 'ახალი პროდუქტი',
      description: 'დაამატე ახალი პროდუქტი კატალოგში',
      href: '/admin/products/new',
      icon: Plus,
      color: 'bg-black'
    },
    {
      title: 'პროდუქტების მართვა',
      description: 'შეცვალე ან წაშალე არსებული პროდუქტები',
      href: '/admin/products',
      icon: Package,
      color: 'bg-blue-600'
    },
    {
      title: 'მომხმარებლების მართვა',
      description: 'ნახე და მართე მომხმარებლები',
      href: '/admin/users',
      icon: Users,
      color: 'bg-green-600'
    },
    {
      title: 'შეკვეთების მართვა',
      description: 'ნახე და მართე შეკვეთები',
      href: '/admin/orders',
      icon: ShoppingCart,
      color: 'bg-purple-600'
    },
    {
      title: 'პარამეტრები',
      description: 'შეცვალე პროფილი და პაროლი',
      href: '/admin/settings',
      icon: User,
      color: 'bg-gray-600'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">ადმინ პანელი</h1>
              <p className="text-gray-600 mt-1">მოგესალმებით, {session.user.name}</p>
            </div>
            <Link
              href="/"
              className="px-4 py-2 bg-[#1B3729] text-white rounded-lg font-bold uppercase tracking-wide  transition-colors"
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
            <div key={index} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">სწრაფი მოქმედებები</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
            {quickActions.map((action, index) => (
              <Link
                key={index}
                href={action.href}
                className="group block p-6 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all duration-300 hover:shadow-md"
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                    <action.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-black transition-colors">
                      {action.title}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {action.description}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-8 bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">ბოლო აქტივობა</h2>
          
          {recentActivity.length === 0 ? (
            <div className="text-center py-8">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">ჯერ არ არის აქტივობა</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      activity.type === 'product' ? 'bg-green-100' :
                      activity.type === 'user' ? 'bg-blue-100' :
                      'bg-purple-100'
                    }`}>
                      {activity.type === 'product' && <Plus className="w-4 h-4 text-green-600" />}
                      {activity.type === 'user' && <Users className="w-4 h-4 text-blue-600" />}
                      {activity.type === 'order' && <ShoppingCart className="w-4 h-4 text-purple-600" />}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{activity.action}</p>
                      <p className="text-sm text-gray-600">{activity.description}</p>
                      {activity.user && (
                        <p className="text-xs text-gray-500">მომხმარებელი: {activity.user}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">{activity.timestamp}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard