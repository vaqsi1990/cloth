'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from '@/component/AppImage'
import { User, Package, ShoppingCart, Settings, MapPin, Phone, Mail, Camera, MessageCircle, Search, Trash2, TrendingUp, ClipboardList, Ticket, Copy, ArrowLeft, ChevronLeft, ChevronRight, Bell, BellOff } from 'lucide-react'
import ImageUpload from '@/component/CloudinaryUploader'
import UploadLoadingIndicator from '@/component/UploadLoadingIndicator'
import ContactForm from '@/component/ContactForm'
import RentalInquiriesPanel from '@/components/RentalInquiriesPanel'
import { showToast } from '@/utils/toast'
import { formatDate } from '@/utils/dateUtils'
import {
  fromPrismaDeliverySpeed,
  getDeliverySpeedLabel,
} from '@/lib/delivery'
import {
  getCartItemBuyerSavings,
  getCartItemPayablePrice,
} from '@/lib/cart-item-pricing'
import { formatOwnerProductPriceLabel, processExpiredDiscount } from '@/lib/discount-helpers'
import { getSellerApprovalLabel } from '@/lib/product-approval'
import {
  broadcastProductStatusUpdate,
  type ProductStatusValue,
} from '@/lib/product-status-sync'
import ChatTypingIndicator from '@/components/ChatTypingIndicator'
import ChatUnreadBadge from '@/components/ChatUnreadBadge'
import OrderItemSaleStatusActions from '@/components/OrderItemSaleStatusActions'
import { ORDER_ITEM_RETURNED_STATUS_LABEL } from '@/lib/order-item-fulfillment-status'
import ChatMessageContent from '@/components/ChatMessageContent'
import ChatImageUploadButton from '@/components/ChatImageUploadButton'
import ChatPendingImagePreview from '@/components/ChatPendingImagePreview'
import { canSendChatMessage } from '@/lib/chat-message'
import { useChatTyping } from '@/hooks/useChatTyping'
import { useChatAutoScroll } from '@/hooks/useChatAutoScroll'
import { isValidGeorgianIban } from '@/lib/iban'
import { useUserChatUnreadCount } from '@/hooks/useUserChatUnreadCount'
import { useUserChatNotification } from '@/components/UserChatNotificationProvider'
import {
  accountSectionPath,
  buildAccountChatsPath,
  type AccountSection,
} from '@/lib/account-routes'
import { isSellerIncomeOrderStatus } from '@/lib/sold-products'
import { isValidPhone } from '@/lib/phone'
import {
  formatSnapshotGender,
  type OrderItemProductSnapshot,
} from '@/lib/order-item-snapshot'
import {
  PAYMENT_HOLD_MAX_DAYS,
  getPaymentHoldExpiresAt,
  getPaymentHoldDaysRemaining,
} from '@/lib/payment-hold-config'
import { getProductThumbnailUrl } from '@/lib/product-image-url'

interface OrderItem {
  id?: number
  productId?: number | null
  productName: string
  image?: string | null
  size: string | null
  price: number
  quantity: number
  isRental?: boolean | null
  rentalStartDate?: string | null
  rentalEndDate?: string | null
  rentalDays?: number | null
  sellerReportedOutOfStock?: boolean
  sellerReportedAt?: string | null
  sellerReportedDamaged?: boolean
  sellerReportedDamagedAt?: string | null
  sellerMarkedTransferred?: boolean
  sellerMarkedTransferredAt?: string | null
  sellerCanceledItem?: boolean
  sellerCanceledAt?: string | null
  product?: {
    id: number
    userId?: string | null
    user?: { id: string; name: string | null } | null
    images?: Array<{ url: string }>
    discount?: number | null
    discountDays?: number | null
    discountStartDate?: string | null
  } | null
}

interface Order {
  id: number
  total: number
  status: string
  paymentHoldStatus?: string | null
  paymentHoldBlockedAt?: string | null
  updatedAt?: string
  createdAt: string
  address?: string
  city?: string | null
  phone?: string
  email?: string | null
  paymentMethod?: string | null
  deliveryPrice?: number | null
  deliverySpeed?: string | null
  deliveryCity?: { name: string } | null
  items?: OrderItem[]
}

interface SaleOrderItem {
  id: number
  isRental?: boolean | null
  rentalStartDate?: string | null
  rentalEndDate?: string | null
  rentalDays?: number | null
  productName: string
  size: string | null
  price: number
  sellerUnitPrice?: number
  sellerLineTotal?: number
  quantity: number
  image?: string | null
  snapshot?: OrderItemProductSnapshot | null
  sellerReportedOutOfStock?: boolean
  sellerReportedAt?: string | null
  sellerReportedDamaged?: boolean
  sellerReportedDamagedAt?: string | null
  sellerMarkedTransferred?: boolean
  sellerMarkedTransferredAt?: string | null
  sellerCanceledItem?: boolean
  sellerCanceledAt?: string | null
}

interface SaleOrder {
  id: number
  total: number
  sellerTotal?: number
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
  isNew?: boolean
  isSecondHand?: boolean
  images?: Array<{ url: string }>
  variants?: Array<{ price: number; size: string; id: number; imageUrl?: string | null }>
  rentalPriceTiers?: Array<{ minDays: number; pricePerDay: number }>
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED'
  rejectionReason?: string | null
}

interface UserVoucherItem {
  id: number
  code: string
  discountAmount: number
  remainingAmount?: number
  minOrderAmount: number | null
  expiresAt: string | null
  message: string | null
  isUsed: boolean
  isActive: boolean
  isExpired: boolean
  isAvailable: boolean
  receivedAt: string
}

interface AccountChatRoom {
  id: number
  userId: string | null
  adminId?: string | null
  productId?: number | null
  orderId?: number | null
  product_name?: string | null
  chatKind?: 'product' | 'live_support'
  user_name?: string
  user_email?: string
  admin_name?: string
  admin_email?: string
  last_message?: string
  is_unread?: boolean
}

type VerificationState = 'PENDING' | 'APPROVED' | 'REJECTED' | null

function getOrderStatusLabel(status: string, paymentHoldStatus?: string | null) {
  if (status === 'PAID' && paymentHoldStatus === 'BLOCKED') return 'თანხა დაბლოკილია'
  if (status === 'PAID' && paymentHoldStatus === 'CAPTURED') return 'გადახდილი'
  if (status === 'PAID') return 'გადახდილი'
  if (status === 'SHIPPED') return 'გაგზავნილი'
  if (status === 'CANCELED') return 'გაუქმებული'
  if (status === 'REFUNDED') return 'დაბრუნებული'
  return 'მოლოდინში'
}

function getOrderStatusClass(status: string, paymentHoldStatus?: string | null) {
  if (status === 'PAID' && paymentHoldStatus === 'BLOCKED') return 'text-amber-600'
  if (status === 'PAID') return 'text-green-500'
  if (status === 'SHIPPED') return 'text-blue-500'
  if (status === 'CANCELED') return 'text-red-500'
  if (status === 'REFUNDED') return 'text-black'
  return 'text-yellow-500'
}

type SaleOrderStatusItem = {
  sellerCanceledItem?: boolean
  sellerMarkedTransferred?: boolean
  sellerReportedOutOfStock?: boolean
  sellerReportedDamaged?: boolean
}

function saleOrderHasActiveItems(items: SaleOrderStatusItem[] = []) {
  return items.some(
    (item) =>
      !item.sellerCanceledItem &&
      !item.sellerMarkedTransferred &&
      !item.sellerReportedOutOfStock &&
      !item.sellerReportedDamaged,
  )
}

function saleOrderItemsAllCanceled(items: SaleOrderStatusItem[] = []) {
  return items.length > 0 && items.every((item) => item.sellerCanceledItem === true)
}

function getSaleOrderStatusDisplay(order: {
  status: string
  items?: SaleOrderStatusItem[]
}) {
  const items = order.items ?? []

  if (order.status === 'REFUNDED') {
    return { label: 'დაბრუნებული', className: 'text-black' }
  }
  if (order.status === 'CANCELED') {
    return { label: 'გაუქმებული', className: 'text-red-500' }
  }
  if (saleOrderItemsAllCanceled(items)) {
    return { label: ORDER_ITEM_RETURNED_STATUS_LABEL, className: 'text-red-500' }
  }
  if (order.status === 'SHIPPED') {
    return { label: 'გაგზავნილი', className: 'text-blue-500' }
  }
  if (order.status === 'PAID') {
    return {
      label: saleOrderHasActiveItems(items) ? 'გადახდილი' : ORDER_ITEM_RETURNED_STATUS_LABEL,
      className: saleOrderHasActiveItems(items) ? 'text-green-500' : 'text-red-500',
    }
  }
  return { label: 'მოლოდინში', className: 'text-yellow-500' }
}

function getOrderItemDiscount(item: OrderItem): number {
  const product = item.product ? processExpiredDiscount(item.product) : null
  return product?.discount && product.discount > 0 ? product.discount : 0
}

function getOrderItemPayablePrice(item: OrderItem): number {
  return getCartItemPayablePrice(item.price, getOrderItemDiscount(item))
}

function getOrderItemBuyerSavings(item: OrderItem): number {
  return getCartItemBuyerSavings(item.price, getOrderItemDiscount(item))
}

function getAccountChatDisplayName(
  room: AccountChatRoom,
  viewerUserId: string | undefined,
): string {
  if (room.chatKind === 'live_support') {
    return room.admin_name || 'საფორთის მხარდაჭერა'
  }

  if (viewerUserId === room.userId) {
    return room.admin_name || room.admin_email || 'ავტორი'
  }

  return room.user_name || room.user_email || 'მომხმარებელი'
}

function getOrderChatKey(orderId: number, productId: number) {
  return `${orderId}-${productId}`
}

const PRODUCTS_PER_PAGE = 16

const AccountSectionContent = ({ section }: { section: AccountSection }) => {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
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
  const [totalSellerIncome, setTotalSellerIncome] = useState(0)
  const [products, setProducts] = useState<ProductItem[]>([])
  const [productsPage, setProductsPage] = useState(1)
  const [productsTotalPages, setProductsTotalPages] = useState(1)
  const [productsTotalCount, setProductsTotalCount] = useState(0)
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [contactingChatKey, setContactingChatKey] = useState<string | null>(null)
  const [loadingSales, setLoadingSales] = useState(false)
  const [reportingOutOfStockItemId, setReportingOutOfStockItemId] = useState<number | null>(null)
  const [reportingDamagedItemId, setReportingDamagedItemId] = useState<number | null>(null)
  const [salesTransferFilter, setSalesTransferFilter] = useState<
    'ALL' | 'TRANSFERRED' | 'PENDING' | 'CANCELED'
  >('ALL')
  const [ordersStatusFilter, setOrdersStatusFilter] = useState<'ALL' | 'ACTIVE'>('ALL')
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [resubmittingProductId, setResubmittingProductId] = useState<number | null>(null)
  const [vouchers, setVouchers] = useState<UserVoucherItem[]>([])
  const [loadingVouchers, setLoadingVouchers] = useState(false)
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
  const [chatRooms, setChatRooms] = useState<AccountChatRoom[]>([])
  const [loadingChats, setLoadingChats] = useState(false)
  const [selectedChatRoom, setSelectedChatRoom] = useState<AccountChatRoom | null>(null)
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [pendingChatImageUrl, setPendingChatImageUrl] = useState<string | null>(null)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [otherPartyTyping, setOtherPartyTyping] = useState(false)
  const selectedChatRoomIdRef = useRef<number | null>(null)
  const preferredChatRoomIdRef = useRef<number | null>(null)
  const chatMessagesFetchIdRef = useRef(0)
  const chatMessagesContainerRef = useChatAutoScroll(chatMessages, {
    roomKey: selectedChatRoom?.id ?? null,
  })
  const productsPageRef = useRef(1)
  const productsFetchIdRef = useRef(0)
  const { notifyTyping, stopTyping } = useChatTyping({
    chatRoomId: selectedChatRoom?.id,
    enabled: !!selectedChatRoom,
  })
  const { unreadCount: polledChatUnread, refresh: refreshChatUnread } = useUserChatUnreadCount(
    !!session?.user?.id,
  )
  const {
    soundEnabled: chatSoundEnabled,
    toggleSound: toggleChatSound,
    setActiveChatRoomId,
    acknowledgeActiveChat,
  } = useUserChatNotification()
  const chatsUnreadCount = Math.max(
    polledChatUnread,
    chatRooms.filter((room) => room.is_unread).length,
  )
  const isSeller = userStats.productsCount > 0
  // Show verification for all non-admin users who haven't been approved yet
  const sellerNeedsVerification = true // Always show for non-admin users
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
    if (section === 'orders' && session?.user?.id) {
      fetchOrders()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section])

  // Fetch sales when tab changes to sales
  useEffect(() => {
    if (section === 'sales' && session?.user?.id) {
      fetchSales()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section])

  // Fetch products when tab changes to products (preserve current page)
  useEffect(() => {
    if (section === 'products' && session?.user?.id) {
      fetchProducts(productsPageRef.current)
      fetch('/api/user/profile')
        .then((r) => r.json())
        .then((d) => {
          if (d?.success && d?.user) {
            setUserIban(d.user.iban || null)
          }
        })
        .catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section])

  // Fetch verification only when tab changes to profile
  useEffect(() => {
    if (section === 'profile' && session?.user?.id) {
      fetchVerification()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section])

  useEffect(() => {
    if (section === 'vouchers' && session?.user?.id) {
      fetchVouchers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section])

  // Check for active rentals when settings tab is active
  useEffect(() => {
    if (section === 'settings' && session?.user?.id) {
      checkActiveRentals()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section])

  // Confirm VIP payment after BOG redirect (callback may not hit local/dev)
  useEffect(() => {
    if (section !== 'products') return

    const vipSuccess = searchParams.get('vipSuccess')
    const productIdParam = searchParams.get('productId')

    if (vipSuccess !== '1' || !productIdParam) return

    const productId = parseInt(productIdParam, 10)
    if (Number.isNaN(productId)) return

    const confirmVip = async () => {
      try {
        const response = await fetch('/api/product-vip/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId }),
        })
        const result = await response.json()

        if (result.success) {
          showToast('VIP სტატუსი წარმატებით გააქტიურდა!', 'success')
        } else if (result.status === 'BOG_CHECK_FAILED') {
          showToast('VIP გადახდის დადასტურება ვერ მოხერხდა. სცადეთ მოგვიანებით.', 'error')
        } else if (result.status !== 'ALREADY_ACTIVE') {
          showToast('VIP გადახდა ჯერ არ არის დადასტურებული', 'error')
        }
      } catch {
        showToast('VIP გადახდის დადასტურება ვერ მოხერხდა', 'error')
      } finally {
        router.replace(accountSectionPath('products'))
      }
    }

    void confirmVip()
  }, [section, searchParams, router])

  // Keep chat list in sync on the chats page
  useEffect(() => {
    if (section !== 'chats' || !session?.user?.id) return

    void fetchChatRooms({ silent: false })
    const interval = setInterval(() => {
      void fetchChatRooms({ silent: true })
    }, 10000)

    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, session?.user?.id])

  // Select chat room when chatRooms are loaded and chat param exists
  useEffect(() => {
    if (section !== 'chats') return

    const chatParam = searchParams.get('chat')
    if (!chatParam || chatRooms.length === 0) return

    const chatId = parseInt(chatParam, 10)
    if (isNaN(chatId)) return

    const room = chatRooms.find((r) => r.id === chatId)
    if (room && selectedChatRoom?.id !== chatId) {
      setSelectedChatRoom(room)
      preferredChatRoomIdRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, chatRooms, searchParams])

  // Fetch messages when chat room is selected on the chats tab
  useEffect(() => {
    selectedChatRoomIdRef.current = selectedChatRoom?.id ?? null

    if (section !== 'chats') {
      setActiveChatRoomId(null)
      setChatMessages([])
      setOtherPartyTyping(false)
      return
    }

    setActiveChatRoomId(selectedChatRoom?.id ?? null)

    if (!selectedChatRoom?.id) {
      setChatMessages([])
      setOtherPartyTyping(false)
      return
    }

    setChatMessages([])
    setOtherPartyTyping(false)
    fetchChatMessages(selectedChatRoom.id)
    const interval = setInterval(() => {
      fetchChatMessages(selectedChatRoom.id)
    }, 3000)
    return () => {
      clearInterval(interval)
      setActiveChatRoomId(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, selectedChatRoom?.id, setActiveChatRoomId])

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
      const productsResponse = await fetch('/api/user/products?limit=1')
      const productsData = await productsResponse.json()
      const productsCount = productsData.success
        ? (productsData.totalCount ?? productsData.products.length)
        : 0

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

  const fetchChatRooms = async (options?: { silent?: boolean }) => {
    try {
      if (!options?.silent) {
        setLoadingChats(true)
      }
      const response = await fetch('/api/chat')
      const data = await response.json()
      if (data.success) {
        const rooms: AccountChatRoom[] = data.chatRooms || []
        setChatRooms(rooms)

        const urlChatParam = searchParams.get('chat')
        const urlChatId = urlChatParam ? parseInt(urlChatParam, 10) : NaN
        const targetChatId =
          preferredChatRoomIdRef.current ??
          (!isNaN(urlChatId) ? urlChatId : null)

        if (targetChatId != null) {
          const room = rooms.find((r) => r.id === targetChatId)
          if (room) {
            setSelectedChatRoom(room)
            preferredChatRoomIdRef.current = null
          }
        } else {
          setSelectedChatRoom((current) => {
            if (current && rooms.some((room) => room.id === current.id)) {
              return current
            }
            const urlChatId = urlChatParam ? parseInt(urlChatParam, 10) : NaN
            if (!isNaN(urlChatId)) {
              const urlRoom = rooms.find((room) => room.id === urlChatId)
              if (urlRoom) return urlRoom
            }
            return null
          })
        }

        void refreshChatUnread()
      }
    } catch (error) {
      console.error('Error fetching chat rooms:', error)
    } finally {
      if (!options?.silent) {
        setLoadingChats(false)
      }
    }
  }

  const fetchChatMessages = async (chatRoomId: number) => {
    const fetchId = ++chatMessagesFetchIdRef.current
    try {
      const response = await fetch(`/api/chat/${chatRoomId}`)
      const data = await response.json()
      if (
        !response.ok ||
        !data.success
      ) {
        if (
          fetchId === chatMessagesFetchIdRef.current &&
          selectedChatRoomIdRef.current === chatRoomId
        ) {
          showToast(
            data.error === 'Chat room not found or access denied'
              ? 'ჩათი ვერ მოიძებნა ან წვდომა შეზღუდულია'
              : data.message || 'შეტყობინებების ჩატვირთვა ვერ მოხერხდა',
            'error',
          )
        }
        return
      }

      if (
        fetchId === chatMessagesFetchIdRef.current &&
        selectedChatRoomIdRef.current === chatRoomId
      ) {
        setChatMessages(data.messages || [])
        setOtherPartyTyping(Boolean(data.otherPartyTyping))
        setChatRooms((prev) =>
          prev.map((room) =>
            room.id === chatRoomId ? { ...room, is_unread: false } : room,
          ),
        )
        acknowledgeActiveChat()
        void refreshChatUnread()
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const sendChatMessage = async () => {
    if (!canSendChatMessage(newMessage, pendingChatImageUrl) || !selectedChatRoom) return

    setSendingMessage(true)
    const messageToSend = newMessage.trim()
    const imageToSend = pendingChatImageUrl
    setNewMessage('')
    setPendingChatImageUrl(null)
    stopTyping()

    try {
      const response = await fetch(`/api/chat/${selectedChatRoom.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: messageToSend,
          ...(imageToSend ? { imageUrl: imageToSend } : {}),
        })
      })

      const data = await response.json()
      if (data.success) {
        // Refresh messages
        fetchChatMessages(selectedChatRoom.id)
        // Refresh chat rooms to update last message
        fetchChatRooms()
      } else {
        const errorMessage =
          data.error === 'Chat room not found or access denied'
            ? 'ჩათი ვერ მოიძებნა ან წვდომა შეზღუდულია'
            : data.error || 'შეცდომა შეტყობინების გაგზავნისას'
        showToast(errorMessage, 'error')
        setNewMessage(messageToSend) // Restore message on error
        setPendingChatImageUrl(imageToSend)
      }
    } catch (error) {
      console.error('Error sending message:', error)
      showToast('შეცდომა შეტყობინების გაგზავნისას', 'error')
      setNewMessage(messageToSend) // Restore message on error
      setPendingChatImageUrl(imageToSend)
    } finally {
      setSendingMessage(false)
    }
  }

  const handleDeleteChat = async (
    chatRoomId: number,
    chatKind: 'product' | 'live_support',
    e: React.MouseEvent,
  ) => {
    e.stopPropagation() // Prevent selecting the chat room when clicking delete

    if (chatKind !== 'live_support') return

    if (!confirm('ნამდვილად გსურთ ამ საუბრის დახურვა?')) {
      return
    }

    try {
      const response = await fetch(`/api/chat/${chatRoomId}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      if (data.success) {
        const deletedRoom = chatRooms.find((room) => room.id === chatRoomId)
        showToast('საუბარი წარმატებით დახურულია', 'success')
        setChatRooms(chatRooms.filter(room => room.id !== chatRoomId))
        if (selectedChatRoom?.id === chatRoomId) {
          setSelectedChatRoom(null)
          setChatMessages([])
        }
        if (
          deletedRoom?.chatKind === 'live_support' &&
          typeof window !== 'undefined'
        ) {
          localStorage.removeItem('liveSupportChatRoomId')
        }
        void refreshChatUnread()
      } else {
        showToast(data.error || 'შეცდომა ჩათის წაშლისას', 'error')
      }
    } catch (error) {
      console.error('Error deleting chat:', error)
      showToast('შეცდომა ჩათის წაშლისას', 'error')
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
          image: urls[0] || null,
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
        if (typeof window !== 'undefined') {
          const savedEntrepreneur = localStorage.getItem('entrepreneurCertificateUrl')
          setEntrepreneurCertificateUrl(savedEntrepreneur || data.verification?.entrepreneurCertificateUrl || null)
        } else {
          setEntrepreneurCertificateUrl(data.verification?.entrepreneurCertificateUrl || null)
        }
      }
    } catch (e) {
      console.error('Error fetching verification:', e)
    } finally {
      setVerifLoading(false)
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

  const saveIbanVerification = async () => {
    try {
      if (!isValidGeorgianIban(userIban)) {
        showToast('გთხოვთ შეიყვანოთ სწორი IBAN', 'warning')
        return
      }
      
      setSavingVerification(true)

      const res = await fetch('/api/user/verification', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ iban: userIban })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setVerification(data.verification)
        setUserVerified(false)
        showToast('IBAN წარმატებით შეინახა', 'success')
        await update({ iban: userIban })
      } else {
        showToast(data.error || 'შეცდომა IBAN-ის შენახვისას', 'error')
      }
    } catch (e) {
      console.error('Error saving IBAN verification:', e)
      showToast('შეცდომა IBAN-ის შენახვისას', 'error')
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
        body: JSON.stringify({ entrepreneurCertificateUrl })
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

  const openSellerChat = async (
    productId: number | null | undefined,
    productName: string,
    orderId: number,
    sellerName?: string | null,
  ) => {
    if (!productId) {
      showToast('პროდუქტი ვერ მოიძებნა', 'error')
      return
    }

    if (!session?.user?.id) {
      showToast('გთხოვთ შეხვიდეთ სისტემაში', 'warning')
      return
    }

    setContactingChatKey(getOrderChatKey(orderId, productId))
    try {
      const response = await fetch(`/api/chat/order/${orderId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          message: `გამარჯობა! მაქვს შეკვეთა #${orderId} პროდუქტზე „${productName}".`,
        }),
      })
      const data = await response.json()

      if (!data.success || !data.chatRoomId) {
        showToast(data.error || 'შეცდომა ჩათის გახსნისას', 'error')
        return
      }

      const chatRoomId = data.chatRoomId as number
      preferredChatRoomIdRef.current = chatRoomId

      setSelectedChatRoom({
        id: chatRoomId,
        userId: session.user.id,
        admin_name: sellerName ?? undefined,
        productId,
        product_name: productName,
        orderId,
      })

      router.push(buildAccountChatsPath(chatRoomId))

      await fetchChatRooms()

      if (sellerName) {
        showToast(`ჩათი გაიხსნა: ${sellerName}`, 'success')
      }
    } catch (error) {
      console.error('Error opening seller chat:', error)
      showToast('შეცდომა ჩათის გახსნისას', 'error')
    } finally {
      setContactingChatKey(null)
    }
  }

  const fetchSales = async () => {
    try {
      setLoadingSales(true)
      const response = await fetch('/api/user/sales')
      const data = await response.json()
      if (data.success) {
        setSales(data.orders || [])
        setTotalSellerIncome(data.totalSellerIncome ?? 0)
      }
    } catch (error) {
      console.error('Error fetching sales:', error)
    } finally {
      setLoadingSales(false)
    }
  }

  const updateSaleOrderItem = (
    itemId: number,
    patch: Partial<SaleOrderItem>,
  ) => {
    setSales((prev) =>
      prev.map((order) => ({
        ...order,
        items: order.items?.map((item) =>
          item.id === itemId ? { ...item, ...patch } : item,
        ),
      })),
    )
  }

  const updateBuyerOrderItem = (
    itemId: number,
    patch: Partial<OrderItem>,
  ) => {
    setOrders((prev) =>
      prev.map((order) => ({
        ...order,
        items: order.items?.map((item) =>
          item.id === itemId ? { ...item, ...patch } : item,
        ),
      })),
    )
  }

  const handleReportOutOfStock = async (itemId: number) => {
    if (
      !confirm(
        'დარწმუნებული ხართ, რომ ამ ნივთს მარაგში არ გაქვთ? შეკვეთის გაუქმების შემდეგ ნივთი აღარ გამოჩნდება მარაგში.',
      )
    ) {
      return
    }

    try {
      setReportingOutOfStockItemId(itemId)
      const response = await fetch(`/api/user/sales/items/${itemId}/report-out-of-stock`, {
        method: 'POST',
      })
      const data = await response.json()
      if (data.success) {
        setSales((prev) =>
          prev.map((order) => ({
            ...order,
            items: order.items?.map((item) =>
              item.id === itemId
                ? {
                    ...item,
                    sellerReportedOutOfStock: true,
                    sellerReportedAt: data.item?.sellerReportedAt ?? new Date().toISOString(),
                  }
                : item,
            ),
          })),
        )
        showToast(data.message, 'success')
      } else {
        showToast(data.message || 'შეცდომა მოხსენებისას', 'error')
      }
    } catch (error) {
      console.error('Error reporting out of stock:', error)
      showToast('შეცდომა მოხსენებისას', 'error')
    } finally {
      setReportingOutOfStockItemId(null)
    }
  }

  const handleReportDamaged = async (itemId: number) => {
    if (
      !confirm(
        'დარწმუნებული ხართ, რომ ეს ნივთი დაზიანებულია? შეკვეთის გაუქმების შემდეგ ნივთი აღარ გამოჩნდება მარაგში.',
      )
    ) {
      return
    }

    try {
      setReportingDamagedItemId(itemId)
      const response = await fetch(`/api/user/sales/items/${itemId}/report-damaged`, {
        method: 'POST',
      })
      const data = await response.json()
      if (data.success) {
        setSales((prev) =>
          prev.map((order) => ({
            ...order,
            items: order.items?.map((item) =>
              item.id === itemId
                ? {
                    ...item,
                    sellerReportedDamaged: true,
                    sellerReportedDamagedAt:
                      data.item?.sellerReportedDamagedAt ?? new Date().toISOString(),
                  }
                : item,
            ),
          })),
        )
        showToast(data.message, 'success')
      } else {
        showToast(data.message || 'შეცდომა მოხსენებისას', 'error')
      }
    } catch (error) {
      console.error('Error reporting damaged item:', error)
      showToast('შეცდომა მოხსენებისას', 'error')
    } finally {
      setReportingDamagedItemId(null)
    }
  }

  const fetchVouchers = async () => {
    try {
      setLoadingVouchers(true)
      const response = await fetch('/api/user/vouchers')
      const data = await response.json()
      if (data.success) {
        setVouchers(data.vouchers || [])
      }
    } catch (error) {
      console.error('Error fetching vouchers:', error)
    } finally {
      setLoadingVouchers(false)
    }
  }

  const copyVoucherCode = (code: string) => {
    navigator.clipboard.writeText(code)
    showToast('კოდი დაკოპირდა', 'success')
  }

  const fetchProducts = async (page = 1) => {
    const fetchId = ++productsFetchIdRef.current

    try {
      setLoadingProducts(true)

      const response = await fetch(
        `/api/user/products?page=${page}&limit=${PRODUCTS_PER_PAGE}`,
      )
      const data = await response.json()

      if (fetchId !== productsFetchIdRef.current) return

      if (!data.success) return

      const totalPages = Math.max(1, data.totalPages ?? 1)
      const targetPage = Math.min(page, totalPages)

      if (page > totalPages) {
        await fetchProducts(targetPage)
        return
      }

      setProducts(data.products || [])
      setProductsPage(targetPage)
      productsPageRef.current = targetPage
      setProductsTotalPages(totalPages)
      setProductsTotalCount(data.totalCount ?? 0)
    } catch (error) {
      if (fetchId === productsFetchIdRef.current) {
        console.error('Error fetching products:', error)
      }
    } finally {
      if (fetchId === productsFetchIdRef.current) {
        setLoadingProducts(false)
      }
    }
  }

  const goToProductsPage = (page: number) => {
    const nextPage = Math.max(1, Math.min(page, productsTotalPages))
    if (nextPage === productsPageRef.current) return
    void fetchProducts(nextPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleResubmitProduct = async (productId: number) => {
    try {
      setResubmittingProductId(productId)

      const response = await fetch(
        `/api/user/products/${productId}/resubmit-approval`,
        { method: 'POST' },
      )
      const result = await response.json()

      if (response.ok && result.success && result.product) {
        await fetchProducts(productsPageRef.current)
        showToast(result.message || 'პროდუქტი ხელახლა გაიგზავნა დამტკიცებაზე', 'success')
      } else {
        showToast(result.error || 'შეცდომა დამტკიცებაზე ხელახლა გაგზავნისას', 'error')
      }
    } catch (error) {
      console.error('Error resubmitting product:', error)
      showToast('შეცდომა დამტკიცებაზე ხელახლა გაგზავნისას', 'error')
    } finally {
      setResubmittingProductId(null)
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
        const remainingOnPage = products.filter((p) => p.id !== productId)
        if (remainingOnPage.length === 0 && productsPage > 1) {
          await fetchProducts(productsPage - 1)
        } else {
          setProducts(remainingOnPage)
          setProductsTotalCount((prev) => Math.max(0, prev - 1))
          setProductsTotalPages((prev) =>
            Math.max(1, Math.ceil(Math.max(0, productsTotalCount - 1) / PRODUCTS_PER_PAGE)),
          )
        }
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
    const previousStatus = products.find((p) => p.id === productId)?.status

    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, status: newStatus } : p)),
    )

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        const savedStatus = result.product?.status ?? newStatus
        setProducts((prev) =>
          prev.map((p) =>
            p.id === productId ? { ...p, status: savedStatus } : p,
          ),
        )
        broadcastProductStatusUpdate({
          productId,
          status: savedStatus as ProductStatusValue,
        })
        router.refresh()
        showToast('სტატუსი წარმატებით განახლდა', 'success')
      } else {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === productId ? { ...p, status: previousStatus ?? p.status } : p,
          ),
        )
        showToast(result.message || result.error || 'შეცდომა სტატუსის შეცვლისას', 'error')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId ? { ...p, status: previousStatus ?? p.status } : p,
        ),
      )
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

  const getProductApprovalLabel = getSellerApprovalLabel

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
              <UploadLoadingIndicator className="mt-2" message="სურათი იტვირთება..." />
            )}
            <div className="mt-3 flex space-x-2">
              <button
                onClick={() => setIsEditingProfile(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg transition-colors"
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
                <p className="font-medium text-black">{session.user.email}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <User className="w-5 h-5 text-black" />
              <div>
                <p className="md:text-[18px] text-[16px] text-black">სახელი</p>
                <p className="font-medium text-black">{session.user.name}</p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Phone className="w-5 h-5 text-black" />
              <div>
                <p className="md:text-[18px] text-[16px] text-black">ტელეფონი</p>
                <p className="font-medium text-black">{session.user.phone ?? '-'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <MapPin className="w-5 h-5 text-black" />
              <div>
                <p className="md:text-[18px] text-[16px] text-black">მისამართი</p>
                <p className="font-medium text-black">{(session.user as { address?: string })?.address ?? (session.user as { location?: string })?.location ?? '-'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <User className="w-5 h-5 text-black" />
              <div>
                <p className="md:text-[18px] text-[16px] text-black">როლი</p>
                <p className={`font-medium ${
                  session.user.role === 'ADMIN' 
                    ? 'text-red-800' 
                    : session.user.role === 'SUPPORT'
                    ? 'text-black'
                    : 'text-green-500'
                }`}>
                  {(() => {
                    const role = session.user.role
                    if (role === 'ADMIN') return 'ადმინისტრატორი'
                    if (role === 'SUPPORT') return 'საფორთი'
                    return 'მომხმარებელი'
                  })()}
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>
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

  const renderVouchersTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="md:text-[20px] text-[18px] font-bold text-black mb-6">
          ჩემი ვაუჩერები
        </h3>

        {loadingVouchers ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-gray-300 border-t-[#1B3729] rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[18px] text-black">იტვირთება...</p>
          </div>
        ) : vouchers.length === 0 ? (
          <div className="text-center py-8">
            <Ticket className="w-12 h-12 text-black mx-auto mb-4" />
            <p className="text-[18px] text-black">ჯერ არ გაქვთ ვაუჩერები</p>
          </div>
        ) : (
          <div className="space-y-4">
            {vouchers.map((voucher) => (
              <div
                key={voucher.id}
                className={`border rounded-lg p-4 transition-shadow ${
                  voucher.isAvailable
                    ? 'border-green-300 bg-green-50 hover:shadow-md'
                    : 'border-gray-200 bg-gray-50 opacity-75'
                }`}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xl text-black">
                        {voucher.code}
                      </span>
                      {voucher.isAvailable && (
                        <button
                          onClick={() => copyVoucherCode(voucher.code)}
                          className="p-1.5 hover:bg-green-100 rounded-lg text-green-700"
                          title="კოდის კოპირება"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <p className="text-lg font-bold text-green-700 mt-1">
                      ნაშთი: ₾
                      {(voucher.remainingAmount ?? voucher.discountAmount).toFixed(
                        2,
                      )}
                      {voucher.remainingAmount != null &&
                        voucher.remainingAmount < voucher.discountAmount && (
                          <span className="text-sm font-medium text-gray-600 ml-2">
                            / ₾{voucher.discountAmount.toFixed(2)}
                          </span>
                        )}
                    </p>
                    {voucher.minOrderAmount && (
                      <p className="text-sm text-gray-600">
                        მინ. ჯამი: ₾{voucher.minOrderAmount.toFixed(2)}
                      </p>
                    )}
                    {voucher.message && (
                      <p className="text-sm text-gray-700 mt-2 italic">
                        {voucher.message}
                      </p>
                    )}
                    <p className="text-[15px] text-black mt-2">
                      მიღებული:{' '}
                      {new Date(voucher.receivedAt).toLocaleDateString('ka-GE')}
                      {voucher.expiresAt &&
                        ` · ვადა: ${new Date(voucher.expiresAt).toLocaleDateString('ka-GE')}`}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap ${
                      voucher.isAvailable
                        ? 'bg-green-200 text-green-800'
                        : voucher.isUsed
                          ? 'bg-gray-200 text-gray-600'
                          : voucher.isExpired
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {voucher.isAvailable
                      ? 'აქტიური'
                      : voucher.isUsed
                        ? 'ბალანსი ამოიწურა'
                        : voucher.isExpired
                          ? 'ვადაგასული'
                          : 'არააქტიური'}
                  </span>
                </div>
              
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  const renderOrdersTab = () => {
    const filteredOrders = orders.filter((order) => {
      // Canceled checkouts are excluded by /api/user/orders
      if (ordersStatusFilter === 'ACTIVE') {
        return order.status !== 'REFUNDED'
      }
      return true
    })

    return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h3 className="md:text-[20px] text-[18px] font-bold text-black">შეკვეთების ისტორია</h3>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['ALL', 'ყველა'],
                ['ACTIVE', 'აქტიური'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setOrdersStatusFilter(value)}
                className={`px-3 py-1.5 rounded-lg text-[15px] font-medium transition-colors ${
                  ordersStatusFilter === value
                    ? 'bg-[#1B3729] text-white'
                    : 'bg-gray-100 text-black hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loadingOrders ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-gray-300 border-t-[#1B3729] rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-[18px] text-black">იტვირთება...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingCart className="w-12 h-12 text-black mx-auto mb-4" />
            <p className="text-[18px] text-black">
              {ordersStatusFilter === 'ACTIVE'
                ? 'აქტიური შეკვეთები ჯერ არ გაქვთ'
                : 'ჯერ არ გაქვთ შეკვეთები'}
            </p>
            {ordersStatusFilter === 'ALL' && (
            <Link
              href="/shop"
              className="inline-block md:text-[18px] text-[16px] mt-4 px-6 py-2 bg-[#1B3729] text-white rounded-lg font-bold uppercase tracking-wide transition-colors"
            >
              შეკვეთის დაწყება
            </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const orderDate = formatDate(order.createdAt)
              const deliverySpeed = fromPrismaDeliverySpeed(
                order.deliverySpeed as 'EXTRA' | 'STANDARD' | null,
              )
              const deliveryLabel = order.deliveryCity?.name
                ? `მიტანა: ${order.deliveryCity.name}${
                    deliverySpeed ? `, ${getDeliverySpeedLabel(deliverySpeed)}` : ''
                  }${
                    typeof order.deliveryPrice === 'number'
                      ? `, ₾${order.deliveryPrice.toFixed(2)}`
                      : ''
                  }`
                : 'ადგილიდან გატანა'

              return (
                <div
                  key={order.id}
                  className="border border-black rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                    <div>
                      <h4 className="font-semibold md:text-[18px] text-[16px] text-black">
                        შეკვეთა #{order.id}
                      </h4>
                      <p className="text-[16px] text-black">{orderDate}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="font-bold md:text-[22px] text-[16px] text-black">
                        ჯამი: ₾{order.total.toFixed(2)}
                      </p>
                      <span
                        className={`inline-block px-2 py-1 md:text-[20px] text-[18px] font-bold rounded-full ${getOrderStatusClass(order.status, order.paymentHoldStatus)}`}
                      >
                        {getOrderStatusLabel(order.status, order.paymentHoldStatus)}
                      </span>
                    </div>
                  </div>

                  <div className="mb-4 rounded-lg bg-gray-50 p-3 text-[15px] text-black space-y-1">
                    {order.address && (
                      <p>
                        <span className="font-medium">მისამართი:</span> {order.address}
                        {order.city ? `, ${order.city}` : ''}
                      </p>
                    )}
                    {order.phone && (
                      <p>
                        <span className="font-medium">ტელეფონი:</span> {order.phone}
                      </p>
                    )}
                    {order.email && (
                      <p>
                        <span className="font-medium">ელფოსტა:</span> {order.email}
                      </p>
                    )}
                    <p>
                      <span className="font-medium">მიწოდება:</span> {deliveryLabel}
                    </p>
                    {order.paymentMethod && (
                      <p>
                        <span className="font-medium">გადახდა:</span> {order.paymentMethod}
                      </p>
                    )}
                    {order.paymentHoldStatus === 'BLOCKED' && (
                      <p className="text-amber-700 font-medium">
                        თანხა დაბლოკილია თქვენს ბარათზე ({PAYMENT_HOLD_MAX_DAYS} დღე). გადახდის
                        დადასტურებას ადმინისტრატორი განახორციელებს. ვადა:{' '}
                        {formatDate(getPaymentHoldExpiresAt(order).toISOString())}
                        {getPaymentHoldDaysRemaining(order) > 0
                          ? ` (დარჩა ${getPaymentHoldDaysRemaining(order)} დღე)`
                          : ''}
                        .
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    {order.items?.map((item, index) => {
                      const imageUrl =
                        item.image || item.product?.images?.[0]?.url || null
                      const productId = item.productId ?? item.product?.id ?? null
                      const sellerName = item.product?.user?.name || null
                      const sellerId = item.product?.userId ?? item.product?.user?.id
                      const canContactSeller =
                        Boolean(productId) &&
                        Boolean(sellerId) &&
                        sellerId !== session?.user?.id
                      const contactChatKey =
                        productId != null
                          ? getOrderChatKey(order.id, productId)
                          : null
                      const isContacting = contactChatKey === contactingChatKey
                      const itemDiscount = getOrderItemDiscount(item)
                      const hasItemDiscount = itemDiscount > 0
                      const payableUnitPrice = getOrderItemPayablePrice(item)
                      const savingsUnit = getOrderItemBuyerSavings(item)
                      const itemQuantity = item.quantity ?? 1

                      return (
                        <div
                          key={item.id ?? index}
                          className="flex flex-col gap-3 border-t border-gray-200 pt-3 first:border-t-0 first:pt-0"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                            <div className="flex items-start gap-3 text-black min-w-0">
                              {imageUrl ? (
                                <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                                  <Image
                                    src={imageUrl}
                                    alt={item.productName}
                                    width={64}
                                    height={64}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="w-16 h-16 rounded-lg bg-gray-100 shrink-0 flex items-center justify-center">
                                  <Package className="w-7 h-7 text-gray-400" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="font-medium md:text-[18px] text-[16px]">
                                  {productId ? (
                                    <Link
                                      href={`/product/${productId}`}
                                      className="hover:underline"
                                    >
                                      {item.productName}
                                    </Link>
                                  ) : (
                                    item.productName
                                  )}
                                </div>
                                {item.size && (
                                  <div className="text-[15px]">ზომა: {item.size}</div>
                                )}
                                <div className="text-[15px]">
                                  რაოდენობა: {item.quantity ?? 1}
                                </div>
                                {item.isRental &&
                                  item.rentalStartDate &&
                                  item.rentalEndDate && (
                                    <div className="text-[15px] text-[#1B3729] font-medium mt-1">
                                      გაქირავება: {formatDate(item.rentalStartDate)} –{' '}
                                      {formatDate(item.rentalEndDate)}
                                      {item.rentalDays ? ` (${item.rentalDays} დღე)` : ''}
                                    </div>
                                  )}
                                {sellerName && (
                                  <div className="text-[15px] mt-1">
                                    მიმწოდებელი: {sellerName}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-left sm:text-right shrink-0">
                              {hasItemDiscount ? (
                                <div className="flex flex-col items-start sm:items-end gap-1">
                                  <div className="md:text-[18px] text-[16px] font-semibold text-red-600">
                                    ₾{(payableUnitPrice * itemQuantity).toFixed(2)}
                                  </div>
                                  <div className="bg-[#1B3729] rounded-md text-white text-xs flex items-center px-2 py-1">
                                    <span className="whitespace-nowrap">
                                      დანაზოგი: ₾{(savingsUnit * itemQuantity).toFixed(2)}
                                    </span>
                                    {item.product?.discountDays && (
                                      <span className="bg-white text-black px-2 py-0.5 rounded ml-2 whitespace-nowrap">
                                        {item.product.discountDays} დღე
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="md:text-[18px] text-[16px] font-semibold text-black">
                                  ₾{(payableUnitPrice * itemQuantity).toFixed(2)}
                                </div>
                              )}
                            </div>
                          </div>

                          {canContactSeller && (
                            <button
                              type="button"
                              onClick={() =>
                                openSellerChat(
                                  productId,
                                  item.productName,
                                  order.id,
                                  sellerName,
                                )
                              }
                              disabled={isContacting}
                              className="inline-flex items-center justify-center gap-2 self-start px-4 py-2 bg-[#1B3729] text-white rounded-lg text-[15px] font-semibold transition-colors hover:bg-[#164321] disabled:opacity-60"
                            >
                              <MessageCircle className="w-4 h-4" />
                              {isContacting
                                ? 'იხსნება...'
                                : 'დაუკავშირდით მიმწოდებელს'}
                            </button>
                          )}

                          {item.id != null && (
                            <OrderItemSaleStatusActions
                              item={{
                                id: item.id,
                                isRental: item.isRental,
                                sellerMarkedTransferred: item.sellerMarkedTransferred,
                                sellerMarkedTransferredAt: item.sellerMarkedTransferredAt,
                                sellerCanceledItem: item.sellerCanceledItem,
                                sellerCanceledAt: item.sellerCanceledAt,
                                sellerReportedOutOfStock: item.sellerReportedOutOfStock,
                                sellerReportedDamaged: item.sellerReportedDamaged,
                              }}
                              orderStatus={order.status}
                              onItemUpdate={updateBuyerOrderItem}
                            />
                          )}
                        </div>
                      )
                    })}
                    {(!order.items || order.items.length === 0) && (
                      <p className="text-[15px] text-gray-600 border-t border-gray-200 pt-3">
                        ამ შეკვეთაზე პროდუქტის დეტალები ვერ ჩაიტვირთა.
                      </p>
                    )}
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

  const renderSalesTab = () => {
    const totalSoldItems = sales
      .filter((order) => isSellerIncomeOrderStatus(order.status))
      .reduce(
      (sum, order) =>
        sum +
        (order.items?.reduce((itemSum, item) => itemSum + (item.quantity ?? 1), 0) || 0),
      0
    )

    const totalSalesAmount = totalSellerIncome

    const filteredSales = sales
      .filter((order) => order.status !== 'CANCELED')
      .map((order) => {
        const items = order.items?.filter((item) => {
          if (salesTransferFilter === 'TRANSFERRED') {
            return item.sellerMarkedTransferred === true
          }
          if (salesTransferFilter === 'PENDING') {
            return (
              !item.sellerMarkedTransferred &&
              !item.sellerCanceledItem &&
              !item.sellerReportedOutOfStock &&
              !item.sellerReportedDamaged
            )
          }
          if (salesTransferFilter === 'CANCELED') {
            // Seller-returned items on paid orders only (not abandoned checkouts)
            return item.sellerCanceledItem === true
          }
          return true
        })
        return { ...order, items }
      })
      .filter((order) => (order.items?.length ?? 0) > 0)

    const transferredCount = sales.reduce(
      (sum, order) =>
        sum + (order.items?.filter((item) => item.sellerMarkedTransferred).length ?? 0),
      0,
    )
    const canceledCount = sales.reduce(
      (sum, order) =>
        sum + (order.items?.filter((item) => item.sellerCanceledItem).length ?? 0),
      0,
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h3 className="md:text-[20px] text-[18px] font-bold text-black">გაყიდვების ისტორია</h3>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['ALL', 'ყველა'],
                  ['TRANSFERRED', 'გაცემული'],
                  ['PENDING', 'მოლოდინში'],
                  ['CANCELED', ORDER_ITEM_RETURNED_STATUS_LABEL],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSalesTransferFilter(value)}
                  className={`px-3 py-1.5 rounded-lg text-[15px] font-medium transition-colors ${
                    salesTransferFilter === value
                      ? 'bg-[#1B3729] text-white'
                      : 'bg-gray-100 text-black hover:bg-gray-200'
                  }`}
                >
                  {label}
                  {value === 'TRANSFERRED' && transferredCount > 0
                    ? ` (${transferredCount})`
                    : value === 'CANCELED' && canceledCount > 0
                      ? ` (${canceledCount})`
                      : ''}
                </button>
              ))}
            </div>
          </div>

          {loadingSales ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-gray-300 border-t-[#1B3729] rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-[16px] text-black">გაყიდვები იტვირთება...</p>
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp className="w-12 h-12 text-black mx-auto mb-4" />
              <p className="text-[18px] text-black">
                {salesTransferFilter === 'ALL'
                  ? 'ჯერ არ გაქვთ გაყიდვები'
                  : salesTransferFilter === 'TRANSFERRED'
                    ? 'გაცემული ნივთები ჯერ არ გაქვთ'
                    : salesTransferFilter === 'CANCELED'
                      ? `${ORDER_ITEM_RETURNED_STATUS_LABEL} — ნივთები ჯერ არ გაქვთ`
                      : 'მოლოდინში მყოფი ნივთები ჯერ არ გაქვთ'}
              </p>
              {salesTransferFilter === 'ALL' && (
                <p className="text-[16px] text-black">დაამატეთ პროდუქტი და დაიწყეთ გაყიდვები</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSales.map((order) => {
                const saleDate = new Date(order.createdAt)
                const saleDateLabel = saleDate.toLocaleDateString('ka-GE')
                const saleTimeLabel = saleDate.toLocaleTimeString('ka-GE', {
                  hour: '2-digit',
                  minute: '2-digit'
                })
                const sellerTotal =
                  order.sellerTotal ??
                  (order.items?.reduce(
                    (sum, item) =>
                      sum +
                      (item.sellerLineTotal ??
                        (item.sellerUnitPrice ?? 0) * (item.quantity ?? 1)),
                    0,
                  ) ?? 0)
                const saleStatus = getSaleOrderStatusDisplay(order)
                return (
                  <div key={order.id} className="border border-black rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-3">
                      <div>
                        <h4 className="font-semibold md:text-[18px] text-[16px] text-black">გაყიდვა #{order.id}</h4>
                        <p className="text-[16px] text-black">
                          {saleDateLabel} • <span className="text-black text-[14px]">{saleTimeLabel}</span>
                        </p>
                       
                      </div>
                      <div className="text-right space-y-2">
                        <p className="font-bold md:text-[22px] text-[16px] text-black">ჯამი: ₾{sellerTotal.toFixed(2)}</p>
                        <span
                          className={`inline-block px-2 py-1 md:text-[20px] text-[18px] font-bold rounded-full ${saleStatus.className}`}
                        >
                          {saleStatus.label}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {order.items?.map((item, index) => {
                        const snapshot = item.snapshot
                        const itemImage = item.image || snapshot?.image || null
                        const lineTotal =
                          item.sellerLineTotal ??
                          (item.sellerUnitPrice ?? 0) * (item.quantity ?? 1)
                        const genderLabel = formatSnapshotGender(snapshot?.gender ?? null)

                        return (
                        <div
                          key={item.id ?? index}
                          className="rounded-lg border border-gray-200 p-3 sm:p-4"
                        >
                          <div className="flex flex-col sm:flex-row gap-4">
                            <div className="w-full sm:w-28 h-36 sm:h-32 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                              {itemImage ? (
                                <Image
                                  src={itemImage}
                                  alt={item.productName}
                                  width={160}
                                  height={160}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-sm text-gray-500">
                                  სურათი არ არის
                                </div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <h5 className="font-semibold md:text-[18px] text-[16px] text-black">
                                {item.productName}
                              </h5>

                              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[15px] text-black">
                                {snapshot?.brand && (
                                  <p><span className="font-medium">ბრენდი:</span> {snapshot.brand}</p>
                                )}
                                {snapshot?.sku && (
                                  <p><span className="font-medium">კოდი:</span> {snapshot.sku}</p>
                                )}
                                {snapshot?.categoryName && (
                                  <p><span className="font-medium">კატეგორია:</span> {snapshot.categoryName}</p>
                                )}
                                {genderLabel && (
                                  <p><span className="font-medium">სქესი:</span> {genderLabel}</p>
                                )}
                                {snapshot?.color && (
                                  <p><span className="font-medium">ფერი:</span> {snapshot.color}</p>
                                )}
                                {item.size && (
                                  <p>
                                    <span className="font-medium">ზომა:</span>{' '}
                                    {snapshot?.sizeSystem ? `${item.size} (${snapshot.sizeSystem})` : item.size}
                                  </p>
                                )}
                              </div>

                              <div className="mt-3 flex flex-wrap items-center gap-4 text-[15px] text-black">
                                <span>
                                  <span className="font-medium">ფასი:</span>{' '}
                                  ₾{(item.sellerUnitPrice ?? 0).toFixed(2)}
                                </span>
                                <span><span className="font-medium">რაოდენობა:</span> {item.quantity ?? 1}</span>
                                <span className="font-semibold text-[#1B3729]">ჯამი: ₾{lineTotal.toFixed(2)}</span>
                              </div>

                              {(order.status === 'PAID' || order.status === 'SHIPPED') && (
                                <OrderItemSaleStatusActions
                                  item={item}
                                  orderStatus={order.status}
                                  allowStatusChange
                                  statusAudience="seller"
                                  showSellerReportActions={!item.isRental}
                                  reportingOutOfStockItemId={reportingOutOfStockItemId}
                                  reportingDamagedItemId={reportingDamagedItemId}
                                  onItemUpdate={updateSaleOrderItem}
                                  onReportOutOfStock={handleReportOutOfStock}
                                  onReportDamaged={handleReportDamaged}
                                />
                              )}
                            </div>
                          </div>
                        </div>
                        )
                      })}
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
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-black rounded-lg  transition-colors"
            >
              <Search className="w-4 h-4" />
              <span>ძიება კოდის მიხედვით</span>
            </Link>
          </div>
        </div>

       
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
                    src={getProductThumbnailUrl(product)}
                    alt={product.name}
                    width={400}
                    height={533}
                    className="w-full h-full object-cover"
                    onError={(event) => {
                      event.currentTarget.src = '/placeholder.jpg'
                    }}
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
                    {formatOwnerProductPriceLabel(product)}
                  </p>
                  <div className="mb-3 space-y-1">
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-[16px] ${
                        product.approvalStatus === 'APPROVED'
                          ? ' text-green-500'
                          : product.approvalStatus === 'REJECTED'
                            ? ' text-amber-600'
                            : ' text-yellow-500'
                      }`}
                    >
                      {getProductApprovalLabel(product.approvalStatus)}
                    </span>
                    {product.approvalStatus === 'REJECTED' && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 space-y-1">
                        <p className="text-[16px] text-amber-900 font-medium">
                          საჭირო ცვლილებები: {product.rejectionReason?.trim() || 'კომენტარი არ არის მითითებული'}
                        </p>
                        <p className="text-[15px] text-amber-800">
                          შეცვალეთ პროდუქტი და გაგზავნეთ ხელახლა დამტკიცებაზე.
                        </p>
                      </div>
                    )}
                    {product.approvalStatus === 'PENDING' && (
                      <p className="text-[16px] text-black">
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
                      <option className="md:text-[18px] text-[16px]" value="DAMAGED">დაზიანებულია</option>
                    </select>
                  </div>

                  <div className="mt-4 flex flex-col gap-2">
                    {product.approvalStatus === 'REJECTED' && (
                      <button
                        type="button"
                        onClick={() => handleResubmitProduct(product.id)}
                        disabled={resubmittingProductId === product.id}
                        className="w-full px-3 py-2 bg-[#1B3729] text-white rounded-lg font-bold transition-colors md:text-[18px] text-[16px] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {resubmittingProductId === product.id
                          ? 'იგზავნება...'
                          : 'ხელახლა გაგზავნა დამტკიცებაზე'}
                      </button>
                    )}
                    <div className="flex space-x-2">
                    <Link
                      href={`/account/products/${product.id}/edit`}
                      className="flex-1 px-3 py-2 bg-black text-white rounded-lg  font-bold transition-colors md:text-[18px] text-[16px] text-center"
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
              </div>
            ))}
          </div>
        )}

        {productsTotalPages > 1 && (
          <div className="flex flex-col items-center justify-center gap-4 mt-8 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => goToProductsPage(productsPage - 1)}
                disabled={productsPage === 1 || loadingProducts}
                className={`px-4 py-2 rounded-lg border transition-colors md:text-[18px] text-[16px] flex items-center gap-2 ${
                  productsPage === 1 || loadingProducts
                    ? 'bg-gray-100 text-black cursor-not-allowed border-gray-300'
                    : 'bg-white text-black border-gray-300 hover:bg-gray-50 hover:border-black'
                }`}
              >
                <ChevronLeft className="w-5 h-5" />
                წინა
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: productsTotalPages }, (_, i) => i + 1).map((page) => {
                  if (
                    page === 1 ||
                    page === productsTotalPages ||
                    (page >= productsPage - 1 && page <= productsPage + 1)
                  ) {
                    return (
                      <button
                        key={page}
                        type="button"
                        onClick={() => goToProductsPage(page)}
                        disabled={loadingProducts}
                        className={`px-4 py-2 rounded-lg border transition-colors md:text-[18px] text-[16px] ${
                          productsPage === page
                            ? 'bg-black text-white border-black'
                            : loadingProducts
                              ? 'bg-gray-100 text-black cursor-not-allowed border-gray-300'
                              : 'bg-white text-black border-gray-300 hover:bg-gray-50 hover:border-black'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  }

                  if (page === productsPage - 2 || page === productsPage + 2) {
                    return (
                      <span key={page} className="px-2 text-black">
                        ...
                      </span>
                    )
                  }

                  return null
                })}
              </div>

              <button
                type="button"
                onClick={() => goToProductsPage(productsPage + 1)}
                disabled={productsPage === productsTotalPages || loadingProducts}
                className={`px-4 py-2 rounded-lg border transition-colors md:text-[18px] text-[16px] flex items-center gap-2 ${
                  productsPage === productsTotalPages || loadingProducts
                    ? 'bg-gray-100 text-black cursor-not-allowed border-gray-300'
                    : 'bg-white text-black border-gray-300 hover:bg-gray-50 hover:border-black'
                }`}
              >
                შემდეგი
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <p className="text-black md:text-[16px] text-[14px]">
              გვერდი {productsPage} {productsTotalPages}-დან ({productsTotalCount} პროდუქტი)
            </p>
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
    <div className="w-full min-w-0">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 overflow-hidden w-full">
        <div className="flex w-full min-w-0 h-[min(560px,calc(100dvh-12rem))] sm:h-[min(620px,calc(100dvh-10rem))] md:h-[calc(100dvh-13rem)] md:min-h-[480px]">
          {/* Chat Rooms List — full width on mobile until a chat is selected */}
          <div
            className={`border-gray-200 flex flex-col min-h-0 min-w-0 overflow-hidden ${
              selectedChatRoom
                ? 'hidden md:flex md:w-72 lg:w-80 md:shrink-0 md:border-r'
                : 'flex w-full md:w-72 lg:w-80 md:shrink-0 md:border-r'
            }`}
          >
            <div className="p-3 sm:p-4 border-b border-gray-200 shrink-0 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="md:text-[20px] text-[18px] font-bold text-black">ჩათები</h3>
                {chatsUnreadCount > 0 ? (
                  <p className="text-sm text-red-600 font-medium mt-0.5">
                    {chatsUnreadCount} წაუკითხავი ჩათი
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={toggleChatSound}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-black hover:bg-gray-50 transition-colors"
                  title={chatSoundEnabled ? 'შემომავალი მესიჯის ხმა ჩართულია' : 'შემომავალი მესიჯის ხმა გამორთულია'}
                >
                  {chatSoundEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                  <span className="hidden sm:inline">
                    {chatSoundEnabled ? 'ხმა ჩართ.' : 'ხმა გამორთ.'}
                  </span>
                </button>
                <ChatUnreadBadge
                  count={chatsUnreadCount}
                  className="relative shrink-0"
                  pulse={false}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 min-w-0">
              {loadingChats ? (
                <div className="p-4 text-center">
                  <div className="w-8 h-8 border-4 border-gray-300 border-t-[#1B3729] rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-black md:text-[16px] text-[14px]">იტვირთება...</p>
                </div>
              ) : chatRooms.length === 0 ? (
                <div className="p-6 text-center">
                  <MessageCircle className="w-12 h-12 text-black mx-auto mb-2" />
                  <p className="text-black md:text-[16px] text-[14px]">ჩათები არ არის</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {chatRooms.map((room) => {
                    const displayName = getAccountChatDisplayName(room, session?.user?.id)
                    const isSelected = selectedChatRoom?.id === room.id

                    return (
                      <div
                        key={room.id}
                        className={`flex items-center group min-w-0 overflow-hidden ${
                          isSelected ? 'bg-[#1B3729]' : ''
                        }`}
                      >
                        <button
                          onClick={() => {
                            setSelectedChatRoom(room)
                            preferredChatRoomIdRef.current = null
                            router.push(buildAccountChatsPath(room.id))
                          }}
                          className={`flex-1 min-w-0 text-left p-3 sm:p-4 transition-colors ${
                            isSelected ? 'text-white' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className={`md:text-[16px] text-[14px] truncate ${
                                isSelected
                                  ? 'text-white font-semibold'
                                  : room.is_unread
                                    ? 'text-black font-bold'
                                    : 'text-black font-semibold'
                              }`}>
                                {displayName}
                              </p>
                              {room.product_name && (
                                <p className={`mt-0.5 truncate text-xs font-medium ${
                                  isSelected ? 'text-white/80' : 'text-[#1B3729]'
                                }`}>
                                  {room.chatKind === 'live_support'
                                    ? 'Live Chat'
                                    : room.product_name}
                                  {room.orderId ? ` • შეკვეთა #${room.orderId}` : ''}
                                </p>
                              )}
                              {room.last_message && (
                                <p className={`mt-1 truncate md:text-[16px] text-[14px] ${
                                  isSelected ? 'text-white/90' : 'text-gray-600'
                                }`}>
                                  {room.last_message}
                                </p>
                              )}
                            </div>
                            {room.is_unread ? (
                              <span
                                className="shrink-0 flex items-center gap-1.5"
                                title="ახალი შეტყობინება"
                              >
                                <span className="hidden sm:inline text-xs font-semibold text-red-600">
                                  ახალი
                                </span>
                                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                              </span>
                            ) : null}
                          </div>
                        </button>
                        {room.chatKind === 'live_support' ? (
                          <button
                            onClick={(e) => handleDeleteChat(room.id, 'live_support', e)}
                            className={`p-2 mr-1 sm:mr-2 shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity hover:bg-red-100 rounded ${
                              isSelected ? 'hover:bg-red-900/40' : ''
                            }`}
                            title="საუბრის დახურვა"
                          >
                            <Trash2 className={`w-4 h-4 ${
                              isSelected ? 'text-white' : 'text-red-600'
                            }`} />
                          </button>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Chat Messages — full width on mobile when a chat is selected */}
          <div
            className={`flex-col min-h-0 min-w-0 flex-1 overflow-hidden ${
              selectedChatRoom ? 'flex' : 'hidden md:flex'
            }`}
          >
            {selectedChatRoom ? (
              <>
                <div className="p-3 sm:p-4 border-b border-gray-200 shrink-0 flex items-center gap-2 sm:gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => setSelectedChatRoom(null)}
                    className="md:hidden p-2 -ml-1 rounded-lg hover:bg-gray-100 shrink-0"
                    aria-label="ჩათების სიაზე დაბრუნება"
                  >
                    <ArrowLeft className="w-5 h-5 text-black" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <h3 className="md:text-[18px] text-[16px] font-semibold text-black truncate">
                      {getAccountChatDisplayName(selectedChatRoom, session?.user?.id)}
                    </h3>
                    {selectedChatRoom.product_name && (
                      <p className="text-sm text-[#1B3729] truncate">
                        {selectedChatRoom.chatKind === 'live_support' ? (
                          'Live Chat'
                        ) : selectedChatRoom.productId ? (
                          <Link
                            href={`/product/${selectedChatRoom.productId}`}
                            className="hover:underline"
                          >
                            {selectedChatRoom.product_name}
                          </Link>
                        ) : (
                          selectedChatRoom.product_name
                        )}
                        {selectedChatRoom.chatKind !== 'live_support' && selectedChatRoom.orderId
                          ? ` • შეკვეთა #${selectedChatRoom.orderId}`
                          : ''}
                      </p>
                    )}
                  </div>
                </div>
                <div
                  ref={chatMessagesContainerRef}
                  className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 min-h-0"
                >
                  {chatMessages.map((message) => {
                    const viewerIsSeller =
                      session?.user?.id === selectedChatRoom?.adminId
                    const isFromMe = viewerIsSeller
                      ? Boolean(message.isFromAdmin)
                      : Boolean(
                          !message.isFromAdmin &&
                            message.userId === session?.user?.id,
                        )

                    return (
                      <div
                        key={message.id}
                        className={`flex ${isFromMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[88%] sm:max-w-[75%] lg:max-w-[70%] rounded-lg px-3 sm:px-4 py-2 ${
                            isFromMe
                              ? 'bg-[#1B3729] text-white'
                              : 'bg-gray-200 text-black'
                          }`}
                        >
                          <ChatMessageContent
                            content={message.content}
                            imageUrl={message.imageUrl}
                            textClassName="md:text-[16px] text-[14px] break-words"
                          />
                          <p className={`text-xs mt-1 ${
                            isFromMe ? 'text-white/70' : 'text-gray-600'
                          }`}>
                            {new Date(message.createdAt).toLocaleString('ka-GE')}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                  <ChatTypingIndicator show={otherPartyTyping} align="start" />
                </div>
                <div className="p-3 sm:p-4 border-t border-gray-200 shrink-0">
                  {pendingChatImageUrl ? (
                    <ChatPendingImagePreview
                      imageUrl={pendingChatImageUrl}
                      onRemove={() => setPendingChatImageUrl(null)}
                    />
                  ) : null}
                  <div className="flex items-end gap-2">
                    <ChatImageUploadButton
                      onImageReady={setPendingChatImageUrl}
                      disabled={sendingMessage || Boolean(pendingChatImageUrl)}
                    />
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => {
                        setNewMessage(e.target.value)
                        notifyTyping(e.target.value)
                      }}
                      onBlur={stopTyping}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          sendChatMessage()
                        }
                      }}
                      placeholder="დაწერეთ შეტყობინება..."
                      className="flex-1 min-w-0 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B3729] md:text-[16px] text-[14px]"
                    />
                    <button
                      onClick={sendChatMessage}
                      disabled={!canSendChatMessage(newMessage, pendingChatImageUrl) || sendingMessage}
                      className="shrink-0 px-4 sm:px-6 py-2 bg-[#1B3729] text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity md:text-[16px] text-[14px] font-medium"
                    >
                      {sendingMessage ? '...' : 'გაგზავნა'}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="text-center">
                  <MessageCircle className="w-12 h-12 sm:w-16 sm:h-16 text-black mx-auto mb-4" />
                  <p className="text-black md:text-[18px] text-[16px]">აირჩიეთ ჩათი საუბრის დასაწყებად</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  const renderSectionContent = () => {
    switch (section) {
      case 'profile':
        return renderProfileTab()
      case 'vouchers':
        return renderVouchersTab()
      case 'orders':
        return renderOrdersTab()
      case 'sales':
        return renderSalesTab()
      case 'contact':
        return (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="md:text-[20px] text-[18px] font-bold text-black">კონტაქტი</h2>
            <ContactForm />
          </div>
        )
      case 'chats':
        return renderChatsTab()
      case 'inquiries':
        return (
          <div className="space-y-8">
            {session.user.role !== 'SUPPORT' && (
              <RentalInquiriesPanel scope="seller" title="ჩემს პროდუქტებზე მიღებული მოთხოვნები" />
            )}
            <RentalInquiriesPanel scope="buyer" title="ჩემი გაგზავნილი მოთხოვნები" />
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

  return renderSectionContent()
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
    pickupAddress: '',
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
            pickupAddress: data.user.pickupAddress || '',
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

    if (!form.phone.trim()) {
      setError('ტელეფონის ნომერი საჭიროა')
      setSaving(false)
      return
    }
    if (!isValidPhone(form.phone)) {
      setError('ტელეფონის ნომერი არასწორია. მაგ: 555123456 ან +995555123456')
      setSaving(false)
      return
    }

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
          pickupAddress: form.pickupAddress,
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
        address: data.user.address,
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
        <label className="block md:text-[18px] text-[16px] font-medium text-black mb-2">
          ტელეფონი <span className="text-red-600">*</span>
        </label>
        <input
          name="phone"
          value={form.phone}
          onChange={onChange}
          required
          placeholder="მაგ: 555123456"
          className="w-full px-4 py-3 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
        />
      </div>

      <div>
        <label className="block md:text-[18px] text-[16px] font-medium text-black mb-2">
          ბანკის IBAN <span className="text-red-600">*</span>
          <span className="text-sm font-normal text-gray-600"> (პროდუქტის დასამატებლად)</span>
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
          placeholder="მაგ: GE00TB0000000000000000"
          className="w-full uppercase px-4 py-3 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
        />
        <p className="text-black md:text-[18px] text-[16px] mt-1">
          IBAN საჭიროა მხოლოდ პროდუქტის დასამატებლად და გაყიდვებიდან თანხის მისაღებად.
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

      <div>
        <label className="block md:text-[18px] text-[16px] font-medium text-black mb-2">
          მისამართი ადგილზე მისვლისთვის
        </label>
        <input 
          name="pickupAddress" 
          value={form.pickupAddress} 
          onChange={onChange} 
          placeholder="მაგ: ლეო დავითაშვილის ქუჩა 120, 0190 თბილისი, საქართველო"
          className="w-full px-4 py-3 border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent" 
        />
        <p className="md:text-[16px] text-[14px] text-gray-600 mt-1">
          ეს მისამართი გამოყენებული იქნება checkout-ში, როცა აირჩევთ "ადგილზე" მიტანის ტიპს
        </p>
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


      <button type="submit" disabled={saving} className="w-full md:w-[30%] md:text-[18px] text-[16px] font-bold bg-black text-white py-3 px-6 rounded-lg   transition-colors disabled:opacity-50">
        {saving ? 'ინახება...' : 'პროფილის შენახვა'}
      </button>

      {checkingRentals ? (
        <div className="w-full md:w-[30%] px-6 py-3 text-center bg-gray-200 text-black font-bold rounded-lg">
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

export default AccountSectionContent
