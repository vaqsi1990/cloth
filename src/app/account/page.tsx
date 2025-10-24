'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { User, Package, ShoppingCart, Settings, LogOut, Edit3, MapPin, Phone, Mail, Upload, Camera, MessageCircle } from 'lucide-react'
import ImageUpload from '@/component/CloudinaryUploader'
import ContactForm from '@/component/ContactForm'

interface Order {
  id: number
  total: number
  status: string
  createdAt: string
}

interface Product {
  id: number
  name: string
  currentPrice: number
  createdAt: string
}

const AccountPage = () => {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('profile')
  const [userStats, setUserStats] = useState({
    ordersCount: 0,
    totalSpent: 0,
    productsCount: 0
  })
  const [loading, setLoading] = useState(false)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [profileImage, setProfileImage] = useState<string | null>(session?.user?.image || null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user?.id) {
      fetchUserStats()
    }
  }, [session])

  useEffect(() => {
    if (session?.user?.image) {
      setProfileImage(session.user.image)
    }
  }, [session?.user?.image])

  const fetchUserStats = async () => {
    try {
      setLoading(true)
      
      // Fetch user orders
      const ordersResponse = await fetch('/api/user/orders')
      const ordersData = await ordersResponse.json()
      const ordersCount = ordersData.success ? ordersData.orders.length : 0
      const totalSpent = ordersData.success 
        ? ordersData.orders.reduce((sum: number, order: Order) => sum + order.total, 0)
        : 0

      // Fetch user products
      const productsResponse = await fetch('/api/user/products')
      const productsData = await productsResponse.json()
      const productsCount = productsData.success ? productsData.products.length : 0

      setUserStats({
        ordersCount,
        totalSpent,
        productsCount
      })
    } catch (error) {
      console.error('Error fetching user stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (urls: string[]) => {
    if (urls.length === 0) return
    
    setIsUploadingImage(true)
    try {
      console.log('Uploading image:', urls[0])
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          name: session?.user?.name || '',
          email: session?.user?.email || '',
          image: urls[0] || null
        }),
      })

      const result = await response.json()
      console.log('Profile update response:', result)

      if (response.ok && result.success) {
        setProfileImage(urls[0])
        
        // Update the session with new image
        await update({
          image: urls[0],
          name: session?.user?.name || '',
          email: session?.user?.email || ''
        })
        
        alert('პროფილის სურათი წარმატებით განახლდა!')
        setIsEditingProfile(false)
      } else {
        console.error('Profile update failed:', result)
        alert(`შეცდომა სურათის ატვირთვისას: ${result.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      alert('შეცდომა სურათის ატვირთვისას')
    } finally {
      setIsUploadingImage(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const tabs = [
    { id: 'profile', label: 'პროფილი', icon: User },
    { id: 'orders', label: 'შეკვეთები', icon: ShoppingCart },
    { id: 'Contact', label: 'კონტაქტი', icon: MessageCircle },
    { id: 'products', label: 'ჩემი პროდუქტები', icon: Package },
    { id: 'settings', label: 'პარამეტრები', icon: Settings },
  ]

  const mockOrders = [
    {
      id: 'ORD-001',
      date: '2024-01-15',
      status: 'მიღებული',
      total: 45,
      items: [
        { name: 'შავი ელეგანტური კაბა', size: 'S', price: 45 }
      ]
    },
    {
      id: 'ORD-002',
      date: '2024-01-10',
      status: 'მიწოდება',
      total: 69,
      items: [
        { name: 'თეთრი მინიმალისტური კაბა', size: 'M', price: 69 }
      ]
    }
  ]

  const mockProducts = [
    {
      id: 1,
      name: 'შავი ელეგანტური კაბა',
      price: 45,
      status: 'აქტიური',
      image: '/hero/1.jpg',
      createdAt: '2024-01-15'
    },
    {
      id: 2,
      name: 'ოქროსფერი საღამოს კაბა',
      price: 36,
      status: 'აქტიური',
      image: '/hero/2.jpg',
      createdAt: '2024-01-10'
    }
  ]

  const renderProfileTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center space-x-4 mb-6">
          <div className="relative">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-8 h-8 text-black" />
              )}
            </div>
            <button
              onClick={() => setIsEditingProfile(!isEditingProfile)}
              className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors"
            >
              <Camera className="w-3 h-3" />
            </button>
          </div>
          <div>
            <h3 className="text-xl font-bold text-black">{session.user.name}</h3>
            <p className="text-black">{session.user.email}</p>
            <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
              {session.user.role === 'ADMIN' ? 'ადმინისტრატორი' : 'მომხმარებელი'}
            </span>
          </div>
        </div>

        {isEditingProfile && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-lg font-semibold text-black mb-3">პროფილის სურათის ატვირთვა</h4>
            <ImageUpload
              value={profileImage ? [profileImage] : []}
              onChange={handleImageUpload}
            />
            {isUploadingImage && (
              <p className="text-sm text-gray-600 mt-2">სურათი იტვირთება...</p>
            )}
            <div className="mt-3 flex space-x-2">
              <button
                onClick={() => setIsEditingProfile(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                გაუქმება
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Mail className="w-5 h-5 text-black" />
              <div>
                <p className="text-sm text-black">ელფოსტა</p>
                <p className="font-medium">{session.user.email}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <User className="w-5 h-5 text-black" />
              <div>
                <p className="text-sm text-black">სახელი</p>
                <p className="font-medium">{session.user.name}</p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Phone className="w-5 h-5 text-black" />
              <div>
                <p className="text-sm text-black">ტელეფონი</p>
                <p className="font-medium">+995 555 123 456</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <MapPin className="w-5 h-5 text-black" />
              <div>
                <p className="text-sm text-black">მისამართი</p>
                <p className="font-medium">თბილისი, საქართველო</p>
              </div>
            </div>
          </div>
        </div>

        
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h4 className="text-lg font-bold text-black mb-4">ანგარიშის სტატისტიკა</h4>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="text-center">
                <div className="w-8 h-8 bg-gray-200 rounded animate-pulse mx-auto mb-2"></div>
                <div className="w-16 h-4 bg-gray-200 rounded animate-pulse mx-auto"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-black">{userStats.ordersCount}</div>
              <div className="text-sm text-black">შეკვეთა</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-black">₾{userStats.totalSpent.toFixed(2)}</div>
              <div className="text-sm text-black">მთლიანი ღირებულება</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-black">{userStats.productsCount}</div>
              <div className="text-sm text-black">პროდუქტი</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  const renderOrdersTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-black mb-6">შეკვეთების ისტორია</h3>
        
        {mockOrders.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingCart className="w-12 h-12 text-black mx-auto mb-4" />
            <p className="text-black">ჯერ არ გაქვთ შეკვეთები</p>
            <Link
              href="/shop"
              className="inline-block mt-4 px-6 py-2 bg-[#1B3729] text-white rounded-lg font-bold uppercase tracking-wide  transition-colors"
            >
              შეკვეთის დაწყება
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {mockOrders.map((order) => (
              <div key={order.id} className="border border-black rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-black">შეკვეთა #{order.id}</h4>
                    <p className="text-sm text-black">{order.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-black">₾{order.total}</p>
                    <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                      order.status === 'მიღებული' ? 'bg-green-100 text-green-800' :
                      order.status === 'მიწოდება' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-black'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="text-black">{item.name} ({item.size})</span>
                      <span className="font-medium">₾{item.price}</span>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 pt-4 border-t border-black">
                  <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                    დეტალების ნახვა
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  const renderProductsTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-black">ჩემი პროდუქტები</h3>
          <Link
            href="/admin/products/new"
            className="flex items-center space-x-2 px-4 py-2 bg-[#1B3729] text-white rounded-lg font-bold uppercase tracking-wide  transition-colors"
          >
            <Package className="w-4 h-4" />
            <span>ახალი პროდუქტი</span>
          </Link>
        </div>
        
        {mockProducts.length === 0 ? (
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-black mx-auto mb-4" />
            <p className="text-black">ჯერ არ გაქვთ პროდუქტები</p>
            <Link
              href="/admin/products/new"
              className="inline-block mt-4 px-6 py-2 bg-[#1B3729] text-white rounded-lg font-bold uppercase tracking-wide  transition-colors"
            >
              პირველი პროდუქტის დამატება
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockProducts.map((product) => (
              <div key={product.id} className="border border-black rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                <div className="aspect-[3/4] bg-gray-200 relative">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      product.status === 'აქტიური' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {product.status}
                    </span>
                  </div>
                </div>
                
                <div className="p-4">
                      <h4 className="font-semibold text-black mb-2">{product.name}</h4>
                  <p className="text-lg font-bold text-black mb-2">₾{product.price}</p>
                  <p className="text-sm text-black">დამატებული: {product.createdAt}</p>
                  
                  <div className="mt-4 flex space-x-2">
                    <button className="flex-1 px-3 py-2 bg-black text-white rounded-lg hover:bg-gray-200 transition-colors text-sm">
                      რედაქტირება
                    </button>
                    <button className="flex-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm">
                      წაშლა
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  const renderSettingsTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-black mb-6">პარამეტრები</h3>
        
        <div className="space-y-6">
          <div>
            <h4 className="font-semibold text-black mb-3">პაროლის შეცვლა</h4>
            <div className="space-y-3">
              <input
                type="password"
                placeholder="მიმდინარე პაროლი"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              />
              <input
                type="password"
                placeholder="ახალი პაროლი"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              />
              <input
                type="password"
                placeholder="ახალი პაროლის დადასტურება"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              />
              <button className="px-6 py-2 bg-[#1B3729] text-white rounded-lg font-bold uppercase tracking-wide  transition-colors">
                პაროლის შეცვლა
              </button>
            </div>
          </div>
          
          <div className="pt-6 border-t border-gray-100">
            <h4 className="font-semibold text-gray-900 mb-3">ანგარიშის წაშლა</h4>
            <p className="text-sm text-gray-600 mb-4">
              ეს მოქმედება შეუქცევადია. თქვენი ყველა მონაცემი და შეკვეთა წაიშლება.
            </p>
            <button className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
              ანგარიშის წაშლა
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return renderProfileTab()
      case 'orders':
        return renderOrdersTab()
      case 'Contact':
        return (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-2xl font-bold text-black mb-6">კონტაქტი</h2>
            <ContactForm />
          </div>
        )
      case 'products':
        return renderProductsTab()
      case 'settings':
        return renderSettingsTab()
      default:
        return renderProfileTab()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-black">ჩემი ანგარიში</h1>
              <p className="text-black mt-1">მოგესალმებით, {session.user.name}</p>
            </div>
            <Link
              href="/"
              className="px-4 py-2 bg-[#1B3729] md:text-[20px] text-[18px] font-bold uppercase tracking-widest text-white rounded-lg font-bold uppercase tracking-wide  transition-colors"
            >
              მთავარ გვერდზე დაბრუნება
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-black">
              <nav className="space-y-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full cursor-pointer flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-[#1B3729] text-white'
                        : 'text-black '
                    }`}
                  >
                    <tab.icon className="w-5 h-5" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AccountPage
