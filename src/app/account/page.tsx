'use client'

import React, { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { User, Package, ShoppingCart, Settings, MapPin, Phone, Mail, Camera, MessageCircle, Search, Trash2 } from 'lucide-react'
import ImageUpload from '@/component/CloudinaryUploader'
import ContactForm from '@/component/ContactForm'

interface Order {
  id: number
  total: number
  status: string
  createdAt: string
  items?: Array<{ productName: string; size: string; price: number }>
}

interface ProductItem {
  id: number
  name: string
  status: string
  createdAt: string
  sku?: string | null
  images?: Array<{ url: string }>
  variants?: Array<{ price: number; size: string; stock: number; id: number }>
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
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<ProductItem[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [verification, setVerification] = useState<{
    id?: number;
    idFrontUrl?: string | null;
    idBackUrl?: string | null;
    status?: 'PENDING' | 'APPROVED' | 'REJECTED';
    comment?: string | null;
  } | null>(null)
  const [verifLoading, setVerifLoading] = useState(false)
  const [savingVerification, setSavingVerification] = useState(false)
  
  // Load uploaded images from localStorage on mount
  const [idFrontUrl, setIdFrontUrl] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('idFrontUrl') || null
    }
    return null
  })
  const [idBackUrl, setIdBackUrl] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('idBackUrl') || null
    }
    return null
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    }
  }, [status, router])

  // Fetch user stats only once when session is available
  useEffect(() => {
    if (session?.user?.id) {
      fetchUserStats()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id])

  // Update profile image when session changes
  useEffect(() => {
    if (session?.user?.image && session.user.image !== profileImage) {
      setProfileImage(session.user.image)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.image])

  // Fetch orders only when tab changes to orders
  useEffect(() => {
    if (activeTab === 'orders' && session?.user?.id) {
      fetchOrders()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // Fetch products only when tab changes to products
  useEffect(() => {
    if (activeTab === 'products' && session?.user?.id) {
      fetchProducts()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // Fetch verification only when tab changes to profile
  useEffect(() => {
    if (activeTab === 'profile' && session?.user?.id) {
      fetchVerification()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // Check ban status only once
  useEffect(() => {
    if (session?.user?.id) {
      fetch('/api/user/me').then(r => r.json()).then(d => {
        if (d?.user?.banned) {
          alert(d.user.banReason ? `თქვენი ანგარიში დაბლოკილია: ${d.user.banReason}` : 'თქვენი ანგარიში დაბლოკილია')
          router.push('/')
        }
      }).catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id])

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
          phone: (session?.user as { phone?: string })?.phone || '',
          location: (session?.user as { location?: string })?.location || '',
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
          email: session?.user?.email || '',
          phone: (session?.user as { phone?: string })?.phone || '',
          location: (session?.user as { location?: string })?.location || '',
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

  const fetchVerification = async () => {
    try {
      setVerifLoading(true)
      const res = await fetch('/api/user/verification')
      const data = await res.json()
      if (data.success) {
        setVerification(data.verification)
        // Only set from API if not already in localStorage (preserve user's uploaded images)
        if (typeof window !== 'undefined') {
          const savedFront = localStorage.getItem('idFrontUrl')
          const savedBack = localStorage.getItem('idBackUrl')
          setIdFrontUrl(savedFront || data.verification?.idFrontUrl || null)
          setIdBackUrl(savedBack || data.verification?.idBackUrl || null)
        } else {
          setIdFrontUrl(data.verification?.idFrontUrl || null)
          setIdBackUrl(data.verification?.idBackUrl || null)
        }
      }
    } catch (e) {
      console.error('Error fetching verification:', e)
    } finally {
      setVerifLoading(false)
    }
  }

  const handleIdFrontUpload = async (urls: string[]) => {
    if (!urls.length) return
    const url = urls[0]
    setIdFrontUrl(url)
    // Save to localStorage to persist across refreshes
    if (typeof window !== 'undefined') {
      localStorage.setItem('idFrontUrl', url)
    }
  }

  const handleIdBackUpload = async (urls: string[]) => {
    if (!urls.length) return
    const url = urls[0]
    setIdBackUrl(url)
    // Save to localStorage to persist across refreshes
    if (typeof window !== 'undefined') {
      localStorage.setItem('idBackUrl', url)
    }
  }

  const saveVerification = async () => {
    try {
      if (!idFrontUrl || !idBackUrl) {
        alert('გთხოვთ ატვირთოთ ორივე სურათი (წინა და უკან მხარე)')
        return
      }
      setSavingVerification(true)
      const res = await fetch('/api/user/verification', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idFrontUrl, idBackUrl })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setVerification(data.verification)
        alert('დოკუმენტები წარმატებით გაიგზავნა ვალიდაციაზე')
        setIdFrontUrl(null)
        setIdBackUrl(null)
        // Clear localStorage after successful save
        if (typeof window !== 'undefined') {
          localStorage.removeItem('idFrontUrl')
          localStorage.removeItem('idBackUrl')
        }
      } else {
        alert(data.error || 'შეცდომა გაგზავნისას')
      }
    } catch (e) {
      console.error('Error saving verification:', e)
      alert('შეცდომა ვერიფიკაციის შენახვისას')
    } finally {
      setSavingVerification(false)
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

  const fetchOrders = async () => {
    try {
      setLoadingOrders(true)
      const response = await fetch('/api/user/orders')
      const data = await response.json()
      if (data.success) {
        setOrders(data.orders || [])
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoadingOrders(false)
    }
  }

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true)
      const response = await fetch('/api/user/products')
      const data = await response.json()
      if (data.success) {
        setProducts(data.products || [])
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoadingProducts(false)
    }
  }

  const handleDeleteProduct = async (productId: number) => {
    if (!confirm('ნამდვილად გსურთ პროდუქტის წაშლა?')) {
      return
    }

    try {
      const response = await fetch(`/api/user/products?id=${productId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // Remove product from list
        setProducts(products.filter(p => p.id !== productId))
        // Update stats
        fetchUserStats()
        alert('პროდუქტი წარმატებით წაიშალა')
      } else {
        alert('შეცდომა პროდუქტის წაშლისას')
      }
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('შეცდომა პროდუქტის წაშლისას')
    }
  }

  const handleStatusChange = async (productId: number, newStatus: string) => {
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        // Update product status in the list
        setProducts(products.map(p => 
          p.id === productId ? { ...p, status: newStatus } : p
        ))
      } else {
        alert('შეცდომა სტატუსის შეცვლისას')
      }
    } catch (error) {
      console.error('Error updating status:', error)
        alert('შეცდომა სტატუსის შეცვლისას')
    }
  }

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      'AVAILABLE': 'თავისუფალია',
      'RENTED': 'გაქირავებულია',
      'RESERVED': 'დაჯავშნილია',
      'MAINTENANCE': 'რესტავრაციაზეა'
    }
    return statusMap[status] || status
  }

  const getVerificationStatusLabel = (
    status?: 'PENDING' | 'APPROVED' | 'REJECTED'
  ) => {
    const statusMap: Record<string, string> = {
      'PENDING': 'მოლოდინში',
      'APPROVED': 'დამტკიცებულია',
      'REJECTED': 'უარყოფილია'
    }
    if (!status) return statusMap['PENDING']
    return statusMap[status] || status
  }

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
                <p className="font-medium">{session.user.phone ?? '-'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <MapPin className="w-5 h-5 text-black" />
              <div>
                <p className="text-sm text-black">მისამართი</p>
                <p className="font-medium">{(session.user as { location?: string })?.location ?? '-'}</p>
              </div>
             
            </div>
            
          </div>
         
        </div>

        {/* Verification Section for non-admin users - only show if not approved */}
        {session.user.role !== 'ADMIN' && session.user.verificationStatus !== 'APPROVED' && (
          <div className="mt-8 p-4 border border-black rounded-lg bg-gray-50">
            <h4 className="text-lg font-semibold text-red mb-2">პირადობის ვერიფიკაცია </h4>
            <p className="text-[18px] text-red-500">პირადობის სურათებით მოხდება თქვენი ვერიფიცირება, თუ არ ატვირთავთ სურათებს ვერ შეძლებთ ახალი პროდუქტის დამატებას ან ყიდვას და ქირაობას</p>
            {verifLoading ? (
              <p className="text-sm text-gray-600">იტვირთება...</p>
            ) : (
              <>
                <div className="mb-3">
                  <span className={`inline-block px-3 py-1 text-sm rounded-full ${
                    ['APPROVED'].includes(verification?.status ?? '')
                      ? 'bg-green-100 text-green-800'
                      : ['REJECTED'].includes(verification?.status ?? '')
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    სტატუსი: {getVerificationStatusLabel(verification?.status)}
                  </span>
                </div>
                {verification?.status === 'REJECTED' && verification?.comment && (
                  <p className="text-sm text-red-700 mb-3">მიზეზი: {verification.comment}</p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-black mb-2">დოკუმენტის წინა მხარე</p>
                    <ImageUpload value={idFrontUrl ? [idFrontUrl] : []} onChange={handleIdFrontUpload} />
                  </div>
                  <div>
                    <p className="text-sm text-black mb-2">დოკუმენტის შიდა მხარე</p>
                    <ImageUpload value={idBackUrl ? [idBackUrl] : []} onChange={handleIdBackUpload} />
                  </div>
                </div>
                <div className="mt-4">
                  <button
                    onClick={saveVerification}
                    disabled={savingVerification}
                    className="px-4 py-2 bg-[#1B3729] text-white rounded-lg font-bold uppercase tracking-wide  transition-colors disabled:opacity-60"
                  >
                    {savingVerification ? 'გაგზავნა...' : 'დასტური გაგზავნაზე'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
        
      </div>
      {session.user.role !== 'ADMIN' && session.user.verificationStatus == 'APPROVED' && (
        <h1 className="text-green-500">პირადობა დამტკიცებულია</h1>
      )}
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
        
        {loadingOrders ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-gray-300 border-t-[#1B3729] rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">იტვირთება...</p>
          </div>
        ) : orders.length === 0 ? (
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
            {orders.map((order) => (
              <div key={order.id} className="border border-black rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-black">შეკვეთა #{order.id}</h4>
                    <p className="text-sm text-black">{new Date(order.createdAt).toLocaleDateString('ka-GE')}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-black">₾{order.total}</p>
                    <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                      order.status === 'PAID' ? 'bg-green-100 text-green-800' :
                      order.status === 'SHIPPED' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-black'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {order.items?.map((item: { productName: string; size: string; price: number }, index: number) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="text-black">{item.productName} ({item.size})</span>
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
          <div className="flex items-center space-x-3">
            <Link
              href="/account/products/sku"
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Search className="w-4 h-4" />
              <span>ძიება კოდის მიხედვით</span>
            </Link>
            {session.user.role === 'ADMIN' || verification?.status === 'APPROVED' || session.user.verificationStatus === 'APPROVED' ? (
              <Link
                href="/account/products/new"
                className="flex items-center space-x-2 px-4 py-2 bg-[#1B3729] text-white rounded-lg font-bold uppercase tracking-wide  transition-colors"
              >
                <Package className="w-4 h-4" />
                <span>ახალი პროდუქტი</span>
              </Link>
            ) : (
              <button
                disabled
                className="flex items-center space-x-2 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg font-bold uppercase tracking-wide cursor-not-allowed"
                title="ახალი პროდუქტის დამატება შესაძლებელია მხოლოდ ვერიფიცირებული ანგარიშისთვის"
              >
                <Package className="w-4 h-4" />
                <span>ახალი პროდუქტი</span>
              </button>
            )}
          </div>
        </div>
        {session.user.role !== 'ADMIN' && verification?.status !== 'APPROVED' && session.user.verificationStatus !== 'APPROVED' && (
          <div className="mb-4 p-3 border border-yellow-400 bg-yellow-50 text-yellow-800 rounded">
            გთხოვთ დაადასტუროთ პირადობა პროფილის გვერდზე, რომ შეძლოთ პროდუქტის დამატება.
          </div>
        )}

        {session.user.role !== 'ADMIN' && (verification?.status === 'APPROVED' || session.user.verificationStatus === 'APPROVED') && (
          <div className="mb-4 p-3 border border-green-400 bg-green-50 text-green-800 rounded">
            პირადობა დამტკიცებულია
          </div>
        )}
        
        {loadingProducts ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-gray-300 border-t-[#1B3729] rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">იტვირთება...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-black mx-auto mb-4" />
            <p className="text-black">ჯერ არ გაქვთ პროდუქტები</p>
            <Link
              href="/account/products/new"
              className="inline-block mt-4 px-6 py-2 bg-[#1B3729] text-white rounded-lg font-bold uppercase tracking-wide  transition-colors"
            >
              პირველი პროდუქტის დამატება
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <div key={product.id} className="border border-black rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                <div className="aspect-[3/4] bg-gray-200 relative">
                  <img
                    src={product.images?.[0]?.url || '/placeholder.jpg'}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      product.status === 'AVAILABLE' ? 'bg-green-100 text-green-800' :
                      product.status === 'RENTED' ? 'bg-blue-100 text-blue-800' :
                      product.status === 'RESERVED' ? 'bg-yellow-100 text-yellow-800' :
                      product.status === 'MAINTENANCE' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {getStatusLabel(product.status)}
                    </span>
                  </div>
                </div>
                
                <div className="p-4">
                      <h4 className="font-semibold text-black mb-2">{product.name}</h4>
                      {product.sku && (
                        <div className="mb-2">
                          <span className="text-xs font-mono px-2 py-1 rounded text-gray-700 bg-gray-100">
                            კოდი: {product.sku}
                          </span>
                        </div>
                      )}
                  <p className="text-lg font-bold text-black mb-2">
                    {(() => {
                      if (!product.variants || product.variants.length === 0) return '₾0.00'
                      
                      const variantPrices = product.variants as Array<{ price: number; size: string; stock: number; id: number }>
                      const prices = variantPrices
                        .filter((v: { price: number; size: string; stock: number; id: number }) => typeof v.price === 'number')
                        .map((v: { price: number }) => v.price)
                      
                      if (prices.length === 0) return '₾0.00'
                      
                      const minPrice = Math.min(...prices)
                      const maxPrice = Math.max(...prices)
                      
                      return minPrice === maxPrice 
                        ? `₾${minPrice.toFixed(2)}` 
                        : `₾${minPrice.toFixed(2)} - ₾${maxPrice.toFixed(2)}`
                    })()}
                  </p>
                  <p className="text-sm text-black mb-3">დამატებული: {new Date(product.createdAt).toLocaleDateString('ka-GE')}</p>
                  
                  <div className="mb-3">
                    <label className="block text-[16px] font-medium text-gray-700 mb-1">სტატუსი</label>
                    <select
                      value={product.status}
                      onChange={(e) => handleStatusChange(product.id, e.target.value)}
                      className="w-full px-2 py-1 text-[16px] border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black"
                    >
                      <option className="text-[16px]" value="AVAILABLE">თავისუფალია</option>
                      <option className="text-[16px]" value="RENTED">გაქირავებულია</option>
                      <option className="text-[16px]" value="RESERVED">დაჯავშნილია</option>
                      <option className="text-[16px]" value="MAINTENANCE">რესტავრაციაზეა</option>
                    </select>
                  </div>
                  
                  <div className="mt-4 flex space-x-2">
                    <Link
                      href={`/account/products/${product.id}/edit`}
                      className="flex-1 px-3 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-sm text-center"
                    >
                      რედაქტირება
                    </Link>
                    <button 
                      onClick={() => handleDeleteProduct(product.id)}
                      className="flex-1 cursor-pointer px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
                    >
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

  const handleDeleteProfile = async () => {
    const confirmMessage = 'ნამდვილად გსურთ თქვენი პროფილის გაუქმება?'
    
    if (!confirm(confirmMessage)) {
      return
    }

    // Double confirmation
    const secondConfirm = prompt('გთხოვთ დაწეროთ "წაშლა" დასადასტურებლად:')
    if (secondConfirm !== 'წაშლა') {
      alert('პროფილის წაშლა გაუქმებულია')
      return
    }

    try {
      const response = await fetch('/api/user/profile', {
        method: 'DELETE'
      })

      const data = await response.json()

      if (response.ok && data.success) {
        alert('თქვენი პროფილი წარმატებით წაიშალა')
        // Sign out and redirect to home
        await signOut({ callbackUrl: '/' })
      } else {
        alert(data.error || 'შეცდომა პროფილის წაშლისას')
      }
    } catch (error) {
      console.error('Error deleting profile:', error)
      alert('შეცდომა პროფილის წაშლისას')
    }
  }

  const renderSettingsTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-black mb-6">პარამეტრები</h3>
        {/* Profile edit form */}
        <ProfileSettingsForm />
      </div>
      
      {/* Danger Zone */}
        <button
          onClick={handleDeleteProfile}
          className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          <span>პროფილის გაუქმება</span>
        </button>
    
      
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

function ProfileSettingsForm() {
  const { data: session, update } = useSession()
  const [form, setForm] = useState({
    name: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',
    address: '',
    postalIndex: '',
    gender: '',
    dateOfBirth: '',
    personalId: '',
    image: ''
  })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await fetch('/api/user/profile')
        const data = await res.json()
        if (data.success && data.user) {
          setForm({
            name: data.user.name || '',
            lastName: data.user.lastName || '',
            email: data.user.email || '',
            phone: data.user.phone || '',
            location: data.user.location || '',
            address: data.user.address || '',
            postalIndex: data.user.postalIndex || '',
            gender: data.user.gender || '',
            dateOfBirth: data.user.dateOfBirth ? new Date(data.user.dateOfBirth).toISOString().split('T')[0] : '',
            personalId: data.user.personalId || '',
            image: data.user.image || ''
          })
        }
      } catch (err) {
        console.error('Error fetching user data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchUserData()
  }, [])

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError(null)
    setSuccess(null)
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          lastName: form.lastName,
          email: form.email,
          image: form.image || null,
          phone: form.phone,
          location: form.location,
          address: form.address,
          postalIndex: form.postalIndex,
          gender: form.gender || undefined,
          dateOfBirth: form.dateOfBirth || undefined,
        })
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'შეცდომა')
      }
      await update({
        name: data.user.name,
        email: data.user.email,
        image: data.user.image,
        phone: data.user.phone,
        location: data.user.location,
      })
      setSuccess('პროფილი განახლდა')
    } catch (err: unknown) {
      const message = typeof err === 'object' && err && 'message' in err ? String((err as { message?: string }).message) : 'შეცდომა'
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  const onImageChange = async (urls: string[]) => {
    setForm({ ...form, image: urls[0] || '' })
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-black rounded-full animate-spin mx-auto"></div>
        <p className="text-gray-600 mt-2">იტვირთება...</p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error && <div className="p-3 rounded bg-red-50 text-red-800 text-sm">{error}</div>}
      {success && <div className="p-3 rounded bg-green-50 text-green-800 text-sm">{success}</div>}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">სურათი</label>
        <ImageUpload value={form.image ? [form.image] : []} onChange={onImageChange} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">სახელი</label>
          <input name="name" value={form.name} onChange={onChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">გვარი</label>
          <input name="lastName" value={form.lastName} onChange={onChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">ელფოსტა</label>
        <input type="email" name="email" value={form.email} onChange={onChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">ტელეფონი</label>
        <input name="phone" value={form.phone} onChange={onChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">ადგილმდებარეობა</label>
        <input name="location" value={form.location} onChange={onChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">მისამართი</label>
        <input name="address" value={form.address} onChange={onChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">საფოსტო ინდექსი</label>
        <input name="postalIndex" value={form.postalIndex} onChange={onChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">სქესი</label>
          <select name="gender" value={form.gender} onChange={onChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent">
            <option value="">აირჩიეთ სქესი</option>
            <option value="MALE">კაცი</option>
            <option value="FEMALE">ქალი</option>
           
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">დაბადების თარიღი</label>
          <input type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={onChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">პირადობის ნომერი</label>
        <input name="personalId" value={form.personalId} disabled className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed" />
        <p className="text-xs text-gray-500 mt-1">პირადობის ნომერი არ შეიძლება შეიცვალოს</p>
      </div>

      <button type="submit" disabled={saving} className="w-full bg-black text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50">
        {saving ? 'ინახება...' : 'პროფილის შენახვა'}
      </button>
    </form>
  )
}

export default AccountPage
