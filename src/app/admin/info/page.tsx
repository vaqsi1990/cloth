'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Info, Check } from 'lucide-react'
import Image from 'next/image'

interface DeliveryUser {
  id: number // Unique ID for React keys and selection
  orderId: number // Order ID to display
  customerName: string
  email?: string
  phone: string
  userAddress: string
  objectAddress: string
  pickupAddress: string // Seller's pickup address from User model
  date: string
  isRental: boolean
  isPurchase: boolean
  userImage?: string
}

const formatDateShort = (date: Date | string) => {
  if (!date) return ''
  const d = new Date(date)
  
  const months = [
    'იანვ.', 'თებ.', 'მარ.', 'აპრ.', 'მაი.', 'ივნ.',
    'ივლ.', 'აგვ.', 'სექტ.', 'ოქტ.', 'ნოემ.', 'დეკ.'
  ]
  
  const day = d.getDate()
  const month = months[d.getMonth()]
  const year = d.getFullYear()
  
  return `${day} ${month} ${year}`
}

const AdminInfoPage = () => {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [deliveryUsers, setDeliveryUsers] = useState<DeliveryUser[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | 'RENTAL' | 'PURCHASE'>('ALL')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  useEffect(() => {
    const fetchDeliveryUsers = async () => {
      if (status === 'authenticated' && session?.user?.role === 'ADMIN') {
        try {
          setLoading(true)
          const response = await fetch('/api/admin/orders')
          const data = await response.json()
          
          console.log('Debug - Raw API response:', data)
          console.log('Debug - Orders count:', data.orders?.length)
          
          // Log first order structure to understand data shape
          if (data.success && data.orders && data.orders.length > 0) {
            console.log('=== FIRST ORDER STRUCTURE ===')
            console.log('First order:', JSON.stringify(data.orders[0], null, 2))
            if (data.orders[0].items && data.orders[0].items.length > 0) {
              console.log('First item:', JSON.stringify(data.orders[0].items[0], null, 2))
              if (data.orders[0].items[0].product) {
                console.log('First product:', JSON.stringify(data.orders[0].items[0].product, null, 2))
              }
            }
            console.log('===========================\n')
          }
          
          if (data.success && data.orders) {
            // Extract seller information from ALL orders first
            const sellersMap = new Map()
            let totalItems = 0
            let itemsWithProducts = 0
            let productsWithUsers = 0
            
            console.log('=== DEBUGGING SELLER EXTRACTION ===')
            console.log('Total orders:', data.orders.length)
            
            data.orders.forEach((order: any, orderIndex: number) => {
              console.log(`\nOrder ${orderIndex + 1} (ID: ${order.id}):`)
              console.log('  - Has items?', !!order.items)
              console.log('  - Items count:', order.items?.length || 0)
              
              if (order.items && order.items.length > 0) {
                order.items.forEach((item: any, itemIndex: number) => {
                  totalItems++
                  console.log(`  Item ${itemIndex + 1}:`)
                  console.log('    - Has product?', !!item.product)
                  console.log('    - Product ID:', item.product?.id)
                  console.log('    - Product name:', item.product?.name)
                  console.log('    - Has product.user?', !!item.product?.user)
                  console.log('    - Seller:', item.product?.user)
                  
                  if (item.product) {
                    itemsWithProducts++
                    if (item.product.user) {
                      productsWithUsers++
                    }
                  }
                  
                  const seller = item.product?.user
                  console.log('    - Seller object:', seller)
                  console.log('    - Seller type:', typeof seller)
                  console.log('    - Seller is null?', seller === null)
                  console.log('    - Seller is undefined?', seller === undefined)
                  console.log('    - Seller.id exists?', !!seller?.id)
                  
                  if (seller && seller.id) {
                    console.log(`    ✓ Found seller: ${seller.name} (ID: ${seller.id})`)
                    if (!sellersMap.has(seller.id)) {
                      sellersMap.set(seller.id, {
                        id: seller.id,
                        name: seller.name || 'უცნობი',
                        email: seller.email || null,
                        phone: seller.phone || null,
                        pickupAddress: seller.pickupAddress || 'არ არის მითითებული',
                        address: seller.address || null,
                        orders: [order.id],
                        products: [{
                          productId: item.product?.id,
                          productName: item.product?.name,
                          orderId: order.id
                        }]
                      })
                    } else {
                      // Add order and product to existing seller
                      const existingSeller = sellersMap.get(seller.id)
                      if (!existingSeller.orders.includes(order.id)) {
                        existingSeller.orders.push(order.id)
                      }
                      existingSeller.products.push({
                        productId: item.product?.id,
                        productName: item.product?.name,
                        orderId: order.id
                      })
                    }
                  } else {
                    console.log('    ✗ No seller found for this item')
                    if (!item.product) {
                      console.log('      Reason: No product in item')
                    } else if (!item.product.user) {
                      console.log('      Reason: Product exists but has no user')
                      console.log('      Product userId might be null in database')
                    } else if (!seller?.id) {
                      console.log('      Reason: Seller exists but has no id')
                    }
                  }
                })
              } else {
                console.log('  - No items in this order')
              }
            })
            
            const sellers = Array.from(sellersMap.values())
            console.log('\n=== SELLER EXTRACTION RESULTS ===')
            console.log('Total items processed:', totalItems)
            console.log('Items with products:', itemsWithProducts)
            console.log('Products with users:', productsWithUsers)
            console.log('Unique sellers found:', sellers.length)
            console.log('Sellers Information:', sellers)
            console.log('===================================\n')
            
            // Filter orders that:
            // 1. Use delivery service (have deliveryCityId), OR
            // 2. Have purchase items (products that were bought, not rented)
            const relevantOrders = data.orders.filter((order: any) => {
              const hasPurchase = order.items.some((item: any) => !item.isRental)
              return order.deliveryCityId || hasPurchase
            })
            
            // Transform orders into delivery users - show each order as a row
            const users: DeliveryUser[] = []
            
            relevantOrders.forEach((order: any) => {
              const hasRental = order.items.some((item: any) => item.isRental)
              const hasPurchase = order.items.some((item: any) => !item.isRental)
              
              // Find product author's (seller's) pickup address from order items
              // Get pickupAddress from product.user (product author/seller) - from User model pickupAddress field
              // Collect all unique seller pickup addresses
              const sellerPickupAddresses = order.items
                .map((item: any) => item.product?.user?.pickupAddress)
                .filter((address: string | undefined): address is string => 
                  address !== null && address !== undefined && address.trim() !== ''
                )
              
              // Get the first valid pickup address (or combine if multiple sellers)
              const sellerPickupAddress = sellerPickupAddresses.length > 0 
                ? (sellerPickupAddresses.length === 1 
                    ? sellerPickupAddresses[0] 
                    : sellerPickupAddresses.join(', ')) // If multiple sellers, join addresses
                : ''
              
              // Object address: prioritize pickupAddress if exists, otherwise use deliveryCity name
              const objectAddress = sellerPickupAddress 
                ? sellerPickupAddress
                : (order.deliveryCity?.name || '')
              
              // Create entry for rental if order has rental items and uses delivery service
              if (hasRental && order.deliveryCityId) {
                users.push({
                  id: order.id * 10 + 1, // Unique ID for rental entries
                  orderId: order.id,
                  customerName: order.customerName || order.user?.name || 'უცნობი',
                  email: order.email || order.user?.email,
                  phone: order.phone,
                  userAddress: order.address || '',
                  objectAddress: objectAddress,
                  pickupAddress: sellerPickupAddress,
                  date: order.createdAt,
                  isRental: true,
                  isPurchase: false,
                  userImage: order.user?.image || undefined,
                })
              }
              
              // Create entry for purchase if order has purchase items
              if (hasPurchase) {
                users.push({
                  id: order.id * 10 + 2, // Unique ID for purchase entries
                  orderId: order.id,
                  customerName: order.customerName || order.user?.name || 'უცნობი',
                  email: order.email || order.user?.email,
                  phone: order.phone,
                  userAddress: order.address || '',
                  objectAddress: objectAddress,
                  pickupAddress: sellerPickupAddress,
                  date: order.createdAt,
                  isRental: false,
                  isPurchase: true,
                  userImage: order.user?.image || undefined,
                })
              }
            })
            
            setDeliveryUsers(users)
          }
        } catch (error) {
          console.error('Error fetching delivery users:', error)
        } finally {
          setLoading(false)
        }
      }
    }
    
    fetchDeliveryUsers()
  }, [status, session?.user?.role])

  const toggleSelection = (id: number) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const toggleSelectAll = () => {
    const filtered = getFilteredUsers()
    if (selectedIds.size === filtered.length && filtered.every(u => selectedIds.has(u.id))) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map(u => u.id)))
    }
  }
  const getFilteredUsers = () => {
    if (filter === 'RENTAL') {
      return deliveryUsers.filter(u => u.isRental)
    } else if (filter === 'PURCHASE') {
      return deliveryUsers.filter(u => u.isPurchase)
    }
    return deliveryUsers
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
          <h1 className="text-2xl font-bold text-gray-900 mb-4">წვდომა აკრძალულია</h1>
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

  const filteredUsers = getFilteredUsers()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex items-center space-x-2 text-black hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-7 h-7 font-bold" />
              <span className="text-base sm:text-lg md:text-[20px] font-bold text-black">უკან დაბრუნება</span>
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Info Header */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <Info className="w-5 h-5 text-gray-600" />
            </div>
            <h2 className="md:text-[20px] text-[18px] font-bold text-black">
              მიტანის სერვისით სარგებლობს {filteredUsers.length} მომხმარებელი
            </h2>
          </div>

          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                filter === 'ALL'
                  ? 'bg-[#228460] text-white'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              ყველა
            </button>
            <button
              onClick={() => setFilter('RENTAL')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                filter === 'RENTAL'
                  ? 'bg-[#228460] text-white'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              გაქირავება
            </button>
            <button
              onClick={() => setFilter('PURCHASE')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                filter === 'PURCHASE'
                  ? 'bg-[#228460] text-white'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              ყიდვა
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-green-50">
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={toggleSelectAll}
                      className="w-5 h-5 border-2 border-gray-400 rounded flex items-center justify-center hover:border-green-600 transition-colors"
                    >
                      {filteredUsers.length > 0 && filteredUsers.every(u => selectedIds.has(u.id)) && (
                        <Check className="w-4 h-4 text-green-600" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-black">სახელი და გვარი</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-black">ID</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-black">თარიღი</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-black">მომხმარებლის მის.</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-black">ობიექტის მის.</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      არ არის მონაცემები
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleSelection(user.id)}
                          className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-colors ${
                            selectedIds.has(user.id)
                              ? 'bg-green-600 border-green-600'
                              : 'border-gray-400 hover:border-green-600'
                          }`}
                        >
                          {selectedIds.has(user.id) && (
                            <Check className="w-4 h-4 text-white" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                            {user.userImage ? (
                              <Image
                                src={user.userImage}
                                alt={user.customerName}
                                width={32}
                                height={32}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                                <span className="text-xs text-gray-600">
                                  {user.customerName.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                          <span className="text-sm text-black">{user.customerName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-black">{user.orderId}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-black">{formatDateShort(user.date)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-black">{user.userAddress}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-black">{user.pickupAddress}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminInfoPage
