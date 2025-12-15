'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { User, Package, ShoppingCart, Settings, MapPin, Phone, Mail, Camera, MessageCircle, Search, Trash2, TrendingUp } from 'lucide-react'
import ImageUpload from '@/component/CloudinaryUploader'
import ContactForm from '@/component/ContactForm'
import { showToast } from '@/utils/toast'

interface Order {
  id: number
  total: number
  status: string
  createdAt: string
  items?: Array<{ productName: string; size: string; price: number }>
}

interface SaleOrderItem {
  productName: string
  size: string | null
  price: number
  quantity: number
  product?: {
    id: number
    images?: Array<{ url: string }>
  }
}

interface SaleOrder {
  id: number
  total: number
  status: string
  createdAt: string
  buyer?: {
    id?: string
    name: string | null
    email: string | null
    phone?: string | null
  }
  items?: SaleOrderItem[]
}

interface ProductItem {
  id: number
  name: string
  status: string
  createdAt: string
  sku?: string | null
  images?: Array<{ url: string }>
  variants?: Array<{ price: number; size: string; id: number }>
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED'
  rejectionReason?: string | null
}

type VerificationState = 'PENDING' | 'APPROVED' | 'REJECTED' | null

const AccountPageContent = () => {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState('profile')
  const [userStats, setUserStats] = useState({
    ordersCount: 0,
    totalSpent: 0,
    productsCount: 0,
    soldProductsCount: 0
  })
  const [loading, setLoading] = useState(false)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [profileImage, setProfileImage] = useState<string | null>(session?.user?.image || null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [sales, setSales] = useState<SaleOrder[]>([])
  const [products, setProducts] = useState<ProductItem[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [loadingSales, setLoadingSales] = useState(false)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [verification, setVerification] = useState<{
    id?: number;
    idFrontUrl?: string | null;
    idBackUrl?: string | null;
    entrepreneurCertificateUrl?: string | null;
    status?: 'PENDING' | 'APPROVED' | 'REJECTED';
    identityStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
    entrepreneurStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
    comment?: string | null;
    identityComment?: string | null;
    entrepreneurComment?: string | null;
  } | null>(null)
  const [verifLoading, setVerifLoading] = useState(false)
  const [savingVerification, setSavingVerification] = useState(false)
  const [savingEntrepreneurCertificate, setSavingEntrepreneurCertificate] = useState(false)
  const [userBlocked, setUserBlocked] = useState(false)
  const [userVerified, setUserVerified] = useState(false)
  const [userIban, setUserIban] = useState<string | null>(null)
  const [hasActiveRentals, setHasActiveRentals] = useState(false)
  const [checkingRentals, setCheckingRentals] = useState(false)
  const [chatRooms, setChatRooms] = useState<any[]>([])
  const [loadingChats, setLoadingChats] = useState(false)
  const [selectedChatRoom, setSelectedChatRoom] = useState<any | null>(null)
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const isSeller = userStats.productsCount > 0
  // Show verification for all non-admin users who haven't been approved yet
  const sellerNeedsVerification = true // Always show for non-admin users
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
  const [entrepreneurCertificateUrl, setEntrepreneurCertificateUrl] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('entrepreneurCertificateUrl') || null
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

  // Fetch sales when tab changes to sales
  useEffect(() => {
    if (activeTab === 'sales' && session?.user?.id) {
      fetchSales()
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

  // Check for active rentals when settings tab is active
  useEffect(() => {
    if (activeTab === 'settings' && session?.user?.id) {
      checkActiveRentals()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // Check URL parameters on mount
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    const chatParam = searchParams.get('chat')
    
    if (tabParam) {
      setActiveTab(tabParam)
    }
    
    if (chatParam) {
      const chatId = parseInt(chatParam)
      if (!isNaN(chatId)) {
        // Wait for chat rooms to load, then select the chat
        setTimeout(() => {
          const room = chatRooms.find(r => r.id === chatId)
          if (room) {
            setSelectedChatRoom(room)
          }
        }, 500)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Fetch chats when tab changes to chats
  useEffect(() => {
    if (activeTab === 'chats' && session?.user?.id) {
      fetchChatRooms()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // Select chat room when chatRooms are loaded and chat param exists
  useEffect(() => {
    const chatParam = searchParams.get('chat')
    if (chatParam && chatRooms.length > 0) {
      const chatId = parseInt(chatParam)
      if (!isNaN(chatId)) {
        const room = chatRooms.find(r => r.id === chatId)
        if (room && !selectedChatRoom) {
          setSelectedChatRoom(room)
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatRooms, searchParams])

  // Fetch messages when chat room is selected
  useEffect(() => {
    if (selectedChatRoom?.id) {
      fetchChatMessages(selectedChatRoom.id)
      // Poll for new messages every 3 seconds
      const interval = setInterval(() => {
        fetchChatMessages(selectedChatRoom.id)
      }, 3000)
      return () => clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChatRoom])

  // Check ban status and blocked/verified status
  useEffect(() => {
    if (session?.user?.id) {
      fetch('/api/user/me').then(r => r.json()).then(d => {
        if (d?.user?.banned) {
          showToast(d.user.banReason ? `თქვენი ანგარიში დაბლოკილია: ${d.user.banReason}` : 'თქვენი ანგარიში დაბლოკილია', 'error')
          router.push('/')
        }
        if (d?.user) {
          setUserBlocked(d.user.blocked || false)
          setUserVerified(d.user.verified || false)
        }
      }).catch(() => { })
      
      // Fetch user IBAN
      fetch('/api/user/profile').then(r => r.json()).then(d => {
        if (d?.success && d?.user) {
          setUserIban(d.user.iban || null)
        }
      }).catch(() => { })
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
      const salesResponse = await fetch('/api/user/sales')
      const salesData = await salesResponse.json()
      const soldProductsCount = salesData.success
        ? salesData.orders.reduce((sum: number, order: { items?: Array<{ quantity?: number }> }) =>
            sum + (order.items?.reduce((itemSum, item) => itemSum + (item.quantity ?? 1), 0) || 0),
          0)
        : 0

      // Fetch user products
      const productsResponse = await fetch('/api/user/products')
      const productsData = await productsResponse.json()
      const productsCount = productsData.success ? productsData.products.length : 0

      setUserStats({
        ordersCount,
        totalSpent,
        productsCount,
        soldProductsCount
      })
    } catch (error) {
      console.error('Error fetching user stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkActiveRentals = async () => {
    try {
      setCheckingRentals(true)
      const now = new Date()
      
      // Check active rentals from Rental table - fetch all rentals and filter
      const rentalsResponse = await fetch('/api/rental')
      const rentalsData = await rentalsResponse.json()
      
      const activeRentalsFromTable = rentalsData.rentals?.filter((rental: { status: string; endDate: string }) => {
        const endDate = new Date(rental.endDate)
        return (rental.status === 'RESERVED' || rental.status === 'ACTIVE') && endDate >= now
      }) || []

      // Check active rental orders
      const ordersResponse = await fetch('/api/user/orders')
      const ordersData = await ordersResponse.json()
      
      const activeRentalOrders = ordersData.success && ordersData.orders
        ? ordersData.orders.filter((order: { status: string; items?: Array<{ isRental?: boolean; rentalEndDate?: string }> }) => {
            if (!['PENDING', 'PAID', 'SHIPPED'].includes(order.status)) return false
            return order.items?.some((item: { isRental?: boolean; rentalEndDate?: string }) => {
              if (!item.isRental || !item.rentalEndDate) return false
              const endDate = new Date(item.rentalEndDate)
              return endDate >= now
            })
          })
        : []

      setHasActiveRentals(activeRentalsFromTable.length > 0 || activeRentalOrders.length > 0)
    } catch (error) {
      console.error('Error checking active rentals:', error)
      // On error, allow deletion (fail open)
      setHasActiveRentals(false)
    } finally {
      setCheckingRentals(false)
    }
  }

  const fetchChatRooms = async () => {
    try {
      setLoadingChats(true)
      const response = await fetch('/api/chat')
      const data = await response.json()
      if (data.success) {
        setChatRooms(data.chatRooms || [])
      }
    } catch (error) {
      console.error('Error fetching chat rooms:', error)
    } finally {
      setLoadingChats(false)
    }
  }

  const fetchChatMessages = async (chatRoomId: number) => {
    try {
      const response = await fetch(`/api/chat/${chatRoomId}`)
      const data = await response.json()
      if (data.success) {
        setChatMessages(data.messages || [])
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const sendChatMessage = async () => {
    if (!newMessage.trim() || !selectedChatRoom) return

    setSendingMessage(true)
    const messageToSend = newMessage.trim()
    setNewMessage('')

    try {
      const response = await fetch(`/api/chat/${selectedChatRoom.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: messageToSend })
      })

      const data = await response.json()
      if (data.success) {
        // Refresh messages
        fetchChatMessages(selectedChatRoom.id)
        // Refresh chat rooms to update last message
        fetchChatRooms()
      } else {
        showToast(data.error || 'შეცდომა შეტყობინების გაგზავნისას', 'error')
        setNewMessage(messageToSend) // Restore message on error
      }
    } catch (error) {
      console.error('Error sending message:', error)
      showToast('შეცდომა შეტყობინების გაგზავნისას', 'error')
      setNewMessage(messageToSend) // Restore message on error
    } finally {
      setSendingMessage(false)
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

        showToast('პროფილის სურათი წარმატებით განახლდა!', 'success')
        setIsEditingProfile(false)
      } else {
        console.error('Profile update failed:', result)
        showToast(`შეცდომა სურათის ატვირთვისას: ${result.error || 'Unknown error'}`, 'error')
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      showToast('შეცდომა სურათის ატვირთვისას', 'error')
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
          const savedEntrepreneur = localStorage.getItem('entrepreneurCertificateUrl')
          setIdFrontUrl(savedFront || data.verification?.idFrontUrl || null)
          setIdBackUrl(savedBack || data.verification?.idBackUrl || null)
          setEntrepreneurCertificateUrl(savedEntrepreneur || data.verification?.entrepreneurCertificateUrl || null)
        } else {
          setIdFrontUrl(data.verification?.idFrontUrl || null)
          setIdBackUrl(data.verification?.idBackUrl || null)
          setEntrepreneurCertificateUrl(data.verification?.entrepreneurCertificateUrl || null)
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
  const handleEntrepreneurCertificateUpload = async (urls: string[]) => {
    if (!urls.length) return
    const url = urls[0]
    setEntrepreneurCertificateUrl(url)
    // Save to localStorage to persist across refreshes
    if (typeof window !== 'undefined') {
      localStorage.setItem('entrepreneurCertificateUrl', url)
    }
  }

  // პირადობის დამტკიცების ფუნქცია - დამოუკიდებელი
  const saveIdentityVerification = async () => {
    try {
      if (!idFrontUrl || !idBackUrl) {
        showToast('გთხოვთ ატვირთოთ პირადობის დოკუმენტის წინა და უკანა მხარე', 'warning')
        return
      }
      
      if (!userIban || !userIban.startsWith('GE') || userIban.length < 22) {
        showToast('გთხოვთ შეიყვანოთ სწორი IBAN', 'warning')
        return
      }
      
      setSavingVerification(true)
      
      // First save IBAN to user profile
      const ibanRes = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: session?.user?.name || '',
          email: session?.user?.email || '',
          phone: (session?.user as { phone?: string })?.phone || '',
          location: (session?.user as { location?: string })?.location || '',
          iban: userIban
        })
      })
      
      if (!ibanRes.ok) {
        const ibanData = await ibanRes.json()
        showToast(ibanData.error || 'შეცდომა IBAN-ის შენახვისას', 'error')
        setSavingVerification(false)
        return
      }
      
      // Then save verification documents
      const res = await fetch('/api/user/verification', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          idFrontUrl, 
          idBackUrl, 
          entrepreneurCertificateUrl: verification?.entrepreneurCertificateUrl || null, // შევინარჩუნოთ არსებული ინდმეწარმის საბუთი
          iban: userIban
        })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setVerification(data.verification)
        showToast('პირადობის დოკუმენტები და IBAN წარმატებით გაიგზავნა ვალიდაციაზე', 'success')
        setIdFrontUrl(null)
        setIdBackUrl(null)
        // Clear localStorage after successful save
        if (typeof window !== 'undefined') {
          localStorage.removeItem('idFrontUrl')
          localStorage.removeItem('idBackUrl')
        }
        // Update session with IBAN
        await update({
          iban: userIban
        })
      } else {
        showToast(data.error || 'შეცდომა გაგზავნისას', 'error')
      }
    } catch (e) {
      console.error('Error saving identity verification:', e)
      showToast('შეცდომა ვერიფიკაციის შენახვისას', 'error')
    } finally {
      setSavingVerification(false)
    }
  }

  // ინდმეწარმის საბუთის ატვირთვის ფუნქცია - დამოუკიდებელი
  const saveEntrepreneurCertificate = async () => {
    try {
      if (!entrepreneurCertificateUrl) {
        showToast('გთხოვთ ატვირთოთ ინდმეწარმის საბუთი', 'warning')
        return
      }
      
      setSavingEntrepreneurCertificate(true)
      const res = await fetch('/api/user/verification', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          idFrontUrl: verification?.idFrontUrl || null, // შევინარჩუნოთ არსებული პირადობის დოკუმენტები
          idBackUrl: verification?.idBackUrl || null,
          entrepreneurCertificateUrl
        })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setVerification(data.verification)
        showToast('ინდმეწარმის საბუთი წარმატებით გაიგზავნა ვალიდაციაზე', 'success')
        setEntrepreneurCertificateUrl(null)
        // Clear localStorage after successful save
        if (typeof window !== 'undefined') {
          localStorage.removeItem('entrepreneurCertificateUrl')
        }
      } else {
        showToast(data.error || 'შეცდომა გაგზავნისას', 'error')
      }
    } catch (e) {
      console.error('Error saving entrepreneur certificate:', e)
      showToast('შეცდომა ინდმეწარმის საბუთის შენახვისას', 'error')
    } finally {
      setSavingEntrepreneurCertificate(false)
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

  const identityStatus: VerificationState =
    verification?.identityStatus ??
    verification?.status ??
    (session.user.verificationStatus as 'PENDING' | 'APPROVED' | 'REJECTED' | null) ??
    null
  const identityComment = verification?.identityComment ?? verification?.comment ?? null
  const identityApproved = identityStatus === 'APPROVED'
  const hasIban = Boolean(userIban)
  const canCreateProducts = session.user.role === 'ADMIN' || (identityApproved && hasIban)
  const shouldShowIdentityVerification = session.user.role !== 'ADMIN' && sellerNeedsVerification && !identityApproved
  const shouldShowIbanVerification = session.user.role !== 'ADMIN' && sellerNeedsVerification && !userIban

  const tabs = [
    { id: 'profile', label: 'პროფილი', icon: User },
    { id: 'orders', label: 'შეკვეთები', icon: ShoppingCart },
    { id: 'sales', label: 'გაყიდვები', icon: TrendingUp },
    { id: 'chats', label: 'ჩათები', icon: MessageCircle },
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

  const fetchSales = async () => {
    try {
      setLoadingSales(true)
      const response = await fetch('/api/user/sales')
      const data = await response.json()
      if (data.success) {
        setSales(data.orders || [])
      }
    } catch (error) {
      console.error('Error fetching sales:', error)
    } finally {
      setLoadingSales(false)
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
        showToast('პროდუქტი წარმატებით წაიშალა', 'success')
      } else {
        showToast('შეცდომა პროდუქტის წაშლისას', 'error')
      }
    } catch (error) {
      console.error('Error deleting product:', error)
      showToast('შეცდომა პროდუქტის წაშლისას', 'error')
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
        showToast('შეცდომა სტატუსის შეცვლისას', 'error')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      showToast('შეცდომა სტატუსის შეცვლისას', 'error')
    }
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

  const getProductApprovalLabel = (
    status?: 'PENDING' | 'APPROVED' | 'REJECTED'
  ) => {
    if (status === 'APPROVED') return 'დამტკიცებულია'
    if (status === 'REJECTED') return 'უარყოფილია'
    return 'ველოდებით დამტკიცებას'
  }

  const renderProfileTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center space-x-4 mb-6">
          <div className="relative">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
              {profileImage ? (
                <Image
                  src={profileImage}
                  alt="Profile"
                  width={64}
                  height={64}
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
           
          </div>
        </div>

        {isEditingProfile && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h2 className="text-lg font-semibold text-black mb-3">პროფილის სურათის ატვირთვა</h2>
            <ImageUpload
              value={profileImage ? [profileImage] : []}
              onChange={handleImageUpload}
            />
            {isUploadingImage && (
              <p className="text-[16px] text-black mt-2">სურათი იტვირთება...</p>
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
                <p className="md:text-[18px] text-[16px] text-black">ელფოსტა</p>
                <p className="font-medium">{session.user.email}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <User className="w-5 h-5 text-black" />
              <div>
                <p className="md:text-[18px] text-[16px] text-black">სახელი</p>
                <p className="font-medium">{session.user.name}</p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Phone className="w-5 h-5 text-black" />
              <div>
                <p className="md:text-[18px] text-[16px] text-black">ტელეფონი</p>
                <p className="font-medium">{session.user.phone ?? '-'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <MapPin className="w-5 h-5 text-black" />
              <div>
                <p className="md:text-[18px] text-[16px] text-black">მისამართი</p>
                <p className="font-medium">{(session.user as { location?: string })?.location ?? '-'}</p>
              </div>

            </div>

          </div>

        </div>

        {/* Blocked message */}
        {userBlocked && !userVerified && (
          <div className="mt-8 p-4 border-2 border-red-500 rounded-lg bg-red-50">
            <p className="md:text-[20px] text-[16px] text-red-600 mt-2">
              თქვენი შემოსავალი 100₾-ს აღემატება. გთხოვთ ატვირთოთ ინდმეწარმის დამადასტურებელი დოკუმენტი ქვემოთ
            </p>
          </div>
        )}

        {/* პირადობის დამტკიცების სექცია - დამოუკიდებელი */}
        {shouldShowIdentityVerification && (
          <div className="mt-8 p-6 border-2 border-black rounded-lg bg-gray-50">
            <div className="mb-4">
              <h2 className="text-xl font-bold mb-2">პირადობის ვერიფიკაცია</h2>
              {identityStatus !== 'REJECTED' && (
                <p className="text-[18px] text-black">
                  პირადობის სურათებით მოხდება თქვენი ვერიფიცირება, თუ არ ატვირთავთ სურათებს ვერ შეძლებთ ახალი პროდუქტის დამატებას ან ყიდვას და ქირაობას
                </p>
              )}
              {identityStatus === 'REJECTED' && (
                <p className="text-[18px] text-black">
                  თქვენი პირადობის დოკუმენტები უარყოფილია. გთხოვთ ატვირთოთ სურათები თავიდან
                </p>
              )}
            </div>
            
            {verifLoading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-gray-300 border-t-[#1B3729] rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-[16px] text-black">იტვირთება...</p>
              </div>
            ) : (
              <>
                {/* Status Badge */}
                {identityStatus && (
                  <div className="mb-4">
                    <span className={`inline-block px-4 py-2 text-[16px] font-semibold rounded-full ${
                      identityStatus === 'REJECTED'
                        ? ' text-red-500'
                        : ' text-yellow-500'
                    }`}>
                      სტატუსი: {getVerificationStatusLabel(identityStatus as 'PENDING' | 'APPROVED' | 'REJECTED')}
                    </span>
                    {identityStatus === 'REJECTED' && identityComment && (
                      <p className="mt-2 text-[16px] font-medium text-red-700">მიზეზი: {identityComment}</p>
                    )}
                  </div>
                )}

                {/* პირადობის დოკუმენტების ატვირთვა */}
                <div className="grid gap-6 mb-6 grid-cols-1 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="block text-[18px] font-semibold text-black mb-3">
                      დოკუმენტის წინა მხარე *
                    </label>
                    <ImageUpload 
                      value={idFrontUrl ? [idFrontUrl] : []} 
                      onChange={handleIdFrontUpload} 
                    />
                    {idFrontUrl && (
                      <p className="text-sm text-green-600 mt-2">✓ სურათი ატვირთულია</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-[18px] font-semibold text-black mb-3">
                      დოკუმენტის უკანა მხარე *
                    </label>
                    <ImageUpload 
                      value={idBackUrl ? [idBackUrl] : []} 
                      onChange={handleIdBackUpload} 
                    />
                    {idBackUrl && (
                      <p className="text-sm text-green-600 mt-2">✓ სურათი ატვირთულია</p>
                    )}
                  </div>
                </div>

                {/* IBAN Input - inside identity verification section */}
                <div className="mb-6">
                  <label className="block text-[18px] font-semibold text-black mb-2">
                    ბანკის IBAN <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={userIban || ''}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase().replace(/\s/g, '')
                      setUserIban(value)
                    }}
                    placeholder="მაგ: GE00TB0000000000000000"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black"
                  />
                  <p className="text-sm text-gray-600 mt-1">IBAN უნდა იწყებოდეს GE-ით და შეიცავდეს 22 სიმბოლოს</p>
                  {userIban && userIban.startsWith('GE') && userIban.length >= 22 && (
                    <p className="text-sm text-green-600 mt-1">✓ IBAN სწორია</p>
                  )}
                </div>

                {/* Submit Button */}
                <div className="flex items-center justify-between">
                  <div className="text-[16px] text-gray-600">
                    {idFrontUrl && idBackUrl && userIban && userIban.startsWith('GE') && userIban.length >= 22 ? (
                      <span className="text-green-600 font-semibold">✓ ორივე სურათი და IBAN მზადაა გასაგზავნად</span>
                    ) : (
                      <span className="text-red-500">
                        {!idFrontUrl || !idBackUrl 
                          ? 'გთხოვთ ატვირთოთ პირადობის დოკუმენტის ორივე მხარე'
                          : 'გთხოვთ შეიყვანოთ სწორი IBAN'
                        }
                      </span>
                    )}
                  </div>
                  <button
                    onClick={saveIdentityVerification}
                    disabled={savingVerification || !idFrontUrl || !idBackUrl || !userIban || !userIban.startsWith('GE') || userIban.length < 22}
                    className={`px-6 py-3 rounded-lg font-bold text-[18px] uppercase tracking-wide transition-colors ${
                      idFrontUrl && idBackUrl && userIban && userIban.startsWith('GE') && userIban.length >= 22 && !savingVerification
                        ? 'bg-[#1B3729] text-white hover:bg-[#2a4d3a]'
                        : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                    }`}
                  >
                    {savingVerification ? 'გაგზავნა...' : 'პირადობის დამტკიცება'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}


        {/* ინდმეწარმის საბუთის სექცია - დამოუკიდებელი, მხოლოდ როცა blocked */}
        {session.user.role !== 'ADMIN' && userBlocked && !userVerified && (
          <div className="mt-8 p-6 border-2 border-black rounded-lg bg-gray-50">
            <div className="mb-4">
              <h4 className="text-xl font-bold mb-2">ინდმეწარმის საბუთის ატვირთვა</h4>
              <p className="text-[18px] text-black font-medium mb-2">
                გთხოვთ ატვირთოთ ინდმეწარმის დამადასტურებელი დოკუმენტი
              </p>
            </div>
            
            {verifLoading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-gray-300 border-t-[#1B3729] rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-[16px] text-black">იტვირთება...</p>
              </div>
            ) : (
              <>
                {/* ინდმეწარმის საბუთის ატვირთვა */}
                <div className="grid gap-6 mb-6 grid-cols-1">
                  <div className="space-y-2">
                    <label className="block text-[18px] font-semibold text-black mb-3">
                      ინდმეწარმის საბუთი * 
                    </label>
                    <ImageUpload 
                      value={entrepreneurCertificateUrl ? [entrepreneurCertificateUrl] : []} 
                      onChange={handleEntrepreneurCertificateUpload} 
                    />
                    {entrepreneurCertificateUrl && (
                      <p className="text-sm text-green-600 mt-2">✓ სურათი ატვირთულია</p>
                    )}
                    {!entrepreneurCertificateUrl && (
                      <p className="text-[18px] text-black mt-2">აუცილებელია ატვირთვა</p>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex items-center justify-between">
                  <div className="text-[16px] text-gray-600">
                    {entrepreneurCertificateUrl ? (
                      <span className="text-green-600 font-semibold">✓ ინდმეწარმის საბუთი მზადაა გასაგზავნად</span>
                    ) : (
                      <span className="text-black text-[18px]">გთხოვთ ატვირთოთ ინდმეწარმის საბუთი</span>
                    )}
                  </div>
                  <button
                    onClick={saveEntrepreneurCertificate}
                    disabled={savingEntrepreneurCertificate || !entrepreneurCertificateUrl}
                    className={`px-6 py-3 rounded-lg font-bold text-[18px] uppercase tracking-wide transition-colors ${
                      entrepreneurCertificateUrl && !savingEntrepreneurCertificate
                        ? 'bg-[#1B3729] text-white hover:bg-[#2a4d3a]'
                        : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                    }`}
                  >
                    {savingEntrepreneurCertificate ? 'გაგზავნა...' : 'ინდმეწარმის საბუთის გაგზავნა'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

      </div>
      {session.user.role !== 'ADMIN' && identityApproved && (
        <h1 className="text-green-500 text-[20px] font-bold ">პირადობა დამტკიცებულია</h1>
      )}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h4 className="md:text-[20px] text-[18px] font-bold text-black mb-4">ანგარიშის სტატისტიკა</h4>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="text-center">
                <div className="w-8 h-8 bg-gray-200 rounded animate-pulse mx-auto mb-2"></div>
                <div className="w-16 h-4 bg-gray-200 rounded animate-pulse mx-auto"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-black">{userStats.ordersCount}</div>
              <div className="md:text-[18px] text-[16px] text-black">შეკვეთა</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-black">₾{userStats.totalSpent.toFixed(2)}</div>
              <div className="md:text-[18px] text-[16px] text-black">მთლიანი ღირებულება</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-black">{userStats.productsCount}</div>
              <div className="md:text-[18px] text-[16px] text-black">პროდუქტი</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-black">{userStats.soldProductsCount}</div>
              <div className="md:text-[18px] text-[16px] text-black">გაყიდული პროდუქტი</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  const renderOrdersTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="md:text-[20px]  text-[18px] font-bold text-black mb-6">შეკვეთების ისტორია</h3>

        {loadingOrders ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-gray-300 border-t-[#1B3729] rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-[18px] text-black">იტვირთება...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingCart className="w-12 h-12 text-black mx-auto mb-4" />
            <p className="text-[18px] text-black">ჯერ არ გაქვთ შეკვეთები</p>
            <Link
              href="/shop"
              className="inline-block md:text-[18px] text-[16px] mt-4 px-6 py-2 bg-[#1B3729] text-white rounded-lg font-bold uppercase tracking-wide  transition-colors"
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
                    <h4 className="font-semibold md:text-[18px] text-[16px] text-black">შეკვეთა #{order.id}</h4>
                        <p className="text-[18px] text-black">{new Date(order.createdAt).toLocaleDateString('ka-GE')}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold md:text-[22px] text-[16px] text-black">ჯამი: ₾{order.total}</p>
                    <span className={`inline-block px-2 py-1 md:text-[20px] text-[18px] font-bold rounded-full ${order.status === 'PAID' ? ' text-green-500' :
                      order.status === 'SHIPPED' ? ' text-blue-500' :
                        order.status === 'CANCELED' ? ' text-red-500' :
                          order.status === 'REFUNDED' ? ' text-gray-500' : ' text-yellow-500'
                      }`}>
                      {order.status === 'PAID'
                        ? 'გადახდილი'
                        : order.status === 'SHIPPED'
                          ? 'გაგზავნილი'
                          : order.status === 'CANCELED'
                            ? 'გაუქმებული'
                            : order.status === 'REFUNDED'
                              ? 'დაბრუნებული'
                              : 'მოლოდინში'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  {order.items?.map((item: { productName: string; size: string; price: number }, index: number) => (
                    <div key={index} className="flex items-center justify-between text-[16px]">
                      <span className="text-black">{item.productName} ({item.size})</span>
                      <span className="md:text-[18px] text-[16px] text-black">₾{item.price}</span>
                    </div>
                  ))}
                </div>

               
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  const renderSalesTab = () => {
    const totalSoldItems = sales.reduce(
      (sum, order) =>
        sum +
        (order.items?.reduce((itemSum, item) => itemSum + (item.quantity ?? 1), 0) || 0),
      0
    )

    const totalSalesAmount = sales.reduce(
      (sum, order) =>
        sum +
        (order.items?.reduce(
          (itemSum, item) =>
            itemSum + (item.price ?? 0) * (item.quantity ?? 1),
          0
        ) || 0),
      0
    )

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="md:text-[20px] text-[18px] font-bold text-black">გაყიდვები </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-black">{totalSoldItems}</div>
              <div className="md:text-[18px] text-[16px] text-black">გაყიდული პროდუქტი</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-black">₾{totalSalesAmount.toFixed(2)}</div>
              <div className="md:text-[18px] text-[16px] text-black">შემოსავალი</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="md:text-[20px] text-[18px] font-bold text-black mb-6">გაყიდვების ისტორია</h3>

          {loadingSales ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-gray-300 border-t-[#1B3729] rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-[16px] text-black">გაყიდვები იტვირთება...</p>
            </div>
          ) : sales.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp className="w-12 h-12 text-black mx-auto mb-4" />
              <p className="text-[18px] text-black">ჯერ არ გაქვთ გაყიდვები</p>
              <p className="text-[16px] text-gray-500">დაამატეთ პროდუქტი და დაიწყეთ გაყიდვები</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sales.map((order) => {
                const saleDate = new Date(order.createdAt)
                const saleDateLabel = saleDate.toLocaleDateString('ka-GE')
                const saleTimeLabel = saleDate.toLocaleTimeString('ka-GE', {
                  hour: '2-digit',
                  minute: '2-digit'
                })
                const sellerTotal =
                  order.items?.reduce(
                    (sum, item) => sum + (item.price ?? 0) * (item.quantity ?? 1),
                    0
                  ) || 0
                return (
                  <div key={order.id} className="border border-black rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-3">
                      <div>
                        <h4 className="font-semibold md:text-[18px] text-[16px] text-black">გაყიდვა #{order.id}</h4>
                        <p className="text-[16px] text-black">
                          {saleDateLabel} • <span className="text-gray-600 text-[14px]">{saleTimeLabel}</span>
                        </p>
                        {order.buyer && (
                          <p className="text-[16px] text-gray-600">
                            მყიდველი: {order.buyer.name || 'უცნობი'} ({order.buyer.email || '---'})
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold md:text-[22px] text-[16px] text-black">ჯამი: ₾{sellerTotal.toFixed(2)}</p>
                        <span
                          className={`inline-block px-2 py-1 md:text-[20px] text-[18px] font-bold rounded-full ${
                            order.status === 'PAID'
                              ? 'text-green-500'
                              : order.status === 'SHIPPED'
                                ? ' text-blue-500'
                                : order.status === 'CANCELED'
                                  ? ' text-red-500'
                                  : order.status === 'REFUNDED'
                                    ? ' text-gray-500'
                                    : ' text-yellow-500'
                          }`}
                        >
                          {order.status === 'PAID'
                            ? 'გადახდილი'
                            : order.status === 'SHIPPED'
                              ? 'გაგზავნილი'
                              : order.status === 'CANCELED'
                                ? 'გაუქმებული'
                                : order.status === 'REFUNDED'
                                  ? 'დაბრუნებული'
                                  : 'მოლოდინში'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {order.items?.map((item, index) => (
                        <div
                          key={index}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[16px]"
                        >
                          <div className="flex items-center gap-3 text-black">
                            {item.product?.images?.[0]?.url && (
                              <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
                                <Image
                                  src={item.product.images[0].url}
                                  alt={item.productName}
                                  width={48}
                                  height={48}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <div>
                              <div className="font-medium">{item.productName}</div>
                              {item.size && <div className="md:text-[18px] text-[16px] text-black">ზომა: {item.size}</div>}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="md:text-[18px] text-[16px] text-black">₾{(item.price ?? 0).toFixed(2)}</div>
                            <div className="md:text-[18px] text-[16px] text-black">რაოდენობა: {item.quantity ?? 1}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderProductsTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="md:text-[20px] text-[18px] font-bold text-black">ჩემი პროდუქტები</h3>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
            <Link
              href="/account/products/sku"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-black rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Search className="w-4 h-4" />
              <span>ძიება კოდის მიხედვით</span>
            </Link>
            {canCreateProducts ? (
              <Link
                href="/account/products/new"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#1B3729] text-white rounded-lg font-semibold uppercase tracking-wide transition-colors hover:bg-[#164321]"
              >
                <Package className="w-4 h-4" />
                <span className="md:text-[18px] text-[16px]">ახალი პროდუქტი</span>
              </Link>
            ) : (
              <button
                disabled
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-200 text-black rounded-lg font-semibold uppercase tracking-wide cursor-not-allowed"
                title="ახალი პროდუქტის დამატება შესაძლებელია მხოლოდ ვერიფიცირებული და IBAN-ს მქონე ანგარიშებისთვის"
              >
                <Package className="w-4 h-4" />
                <span className="md:text-[18px] text-[16px]">ახალი პროდუქტი</span>
              </button>
            )}
          </div>
        </div>
        {session.user.role !== 'ADMIN' && !identityApproved && (
          <div className="mb-4 p-3 border border-yellow-400 bg-yellow-50 text-yellow-800 rounded md:text-[18px] text-[16px]">
            გთხოვთ დაადასტუროთ პირადობა პროფილის გვერდზე, რომ შეძლოთ პროდუქტის დამატება.
          </div>
        )}
        {session.user.role !== 'ADMIN' && identityApproved && !hasIban && (
          <div className="mb-4 p-3 border border-yellow-400 bg-yellow-50 text-yellow-800 rounded md:text-[18px] text-[16px]">
            გთხოვთ მიუთითოთ ბანკის IBAN პროფილში, რომ შეძლოთ ახალი პროდუქტის დამატება.
          </div>
        )}

       
        {loadingProducts ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-gray-300 border-t-[#1B3729] rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-black">იტვირთება...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-black mx-auto mb-4" />
            <p className="md:text-[18px] text-[16px] text-black">ჯერ არ გაქვთ პროდუქტები</p>

          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <div key={product.id} className="border border-black rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                <div className="aspect-[3/4] bg-gray-200 relative">
                  <Image
                    src={product.images?.[0]?.url || '/placeholder.jpg'}
                    alt={product.name}
                    width={400}
                    height={533}
                    className="w-full h-full object-cover"
                  />
              
                </div>

                <div className="p-4">
                  <h4 className="font-semibold text-black mb-2">{product.name}</h4>
                  {product.sku && (
                    <div className="mb-2">
                      <span className="md:text-[18px] text-[16px] font-mono px-2 py-1 rounded text-black bg-gray-100">
                        კოდი: {product.sku}
                      </span>
                    </div>
                  )}
                  <p className="md:text-[18px] text-[16px] font-bold text-black mb-2">
                    {(() => {
                      if (!product.variants || product.variants.length === 0) return '₾0.00'

                      const variantPrices = product.variants as Array<{ price: number; size: string; id: number }>
                      const prices = variantPrices
                        .filter((v: { price: number; size: string; id: number }) => typeof v.price === 'number')
                        .map((v: { price: number }) => v.price)

                      if (prices.length === 0) return '₾0.00'

                      const minPrice = Math.min(...prices)
                      const maxPrice = Math.max(...prices)

                      return minPrice === maxPrice
                        ? `₾${minPrice.toFixed(2)}`
                        : `₾${minPrice.toFixed(2)} - ₾${maxPrice.toFixed(2)}`
                    })()}
                  </p>
                  <div className="mb-3 space-y-1">
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-[16px] ${
                        product.approvalStatus === 'APPROVED'
                          ? ' text-green-500'
                          : product.approvalStatus === 'REJECTED'
                            ? ' text-red-500'
                            : ' text-yellow-500'
                      }`}
                    >
                      {getProductApprovalLabel(product.approvalStatus)}
                    </span>
                    {product.approvalStatus === 'REJECTED' && product.rejectionReason && (
                      <p className="text-[16px] text-red-700 font-medium">
                        მიზეზი: {product.rejectionReason}
                      </p>
                    )}
                    {product.approvalStatus !== 'APPROVED' && (
                      <p className="text-[16px] text-gray-600">
                        პროდუქტი გამოჩნდება მომხმარებლებისთვის დამტკიცების შემდეგ.
                      </p>
                    )}
                  </div>
                  <p className="md:text-[18px] text-[16px] text-black mb-3">დამატებული: {new Date(product.createdAt).toLocaleDateString('ka-GE')}</p>

                  <div className="mb-3">
                    <label className="block md:text-[18px] text-[16px] font-medium text-black mb-1">სტატუსი</label>
                    <select
                      value={product.status}
                      onChange={(e) => handleStatusChange(product.id, e.target.value)}
                      className="w-full px-2 py-1 md:text-[18px] text-[16px] border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black"
                    >
                      <option className="md:text-[18px] text-[16px]" value="AVAILABLE">თავისუფალია</option>
                      <option className="md:text-[18px] text-[16px]" value="RENTED">გაქირავებულია</option>
                      <option className="md:text-[18px] text-[16px]" value="RESERVED">დაჯავშნილია</option>
                      <option className="md:text-[18px] text-[16px]" value="MAINTENANCE">რესტავრაციაზეა</option>
                    </select>
                  </div>

                  <div className="mt-4 flex space-x-2">
                    <Link
                      href={`/account/products/${product.id}/edit`}
                      className="flex-1 px-3 py-2 bg-black text-white rounded-lg hover:bg-gray-800 font-bold transition-colors md:text-[18px] text-[16px] text-center"
                    >
                      რედაქტირება
                    </Link>
                    <button
                      onClick={() => handleDeleteProduct(product.id)}
                      className="cursor-pointer"
                    >
                    <Trash2 className="w-7 h-7" />
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
    if (hasActiveRentals) {
      showToast('თქვენ გაქვთ აქტიური ქირები. გთხოვთ დააბრუნოთ პროდუქტები და შემდეგ სცადოთ პროფილის წაშლა.', 'warning')
      return
    }

    const confirmMessage = 'ნამდვილად გსურთ თქვენი პროფილის გაუქმება?'

    if (!confirm(confirmMessage)) {
      return
    }

    // Double confirmation
    const secondConfirm = prompt('გთხოვთ დაწეროთ "წაშლა" დასადასტურებლად:')
    if (secondConfirm !== 'წაშლა') {
      showToast('პროფილის წაშლა გაუქმებულია', 'info')
      return
    }

    try {
      const response = await fetch('/api/user/profile', {
        method: 'DELETE'
      })

      const data = await response.json()

      if (response.ok && data.success) {
        showToast('თქვენი პროფილი წარმატებით წაიშალა', 'success')
        // Sign out and redirect to home
        await signOut({ callbackUrl: '/' })
      } else {
        showToast(data.error || 'შეცდომა პროფილის წაშლისას', 'error')
      }
    } catch (error) {
      console.error('Error deleting profile:', error)
      showToast('შეცდომა პროფილის წაშლისას', 'error')
    }
  }

  const renderSettingsTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="md:text-[20px] text-[18px] font-bold text-black mb-6">პარამეტრები</h3>
        {/* Profile edit form */}
        <ProfileSettingsForm hasActiveRentals={hasActiveRentals} checkingRentals={checkingRentals} />
      </div>
    </div>
  )

  const renderChatsTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col lg:flex-row h-[calc(100vh-300px)]">
          {/* Chat Rooms List */}
          <div className="lg:w-1/3 border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h3 className="md:text-[20px] text-[18px] font-bold text-black">ჩათები</h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loadingChats ? (
                <div className="p-4 text-center">
                  <div className="w-8 h-8 border-4 border-gray-300 border-t-[#1B3729] rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-black md:text-[16px] text-[14px]">იტვირთება...</p>
                </div>
              ) : chatRooms.length === 0 ? (
                <div className="p-4 text-center">
                  <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-black md:text-[16px] text-[14px]">ჩათები არ არის</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {chatRooms.map((room) => {
                    const otherUser = session?.user?.id === room.userId ? room.admin_name : room.user_name
                    const otherUserEmail = session?.user?.id === room.userId ? room.admin_email : room.user_email
                    const isSelected = selectedChatRoom?.id === room.id
                    
                    return (
                      <button
                        key={room.id}
                        onClick={() => setSelectedChatRoom(room)}
                        className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                          isSelected ? 'bg-[#1B3729] text-white' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className={`font-semibold md:text-[16px] text-[14px] truncate ${
                              isSelected ? 'text-white' : 'text-black'
                            }`}>
                              {otherUser || otherUserEmail || 'უცნობი მომხმარებელი'}
                            </p>
                            {room.last_message && (
                              <p className={`mt-1 truncate md:text-[14px] text-[12px] ${
                                isSelected ? 'text-gray-200' : 'text-gray-600'
                              }`}>
                                {room.last_message}
                              </p>
                            )}
                          </div>
                          {room.message_count > 0 && (
                            <span className={`ml-2 px-2 py-1 rounded-full text-xs font-bold ${
                              isSelected ? 'bg-white text-[#1B3729]' : 'bg-[#1B3729] text-white'
                            }`}>
                              {room.message_count}
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Chat Messages */}
          <div className="lg:w-2/3 flex flex-col">
            {selectedChatRoom ? (
              <>
                <div className="p-4 border-b border-gray-200">
                  <h3 className="md:text-[18px] text-[16px] font-semibold text-black">
                    {session?.user?.id === selectedChatRoom.userId 
                      ? selectedChatRoom.admin_name || selectedChatRoom.admin_email || 'ავტორი'
                      : selectedChatRoom.user_name || selectedChatRoom.user_email || 'მომხმარებელი'}
                  </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {chatMessages.map((message) => {
                    const isFromMe = message.userId === session?.user?.id && !message.isFromAdmin
                    const isFromOther = !isFromMe
                    
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isFromMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg px-4 py-2 ${
                            isFromMe
                              ? 'bg-[#1B3729] text-white'
                              : 'bg-gray-200 text-black'
                          }`}
                        >
                          <p className="md:text-[16px] text-[14px]">{message.content}</p>
                          <p className={`text-xs mt-1 ${
                            isFromMe ? 'text-gray-300' : 'text-gray-600'
                          }`}>
                            {new Date(message.createdAt).toLocaleString('ka-GE')}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="p-4 border-t border-gray-200">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          sendChatMessage()
                        }
                      }}
                      placeholder="დაწერეთ შეტყობინება..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B3729] md:text-[16px] text-[14px]"
                    />
                    <button
                      onClick={sendChatMessage}
                      disabled={!newMessage.trim() || sendingMessage}
                      className="px-6 py-2 bg-[#1B3729] text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity md:text-[16px] text-[14px] font-medium"
                    >
                      {sendingMessage ? '...' : 'გაგზავნა'}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-black md:text-[18px] text-[16px]">აირჩიეთ ჩათი საუბრის დასაწყებად</p>
                </div>
              </div>
            )}
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
      case 'sales':
        return renderSalesTab()
      case 'Contact':
        return (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="md:text-[20px] text-[18px] font-bold text-black">კონტაქტი</h2>
            <ContactForm />
          </div>
        )
      case 'chats':
        return renderChatsTab()
      case 'products':
        return renderProductsTab()
      case 'settings':
        return renderSettingsTab()
      default:
        return renderProfileTab()
    }
  }

  return (
    <div className="min-h-screen ">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-black">ჩემი ანგარიში</h1>
              <p className="text-black md:text-[18px] text-[16px] mt-1">მოგესალმებით, {session.user.name}</p>
            </div>
            <Link
              href="/"
              className="px-4 py-2 bg-[#1B3729] md:text-[18px] text-[16px] font-bold uppercase tracking-widest text-white rounded-lg font-bold uppercase tracking-wide  transition-colors"
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
                    className={`w-full cursor-pointer flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors text-[16px]  ${activeTab === tab.id
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

function ProfileSettingsForm({ hasActiveRentals, checkingRentals }: { hasActiveRentals: boolean; checkingRentals: boolean }) {
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
    iban: '',
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
            iban: data.user.iban || '',
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
          iban: form.iban,
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
        iban: data.user.iban,
      })
      setSuccess('პროფილი განახლდა')
    } catch (err: unknown) {
      const message = typeof err === 'object' && err && 'message' in err ? String((err as { message?: string }).message) : 'შეცდომა'
      setError(message)
    } finally {
      setSaving(false)
    }
  }
  const handleDeleteProfile = async () => {
    if (hasActiveRentals) {
      showToast('თქვენ გაქვთ აქტიური ქირები. გთხოვთ დააბრუნოთ პროდუქტები და შემდეგ სცადოთ პროფილის წაშლა.', 'warning')
      return
    }

    const confirmMessage = 'ნამდვილად გსურთ თქვენი პროფილის გაუქმება?'

    if (!confirm(confirmMessage)) {
      return
    }

    // Double confirmation
    const secondConfirm = prompt('გთხოვთ დაწეროთ "წაშლა" დასადასტურებლად:')
    if (secondConfirm !== 'წაშლა') {
      showToast('პროფილის წაშლა გაუქმებულია', 'info')
      return
    }

    try {
      const response = await fetch('/api/user/profile', {
        method: 'DELETE'
      })

      const data = await response.json()

      if (response.ok && data.success) {
        showToast('თქვენი პროფილი წარმატებით წაიშალა', 'success')
        // Sign out and redirect to home
        await signOut({ callbackUrl: '/' })
      } else {
        showToast(data.error || 'შეცდომა პროფილის წაშლისას', 'error')
      }
    } catch (error) {
      console.error('Error deleting profile:', error)
      showToast('შეცდომა პროფილის წაშლისას', 'error')
    }
  }
  const onImageChange = async (urls: string[]) => {
    setForm({ ...form, image: urls[0] || '' })
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-black rounded-full animate-spin mx-auto"></div>
        <p className="text-black mt-2">იტვირთება...</p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error && <div className="p-3 rounded bg-red-50 text-red-800 text-[16px]">{error}</div>}
      {success && <div className="p-3 rounded bg-green-50 text-green-800 text-[16px]">{success}</div>}

      

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block md:text-[18px] text-[16px] font-medium text-black mb-2">სახელი</label>
          <input name="name" value={form.name} onChange={onChange} className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent" />
        </div>

        <div>
          <label className="block md:text-[18px] text-[16px] font-medium text-black mb-2">გვარი</label>
          <input name="lastName" value={form.lastName} onChange={onChange} className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent" />
        </div>
      </div>

      <div>
        <label className="block md:text-[18px] text-[16px] font-medium text-black mb-2">ელფოსტა</label>
        <input type="email" name="email" value={form.email} onChange={onChange} className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent" />
      </div>

      <div>
        <label className="block md:text-[18px] text-[16px] font-medium text-black mb-2">ტელეფონი</label>
        <input name="phone" value={form.phone} onChange={onChange} className="w-full px-4 py-3 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent" />
      </div>

      <div>
        <label className="block md:text-[18px] text-[16px] font-medium text-black mb-2">
          ბანკის IBAN <span className="text-red-600">*</span>
        </label>
        <input
          name="iban"
          value={form.iban}
          onChange={(e) => {
            const value = e.target.value.toUpperCase()
            setForm({ ...form, iban: value })
            setError(null)
            setSuccess(null)
          }}
          required
          placeholder="მაგ: GE00TB0000000000000000"
          className="w-full uppercase px-4 py-3 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
        />
        <p className="text-black md:text-[18px] text-[16px] mt-1">
          IBAN აუცილებელია გაყიდვებიდან თანხის მისაღებად. გამოიყენეთ მხოლოდ ქართული (GE) IBAN.
        </p>
      </div>

      <div>
        <label className="block md:text-[18px] text-[16px] font-medium text-black mb-2">ადგილმდებარეობა</label>
        <input name="location" value={form.location} onChange={onChange} className="w-full px-4 py-3 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent" />
      </div>

      <div>
        <label className="block md:text-[18px] text-[16px] font-medium text-black mb-2">მისამართი</label>
        <input name="address" value={form.address} onChange={onChange} className="w-full px-4 py-3 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent" />
      </div>

      <div>
        <label className="block md:text-[18px] text-[16px] font-medium text-black mb-2">საფოსტო ინდექსი</label>
        <input name="postalIndex" value={form.postalIndex} onChange={onChange} className="w-full px-4 py-3 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block md:text-[18px] text-[16px] font-medium text-black mb-2">სქესი</label>
          <select name="gender" value={form.gender} onChange={onChange} className="w-full px-4 py-3 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent">
            <option value="">აირჩიეთ სქესი</option>
            <option value="MALE">კაცი</option>
            <option value="FEMALE">ქალი</option>

          </select>
        </div>

        <div>
          <label className="block md:text-[18px] text-[16px] font-medium text-black mb-2">დაბადების თარიღი</label>
          <input type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={onChange} className="w-full px-4 py-3 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent" />
        </div>
      </div>

      <div>
        <label className="block md:text-[18px] text-[16px] font-medium text-black mb-2">პირადობის ნომერი</label>
        <input name="personalId" value={form.personalId} disabled className="w-full px-4 py-3 border text-black border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed" />
        <p className="md:text-[18px] text-[16px] text-black mt-1">პირადობის ნომერი არ შეიძლება შეიცვალოს</p>
      </div>


      <button type="submit" disabled={saving} className="w-full md:w-[30%] md:text-[18px] text-[16px] font-bold bg-black text-white py-3 px-6 rounded-lg  hover:bg-gray-800 transition-colors disabled:opacity-50">
        {saving ? 'ინახება...' : 'პროფილის შენახვა'}
      </button>

      {checkingRentals ? (
        <div className="w-full md:w-[30%] px-6 py-3 text-center bg-gray-200 text-gray-600 font-bold rounded-lg">
          <span className="md:text-[18px] text-[16px]">შემოწმება...</span>
        </div>
      ) : hasActiveRentals ? (
        <div className="w-full md:w-[30%]">
          <div className="mb-3 p-3 border-2 border-yellow-400 bg-yellow-50 text-yellow-800 rounded-lg md:text-[16px] text-[14px]">
            თქვენ გაქვთ აქტიური ქირები. პროფილის წაშლა შესაძლებელია მხოლოდ მაშინ, როცა დააბრუნებთ ყველა პროდუქტს.
          </div>
          <button
            disabled
            className="flex w-full items-center space-x-2 px-6 py-3 text-center items-center justify-center bg-gray-400 text-white font-bold rounded-lg cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            <span className="md:text-[18px] text-[16px]">პროფილის გაუქმება</span>
          </button>
        </div>
      ) : (
        <button
          onClick={handleDeleteProfile}
          className="flex w-full md:w-[30%] items-center space-x-2 px-6 py-3 text-center items-center justify-center bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          <span className="md:text-[18px] text-[16px]">პროფილის გაუქმება</span>
        </button>
      )}
    </form>
  )
}

const AccountPage = () => {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-gray-300 border-t-[#1B3729] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-black">იტვირთება...</p>
        </div>
      </div>
    }>
      <AccountPageContent />
    </Suspense>
  )
}

export default AccountPage
