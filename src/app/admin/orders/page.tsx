'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/utils/dateUtils'
import Link from 'next/link'
import { ArrowLeft, Search, Filter, ShoppingCart, Package, User, MapPin, Phone, Mail, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { showToast } from '@/utils/toast'

interface OrderItem {
  id: number
  productId?: number
  productName: string
  image?: string
  size?: string
  quantity: number
  price: number
  // Rental fields
  isRental?: boolean
  rentalStartDate?: string
  rentalEndDate?: string
  rentalDays?: number
  product?: {
    id: number
    name: string
    images: Array<{
      url: string
      alt?: string
    }>
  }
}

interface Order {
  id: number
  status: string
  total: number
  createdAt: string
  updatedAt: string
  customerName: string
  email?: string
  phone: string
  address: string
  city?: string
  postalCode?: string
  country?: string
  note?: string
  paymentMethod?: string
  paymentId?: string
  userId?: string
  user?: {
    id: string
    name: string
    email: string
  }
  items: OrderItem[]
}

const AdminOrdersPage = () => {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/orders')
      const data = await response.json()
      
      if (data.success) {
        setOrders(data.orders)
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role === 'ADMIN') {
      fetchOrders()
    }
  }, [status, session?.user?.role, fetchOrders])

  const handleStatusUpdate = async (orderId: number, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })
      
      if (response.ok) {
        setOrders(orders.map(order => 
          order.id === orderId ? { ...order, status: newStatus } : order
        ))
      } else {
        showToast('შეცდომა სტატუსის განახლებისას', 'error')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      showToast('შეცდომა სტატუსის განახლებისას', 'error')
    }
  }

  const deleteOrder = async (orderId: number) => {
    if (!confirm('ნამდვილად გსურთ ამ შეკვეთის წაშლა? ეს ქმედება შეუქცევადია.')) {
      return
    }

    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        setOrders(orders.filter(order => order.id !== orderId))
        showToast('შეკვეთა წაიშალა წარმატებით', 'success')
      } else {
        const data = await response.json()
        showToast(data.message || 'შეცდომა შეკვეთის წაშლისას', 'error')
      }
    } catch (error) {
      console.error('Error deleting order:', error)
      showToast('შეცდომა შეკვეთის წაშლისას', 'error')
    }
  }

  const toggleOrderExpansion = (orderId: number) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(orderId)) {
        newSet.delete(orderId)
      } else {
        newSet.add(orderId)
      }
      return newSet
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'PAID':
        return 'bg-blue-100 text-blue-800'
      case 'SHIPPED':
        return 'bg-purple-100 text-purple-800'
      case 'CANCELED':
        return 'bg-red-100 text-red-800'
      case 'REFUNDED':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-4 h-4" />
      case 'PAID':
        return <CheckCircle className="w-4 h-4" />
      case 'SHIPPED':
        return <Package className="w-4 h-4" />
      case 'CANCELED':
        return <XCircle className="w-4 h-4" />
      case 'REFUNDED':
        return <XCircle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'მოლოდინი'
      case 'PAID':
        return 'გადახდილი'
      case 'SHIPPED':
        return 'გაგზავნილი'
      case 'CANCELED':
        return 'გაუქმებული'
      case 'REFUNDED':
        return 'დაბრუნებული'
      default:
        return status
    }
  }

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.id.toString().includes(searchTerm.toLowerCase()) ||
                         order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (order.email && order.email.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = filterStatus === 'ALL' || order.status === filterStatus
    
    return matchesSearch && matchesStatus
  })

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
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex items-center space-x-2 text-black hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>ადმინ პანელი</span>
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">შეკვეთების მართვა</h1>
                <p className="text-black mt-1">მართე ყველა შეკვეთა</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Filters */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="შეკვეთის ძებნა..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full pl-10 pr-4 py-3 text-black  border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent appearance-none"
              >
                <option value="ALL">ყველა სტატუსი</option>
                <option value="PENDING">მოლოდინი</option>
                <option value="PAID">გადახდილი</option>
                <option value="SHIPPED">გაგზავნილი</option>
                <option value="CANCELED">გაუქმებული</option>
                <option value="REFUNDED">დაბრუნებული</option>
              </select>
            </div>
          </div>
        </div>

        {/* Orders List */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              შეკვეთები ({filteredOrders.length})
            </h2>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-black mb-4">
                {searchTerm || filterStatus !== 'ALL'
                  ? 'ფილტრის შედეგები ვერ მოიძებნა'
                  : 'ჯერ არ არის შეკვეთები'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredOrders.map((order) => (
                <div key={order.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  {/* Order Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <ShoppingCart className="w-5 h-5 text-black" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">შეკვეთა #{order.id}</h3>
                        <p className="text-sm text-black">
                          {formatDate(order.createdAt)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <span className={`px-3 py-1 rounded-full text-sm flex items-center space-x-1 ${getStatusColor(order.status)}`}>
                        {getStatusIcon(order.status)}
                        <span>{getStatusText(order.status)}</span>
                      </span>
                      {/* Rental indicator */}
                      {order.items.some(item => item.isRental) && (
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                          ქირაობა
                        </span>
                      )}
                      <span className="text-lg font-bold text-gray-900">₾{order.total}</span>
                      <button
                        onClick={() => toggleOrderExpansion(order.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title={expandedOrders.has(order.id) ? 'დეტალების დამალვა' : 'დეტალების ჩვენება'}
                      >
                        {expandedOrders.has(order.id) ? (
                          <ChevronUp className="w-5 h-5 text-black" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-black" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Order Details - Only show when expanded */}
                  {expandedOrders.has(order.id) && (
                    <>
                      {/* Customer Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2 text-sm text-black">
                            <User className="w-4 h-4" />
                            <span>{order.customerName}</span>
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-black">
                            <Mail className="w-4 h-4" />
                            <span>{order.email || 'N/A'}</span>
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-black">
                            <Phone className="w-4 h-4" />
                            <span>{order.phone}</span>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2 text-sm text-black">
                            <MapPin className="w-4 h-4" />
                            <span>{order.address}</span>
                          </div>
                          {order.user && (
                            <div className="flex items-center space-x-2 text-sm text-black">
                              <User className="w-4 h-4" />
                              <span>რეგისტრირებული მომხმარებელი: {order.user.name}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Order Items */}
                      <div className="mb-4">
                        <h2 className="font-medium text-gray-900 mb-2">შეკვეთის პროდუქტები:</h2>
                        <div className="space-y-2">
                          {order.items.map((item) => (
                            <div key={item.id} className={`flex items-center space-x-3 p-2 rounded-lg ${item.isRental ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                              <div className={`w-8 h-8 rounded flex items-center justify-center ${item.isRental ? 'bg-blue-200' : 'bg-gray-200'}`}>
                                <Package className={`w-4 h-4 ${item.isRental ? 'text-blue-600' : 'text-black'}`} />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium text-gray-900">{item.product?.name || item.productName || 'პროდუქტი ვერ მოიძებნა'}</p>
                                  {item.isRental && (
                                    <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                                      ქირაობა
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-black">რაოდენობა: {item.quantity}</p>
                                {/* Show rental information if it's a rental item */}
                                {item.isRental && item.rentalStartDate && item.rentalEndDate && (
                                  <div className="text-xs text-blue-600 mt-1 space-y-1">
                                    <p>📅 ქირაობის პერიოდი: {formatDate(item.rentalStartDate)} - {formatDate(item.rentalEndDate)}</p>
                                    <p>⏱️ დღეების რაოდენობა: {item.rentalDays} დღე</p>
                                  </div>
                                )}
                              </div>
                              <span className="text-sm font-medium text-gray-900">₾{item.price}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Order Summary */}
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">შეკვეთის შეჯამება:</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-black">ყიდვის ნივთები:</span>
                            <span className="font-medium">{order.items.filter(item => !item.isRental).reduce((total, item) => total + item.quantity, 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-black">ქირაობის ნივთები:</span>
                            <span className="font-medium text-blue-600">{order.items.filter(item => item.isRental).length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-black">სულ თანხა:</span>
                            <span className="font-bold">₾{order.total.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Status Actions */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-black">სტატუსის შეცვლა:</span>
                          <select
                            value={order.status}
                            onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                            className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                          >
                            <option value="PENDING">მოლოდინი</option>
                            <option value="PAID">გადახდილი</option>
                            <option value="SHIPPED">გაგზავნილი</option>
                            <option value="CANCELED">გაუქმებული</option>
                            <option value="REFUNDED">დაბრუნებული</option>
                          </select>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <span className="text-xs text-gray-500">
                            განახლდა: {formatDate(order.updatedAt)}
                          </span>
                        </div>
                          <button
                            onClick={() => deleteOrder(order.id)}
                            className="flex items-center space-x-1 px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 transition-colors"
                            title="შეკვეთის წაშლა"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>წაშლა</span>
                          </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminOrdersPage
