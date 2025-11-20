'use client'

import React, { useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { Search, ArrowLeft, Package, Calendar, User, Clock, DollarSign, AlertCircle } from 'lucide-react'
import { formatDate } from '@/utils/dateUtils'
import { Product, ProductVariant } from '@/types/product'

interface RentalUser {
  id: string
  name?: string
  email?: string
  phone?: string
}

interface RentalVariant {
  id: number
  size: string
}

interface Rental {
  id: number
  status: string
  startDate: string
  endDate: string
  durationDays: number
  totalPrice: number
  user?: RentalUser
  variant?: RentalVariant
}

interface RentalOrder {
  id: number
  orderId: number
  orderStatus: string
  customerName: string
  customerPhone?: string
  customerEmail?: string
  user?: RentalUser
  size?: string
  startDate: string
  endDate: string
  durationDays: number
  price: number
  orderCreatedAt: string
}

interface ProductData {
  product: Product & {
    updatedAt: string
    user?: {
      id: string
      name?: string
      email?: string
      phone?: string
    }
  }
  rentals: {
    all: Rental[]
    active: Rental[]
    total: number
    activeCount: number
  }
  rentalOrders: RentalOrder[]
}

const AdminProductBySKUPage = () => {
  const { data: session, status } = useSession()
  const [sku, setSku] = useState('')
  const [loading, setLoading] = useState(false)
  const [productData, setProductData] = useState<ProductData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sku.trim()) return

    setLoading(true)
    setError(null)
    setProductData(null)

    try {
      const response = await fetch(`/api/products/sku/${encodeURIComponent(sku.trim())}`)
      const data = await response.json()

      if (data.success) {
        setProductData(data)
      } else {
        setError(data.message || 'პროდუქტი ვერ მოიძებნა')
      }
    } catch (err) {
      console.error('Error fetching product:', err)
      setError('შეცდომა პროდუქტის ძიებისას')
    } finally {
      setLoading(false)
    }
  }

  const getStatusLabel = (status?: string) => {
    const statusMap: { [key: string]: { label: string; color: string; bgColor: string } } = {
      'AVAILABLE': { label: 'თავისუფალია', color: 'text-green-700', bgColor: 'bg-green-100' },
      'RENTED': { label: 'გაქირავებულია', color: 'text-orange-700', bgColor: 'bg-orange-100' },
      'RESERVED': { label: 'დაჯავშნილია', color: 'text-blue-700', bgColor: 'bg-blue-100' },
      'MAINTENANCE': { label: 'რესტავრაციაზე', color: 'text-red-700', bgColor: 'bg-red-100' }
    }
    return statusMap[status || ''] || statusMap['AVAILABLE']
  }

  const getRentalStatusLabel = (status: string) => {
    const statusMap: { [key: string]: { label: string; color: string; bgColor: string } } = {
      'ACTIVE': { label: 'აქტიური', color: 'text-green-700', bgColor: 'bg-green-100' },
      'RESERVED': { label: 'დაჯავშნილი', color: 'text-blue-700', bgColor: 'bg-blue-100' },
      'RETURNED': { label: 'დაბრუნებული', color: 'text-black', bgColor: 'bg-gray-100' },
      'LATE': { label: 'გადაცდენილი', color: 'text-red-700', bgColor: 'bg-red-100' },
      'CANCELED': { label: 'გაუქმებული', color: 'text-black', bgColor: 'bg-gray-100' }
    }
    return statusMap[status] || { label: status, color: 'text-black', bgColor: 'bg-gray-100' }
  }

  if (status === 'loading') {
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
          <Link href="/" className="px-6 py-2 bg-[#1B3729] text-white rounded-lg font-bold uppercase tracking-wide transition-colors">
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
            <div>
              <h1 className="text-3xl font-bold text-gray-900">პროდუქტის ძიება კოდის მიხედვით</h1>
              <p className="text-black mt-1">მოძებნე პროდუქტი და ნახე დეტალური ინფორმაცია</p>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/admin/products"
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-black rounded-lg hover:bg-gray-200 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>უკან</span>
              </Link>
              <Link
                href="/admin"
                className="px-4 py-2 bg-[#1B3729] text-white rounded-lg font-bold uppercase tracking-wide transition-colors"
              >
                ადმინ პანელი
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Search Form */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
          <form onSubmit={handleSearch} className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="შეიყვანე კოდი (მაგ. 1234567890123456)"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !sku.trim()}
              className="px-6 py-3 bg-[#1B3729] text-white rounded-lg font-bold uppercase tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'ძიება...' : 'ძიება'}
            </button>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8 flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Product Details */}
        {productData && productData.product && (
          <div className="space-y-6">
            {/* Product Info Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-start space-x-6">
                {/* Product Image */}
                <div className="w-48 h-64 bg-gray-200 rounded-lg relative flex-shrink-0">
                  {productData.product.images && productData.product.images.length > 0 ? (
                    <Image
                      src={productData.product.images[0].url}
                      alt={productData.product.name}
                      fill
                      className="object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Product Details */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">{productData.product.name}</h2>
                      <div className="mb-2">
                        <span className="text-sm font-mono text-black bg-gray-100 px-3 py-1 rounded">
                          კოდი: {productData.product.sku}
                        </span>
                      </div>
                      {productData.product.description && (
                        <p className="text-black mb-4">{productData.product.description}</p>
                      )}
                    </div>
                    <div className={`px-4 py-2 rounded-lg ${getStatusLabel(productData.product.status).bgColor}`}>
                      <span className={`font-semibold ${getStatusLabel(productData.product.status).color}`}>
                        {getStatusLabel(productData.product.status).label}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">კატეგორია</p>
                      <p className="font-semibold">{productData.product.category?.name || 'არ არის'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">გენდერი</p>
                      <p className="font-semibold">{productData.product.gender}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">ფერი</p>
                      <p className="font-semibold">{productData.product.color || 'არ არის'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">მფლობელი</p>
                      <p className="font-semibold">{productData.product.user?.name || 'არ არის'}</p>
                    </div>
                  </div>

                  {productData.product.variants && productData.product.variants.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-semibold text-black mb-2">ზომები და ფასები:</p>
                      <div className="flex flex-wrap gap-2">
                        {productData.product.variants.map((variant: ProductVariant) => (
                          <div key={variant.id} className="bg-gray-50 px-3 py-2 rounded border">
                            <span className="font-semibold">{variant.size}</span> - ₾{variant.price} 
                            {variant.stock > 0 && <span className="text-green-600 ml-2">({variant.stock} ცალი)</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Maintenance Information */}
            {productData.product.status === 'MAINTENANCE' && (
              <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-xl font-bold text-red-900 mb-4 flex items-center">
                
                  რესტავრაციის ინფორმაცია
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-lg border border-red-200">
                    <p className="text-sm text-black mb-1">რესტავრაციაზე გადასვლის თარიღი</p>
                    <p className="font-semibold text-gray-900">{formatDate(productData.product.updatedAt)}</p>
                  </div>
                 
                </div>
                <div className="mt-4 bg-white p-4 rounded-lg border border-red-200">
                  <p className="text-sm text-black mb-2">შენიშვნა:</p>
                  <p className="text-gray-800">
                    ეს პროდუქტი ამჟამად რესტავრაციაზეა . 
                    პროდუქტი არ არის ხელმისაწვდომი გაქირავებისთვის ან გაყიდვისთვის სანამ 
                    სტატუსი არ განახლდება &quot;თავისუფალია&quot;.
                  </p>
                </div>
              </div>
            )}

            {/* Rental Statistics */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                გაქირავების სტატისტიკა
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-black">სულ გაქირავებები</p>
                  <p className="text-2xl font-bold text-blue-700">{productData.rentals.total}</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <p className="text-sm text-black">აქტიური გაქირავებები</p>
                  <p className="text-2xl font-bold text-orange-700">{productData.rentals.activeCount}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-black">დასრულებული</p>
                  <p className="text-2xl font-bold text-green-700">
                    {productData.rentals.total - productData.rentals.activeCount}
                  </p>
                </div>
              </div>
            </div>

            {/* Active Rentals */}
            {productData.rentals.active && productData.rentals.active.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  აქტიური გაქირავებები
                </h3>
                <div className="space-y-4">
                  {productData.rentals.active.map((rental: Rental) => (
                    <div key={rental.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className={`px-3 py-1 rounded ${getRentalStatusLabel(rental.status).bgColor}`}>
                              <span className={`text-sm font-semibold ${getRentalStatusLabel(rental.status).color}`}>
                                {getRentalStatusLabel(rental.status).label}
                              </span>
                            </div>
                            {rental.variant && (
                              <span className="text-sm text-black">ზომა: {rental.variant.size}</span>
                            )}
                          </div>
                          {rental.user && (
                            <div className="flex items-center space-x-2 mb-2">
                              <User className="w-4 h-4 text-gray-400" />
                              <span className="font-semibold">{rental.user.name || 'არ არის'}</span>
                              {rental.user.email && (
                                <span className="text-sm text-black">({rental.user.email})</span>
                              )}
                              {rental.user.phone && (
                                <span className="text-sm text-black">- {rental.user.phone}</span>
                              )}
                            </div>
                          )}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500">დაწყების თარიღი</p>
                              <p className="font-semibold">{formatDate(rental.startDate)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">დასრულების თარიღი</p>
                              <p className="font-semibold">{formatDate(rental.endDate)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">ხანგრძლივობა</p>
                              <p className="font-semibold">{rental.durationDays} დღე</p>
                            </div>
                            <div>
                              <p className="text-gray-500">ფასი</p>
                              <p className="font-semibold flex items-center">
                                <DollarSign className="w-4 h-4 mr-1" />
                                ₾{rental.totalPrice}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All Rentals History */}
            {productData.rentals.all && productData.rentals.all.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-4">გაქირავების ისტორია</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-4">მომხმარებელი</th>
                        <th className="text-left py-2 px-4">ზომა</th>
                        <th className="text-left py-2 px-4">დაწყება</th>
                        <th className="text-left py-2 px-4">დასრულება</th>
                        <th className="text-left py-2 px-4">ხანგრძლივობა</th>
                        <th className="text-left py-2 px-4">სტატუსი</th>
                        <th className="text-left py-2 px-4">ფასი</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productData.rentals.all.map((rental: Rental) => (
                        <tr key={rental.id} className="border-b hover:bg-gray-50">
                          <td className="py-2 px-4">
                            {rental.user ? (
                              <div>
                                <p className="font-semibold">{rental.user.name || 'არ არის'}</p>
                                {rental.user.email && (
                                  <p className="text-sm text-black">{rental.user.email}</p>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400">არ არის</span>
                            )}
                          </td>
                          <td className="py-2 px-4">{rental.variant?.size || 'არ არის'}</td>
                          <td className="py-2 px-4">{formatDate(rental.startDate)}</td>
                          <td className="py-2 px-4">{formatDate(rental.endDate)}</td>
                          <td className="py-2 px-4">{rental.durationDays} დღე</td>
                          <td className="py-2 px-4">
                            <span className={`px-2 py-1 rounded text-xs ${getRentalStatusLabel(rental.status).bgColor} ${getRentalStatusLabel(rental.status).color}`}>
                              {getRentalStatusLabel(rental.status).label}
                            </span>
                          </td>
                          <td className="py-2 px-4 font-semibold">₾{rental.totalPrice}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Rental Orders */}
            {productData.rentalOrders && productData.rentalOrders.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-4">გაქირავების შეკვეთები</h3>
                <div className="space-y-4">
                  {productData.rentalOrders.map((order: RentalOrder) => (
                    <div key={order.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold">შეკვეთა #{order.orderId}</p>
                          <p className="text-sm text-black">სტატუსი: {order.orderStatus}</p>
                        </div>
                        <span className="text-sm text-gray-500">{formatDate(order.orderCreatedAt)}</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">მომხმარებელი</p>
                          <p className="font-semibold">{order.customerName}</p>
                          {order.customerPhone && <p className="text-black">{order.customerPhone}</p>}
                        </div>
                        <div>
                          <p className="text-gray-500">ზომა</p>
                          <p className="font-semibold">{order.size || 'არ არის'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">პერიოდი</p>
                          <p className="font-semibold">
                            {formatDate(order.startDate)} - {formatDate(order.endDate)}
                          </p>
                          <p className="text-black">{order.durationDays} დღე</p>
                        </div>
                        <div>
                          <p className="text-gray-500">ფასი</p>
                          <p className="font-semibold">₾{order.price}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {productData.rentals.total === 0 && (!productData.rentalOrders || productData.rentalOrders.length === 0) && (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-black">ეს პროდუქტი არასოდეს გაქირავებულა</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminProductBySKUPage

