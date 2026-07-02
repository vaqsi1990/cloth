"use client"
import React, { useEffect, useState, Suspense, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Image from '@/component/AppImage'
import Link from 'next/link'
import { CheckCircle, Package, ArrowLeft, Home, ShoppingBag } from 'lucide-react'
import { formatDate } from '@/utils/dateUtils'
import AnimatedDotsLoader from '@/component/AnimatedDotsLoader'
import {
  getCartItemBuyerSavings,
  getCartItemPayablePrice,
} from '@/lib/cart-item-pricing'
import {
  fromPrismaDeliverySpeed,
  getDeliverySpeedLabel,
} from '@/lib/delivery'
import { processExpiredDiscount } from '@/lib/discount-helpers'
import {
  PAYMENT_HOLD_MAX_DAYS,
  getPaymentHoldExpiresAt,
  getPaymentHoldDaysRemaining,
} from '@/lib/payment-hold-config'

interface OrderItemProduct {
  discount: number | null
  discountDays: number | null
  discountStartDate: string | null
}

interface OrderItem {
  id: number
  productName: string
  image?: string | null
  size?: string | null
  price: number
  quantity: number
  isRental?: boolean | null
  rentalStartDate?: string | null
  rentalEndDate?: string | null
  rentalDays?: number | null
  product?: OrderItemProduct | null
}

interface Order {
  id: number
  status: string
  paymentHoldStatus?: string | null
  paymentHoldBlockedAt?: string | null
  updatedAt?: string
  total: number
  createdAt: string
  customerName: string
  email?: string | null
  phone: string
  address: string
  city?: string | null
  paymentMethod?: string | null
  deliveryCityId?: number | null
  deliverySpeed?: string | null
  deliveryPrice?: number | null
  voucherCode?: string | null
  voucherDiscount?: number | null
  deliveryCity?: { name: string } | null
  items: OrderItem[]
}

function getPaymentMethodLabel(method?: string | null): string {
  if (!method) return 'არ არის მითითებული'
  const lower = method.toLowerCase()
  if (lower.includes('bog') || lower === 'card') return 'ბანკის ბარათი'
  if (lower === 'cash') return 'ნაღდი ფული'
  if (lower === 'transfer') return 'ბანკის გადარიცხვა'
  if (lower.includes('google')) return 'Google Pay'
  if (lower.includes('apple')) return 'Apple Pay'
  return method
}

function getItemPayablePrice(item: OrderItem): number {
  const product = item.product ? processExpiredDiscount(item.product) : null
  const discount =
    product?.discount && product.discount > 0 ? product.discount : 0
  return getCartItemPayablePrice(item.price, discount)
}

function getItemBuyerSavings(item: OrderItem): number {
  const product = item.product ? processExpiredDiscount(item.product) : null
  const discount =
    product?.discount && product.discount > 0 ? product.discount : 0
  return getCartItemBuyerSavings(item.price, discount)
}

const OrderConfirmationContent = () => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const orderId = searchParams.get('orderId')

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOrder = useCallback(async () => {
    if (!orderId) return null

    const response = await fetch(`/api/orders/${orderId}`)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'შეკვეთა ვერ მოიძებნა')
    }

    if (data.success && data.order) {
      return data.order as Order
    }

    throw new Error(data.message || 'შეკვეთა ვერ მოიძებნა')
  }, [orderId])

  useEffect(() => {
    if (!orderId) {
      setError('შეკვეთის ID არ მოიძებნა')
      setLoading(false)
      return
    }

    let cancelled = false
    let pollTimer: ReturnType<typeof setTimeout> | null = null

    const load = async (attempt = 0) => {
      try {
        if (attempt > 0) {
          await fetch(`/api/orders/${orderId}/sync-payment`, { method: 'POST' }).catch(
            () => undefined,
          )
        }

        const fetched = await fetchOrder()
        if (cancelled || !fetched) return

        setOrder(fetched)
        setError(null)

        if (fetched.status === 'PENDING' && attempt < 10) {
          pollTimer = setTimeout(() => {
            void load(attempt + 1)
          }, 2000)
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'შეცდომა შეკვეთის მიღებისას. გთხოვთ სცადოთ მოგვიანებით.',
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
      if (pollTimer) clearTimeout(pollTimer)
    }
  }, [orderId, fetchOrder])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <AnimatedDotsLoader />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <div className="mb-8">
              <Package className="w-24 h-24 text-black mx-auto mb-4 opacity-50" />
              <h1 className="text-3xl font-bold text-black mb-4">
                {error || 'შეკვეთა ვერ მოიძებნა'}
              </h1>
            </div>
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center bg-black text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              მაღაზიაში დაბრუნება
            </button>
          </div>
        </div>
      </div>
    )
  }

  const getStatusLabel = (status: string) => {
    if (status === 'PAID' && order.paymentHoldStatus === 'BLOCKED') {
      return 'თანხა დაბლოკილია'
    }
    const statusMap: Record<string, string> = {
      PENDING: 'მოლოდინში',
      PAID: 'გადახდილი',
      SHIPPED: 'გაგზავნილი',
      CANCELED: 'გაუქმებული',
      REFUNDED: 'დაბრუნებული',
    }
    return statusMap[status] || status
  }

  const getStatusColor = (status: string) => {
    if (status === 'PAID' && order.paymentHoldStatus === 'BLOCKED') {
      return 'bg-amber-100 text-amber-800'
    }
    const colorMap: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PAID: 'bg-green-100 text-green-800',
      SHIPPED: 'bg-blue-100 text-blue-800',
      CANCELED: 'bg-red-100 text-red-800',
      REFUNDED: 'bg-gray-100 text-gray-800',
    }
    return colorMap[status] || 'bg-gray-100 text-gray-800'
  }

  const isDelivery = Boolean(order.deliveryCityId)
  const deliverySpeed = fromPrismaDeliverySpeed(
    order.deliverySpeed as 'EXTRA' | 'STANDARD' | null | undefined,
  )
  const itemsSubtotal = order.items.reduce(
    (sum, item) => sum + getItemPayablePrice(item) * item.quantity,
    0,
  )

  return (
    <div className="min-h-screen py-16">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-black mb-2">
              {order.status === 'PAID'
                ? 'შეკვეთა წარმატებით გაფორმდა!'
                : 'შეკვეთა მიღებულია'}
            </h1>
            <p className="text-black text-lg">
              {order.status === 'PENDING'
                ? 'გადახდის დადასტურება მიმდინარეობს...'
                : order.paymentHoldStatus === 'BLOCKED'
                  ? `თანხა დაბლოკილია თქვენს ბარათზე ${PAYMENT_HOLD_MAX_DAYS} დღით. ვადა: ${formatDate(getPaymentHoldExpiresAt(order).toISOString())}. გადახდის დადასტურებას ადმინისტრატორი განახორციელებს.`
                  : 'გმადლობთ თქვენი შეკვეთისთვის'}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-xl font-semibold text-black mb-6">
                  შეკვეთის ინფორმაცია
                </h2>

                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                    <span className="text-black font-medium">შეკვეთის ნომერი:</span>
                    <span className="text-black font-bold">#{order.id}</span>
                  </div>

                  <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                    <span className="text-black font-medium">სტატუსი:</span>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}
                    >
                      {getStatusLabel(order.status)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                    <span className="text-black font-medium">თარიღი:</span>
                    <span className="text-black">{formatDate(order.createdAt)}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-black font-medium">გადახდის მეთოდი:</span>
                    <span className="text-black">
                      {getPaymentMethodLabel(order.paymentMethod)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-xl font-semibold text-black mb-6">
                  მიწოდების ინფორმაცია
                </h2>

                <div className="space-y-3">
                  <div>
                    <span className="text-black text-sm">მიღების ტიპი:</span>
                    <p className="text-black font-medium">
                      {isDelivery ? 'მიტანა' : 'თვით მიღება'}
                    </p>
                  </div>
                  <div>
                    <span className="text-black text-sm">სახელი:</span>
                    <p className="text-black font-medium">{order.customerName}</p>
                  </div>
                  {order.email && (
                    <div>
                      <span className="text-black text-sm">ელ. ფოსტა:</span>
                      <p className="text-black font-medium">{order.email}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-black text-sm">ტელეფონი:</span>
                    <p className="text-black font-medium">{order.phone}</p>
                  </div>
                  <div>
                    <span className="text-black text-sm">მისამართი:</span>
                    <p className="text-black font-medium">{order.address}</p>
                  </div>
                  {order.city && (
                    <div>
                      <span className="text-black text-sm">ქალაქი:</span>
                      <p className="text-black font-medium">{order.city}</p>
                    </div>
                  )}
                  {isDelivery && deliverySpeed && (
                    <div>
                      <span className="text-black text-sm">მიტანის სიჩქარე:</span>
                      <p className="text-black font-medium">
                        {getDeliverySpeedLabel(deliverySpeed)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-xl font-semibold text-black mb-6">
                  შეკვეთილი ნივთები ({order.items.length})
                </h2>

                <div className="space-y-4">
                  {order.items.map((item) => {
                    const payable = getItemPayablePrice(item)
                    const savings = getItemBuyerSavings(item)
                    const hasDiscount = savings > 0

                    return (
                      <div
                        key={item.id}
                        className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg"
                      >
                        <div className="relative w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          <Image
                            src={item.image || '/placeholder.jpg'}
                            alt={item.productName}
                            fill
                            className="object-cover"
                            sizes="80px"
                          />
                          {item.isRental && (
                            <div className="absolute top-1 right-1 bg-blue-500 text-white text-xs px-1 py-0.5 rounded">
                              ქირა
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-medium text-black truncate">
                            {item.productName}
                          </h3>
                          {item.size && (
                            <p className="text-black text-sm">
                              ზომა: <span className="font-medium">{item.size}</span>
                            </p>
                          )}

                          {item.isRental &&
                            item.rentalStartDate &&
                            item.rentalEndDate && (
                              <div className="text-sm text-blue-600 mb-1">
                                <p>
                                  ქირაობის პერიოდი:{' '}
                                  {formatDate(item.rentalStartDate)} -{' '}
                                  {formatDate(item.rentalEndDate)}
                                </p>
                                {item.rentalDays != null && (
                                  <p>დღეების რაოდენობა: {item.rentalDays}</p>
                                )}
                              </div>
                            )}

                          {hasDiscount ? (
                            <div className="flex items-center gap-2 flex-wrap mt-1">
                              <span className="text-lg font-bold text-red-600">
                                ₾{(payable * item.quantity).toFixed(2)}
                              </span>
                              <span className="text-xs bg-[#1B3729] text-white px-2 py-1 rounded">
                                დანაზოგი: ₾{(savings * item.quantity).toFixed(2)}
                              </span>
                            </div>
                          ) : (
                            <p className="text-lg font-bold text-black">
                              ₾{(payable * item.quantity).toFixed(2)}
                            </p>
                          )}
                        </div>

                        <div className="text-center">
                          <span className="text-sm text-black">რაოდენობა:</span>
                          <div className="font-medium text-black">{item.quantity}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-sm p-6 sticky top-8">
                <h2 className="text-xl font-semibold text-black mb-6">
                  შეკვეთის შეჯამება
                </h2>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between text-black">
                    <span>ყიდვის ნივთები:</span>
                    <span className="font-medium">
                      {order.items
                        .filter((item) => !item.isRental)
                        .reduce((total, item) => total + item.quantity, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-black">
                    <span>ქირაობის ნივთები:</span>
                    <span className="font-medium">
                      {order.items.filter((item) => item.isRental).length}
                    </span>
                  </div>
                  <div className="flex justify-between text-black">
                    <span>ნივთების ჯამი:</span>
                    <span className="font-medium">₾{itemsSubtotal.toFixed(2)}</span>
                  </div>
                  {order.voucherDiscount != null && order.voucherDiscount > 0 && (
                    <div className="flex justify-between text-green-700">
                      <span>
                        ვაუჩერი
                        {order.voucherCode ? ` (${order.voucherCode})` : ''}:
                      </span>
                      <span className="font-medium">
                        -₾{order.voucherDiscount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {isDelivery &&
                    order.deliveryPrice != null &&
                    order.deliveryPrice > 0 &&
                    deliverySpeed && (
                      <div className="flex justify-between text-black">
                        <span>მიტანა ({getDeliverySpeedLabel(deliverySpeed)}):</span>
                        <span className="font-medium">
                          ₾{order.deliveryPrice.toFixed(2)}
                        </span>
                      </div>
                    )}
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between text-black">
                      <span className="font-semibold">ჯამური ღირებულება:</span>
                      <span className="font-bold text-lg">
                        ₾{order.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Link
                    href="/shop"
                    className="flex items-center justify-center w-full bg-[#1B3729] text-white px-8 py-4 rounded-lg font-bold uppercase tracking-wide transition-colors duration-300 hover:opacity-95"
                  >
                    <ShoppingBag className="w-5 h-5 mr-2" />
                    გაგრძელება შოპინგი
                  </Link>

                  <Link
                    href="/"
                    className="flex items-center md:text-[18px] text-[16px] justify-center w-full bg-gray-100 text-black py-4 px-6 rounded-lg font-semibold text-lg hover:bg-gray-200 transition-colors"
                  >
                    <Home className="w-5 h-5 mr-2" />
                    მთავარ გვერდზე დაბრუნება
                  </Link>
                </div>

                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-black mb-2">რა ხდება შემდეგ?</h3>
                  <p className="text-black text-sm">
                    თქვენი შეკვეთა მიღებულია და მუშავდება. დეტალური ინფორმაცია
                    ასევე გამოგიგზავნათ ელ. ფოსტაზე.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const OrderConfirmationPage = () => {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <OrderConfirmationContent />
    </Suspense>
  )
}

export default OrderConfirmationPage
