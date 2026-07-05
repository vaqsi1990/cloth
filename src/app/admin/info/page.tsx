'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Info, Check, Trash2, ChevronDown, ChevronUp, BarChart3 } from 'lucide-react'
import Image from '@/component/AppImage'
import { formatDate } from '@/utils/dateUtils'
import {
  fromPrismaDeliverySpeed,
  getDeliverySpeedLabel,
} from '@/lib/delivery'
import { markAdminSectionSeen } from '@/lib/admin-dashboard-seen'
import OrderItemSaleStatusDropdown from '@/components/OrderItemSaleStatusDropdown'
import type { OrderItemSaleStatusFields } from '@/components/OrderItemSaleStatusActions'
import { getSaleItemFulfillmentLabel } from '@/lib/order-item-sale-status'

interface OrderItemProduct {
  id: number
  name: string
  pickupAddress?: string | null
  user?: {
    id: string
    name?: string | null
    email?: string | null
    phone?: string | null
    pickupAddress?: string | null
    address?: string | null
  } | null
}

interface AdminOrderItem {
  id: number
  productName: string
  price: number
  quantity: number
  size?: string | null
  isRental?: boolean | null
  rentalStartDate?: string | null
  rentalEndDate?: string | null
  rentalDays?: number | null
  sellerMarkedTransferred?: boolean
  sellerMarkedTransferredAt?: string | null
  sellerCanceledItem?: boolean
  sellerCanceledAt?: string | null
  sellerReportedOutOfStock?: boolean
  sellerReportedDamaged?: boolean
  product?: OrderItemProduct | null
}

interface AdminOrder {
  id: number
  createdAt: string
  status: string
  total: number
  customerName: string
  phone: string
  email?: string | null
  address: string
  city?: string | null
  note?: string | null
  paymentMethod?: string | null
  deliveryCityId?: number | null
  deliverySpeed?: string | null
  deliveryPrice?: number | null
  deliveryCity?: { name: string } | null
  user?: {
    name?: string | null
    email?: string | null
    image?: string | null
    address?: string | null
    location?: string | null
  } | null
  items: AdminOrderItem[]
}

interface OrderInfoRow {
  id: number
  orderId: number
  orderStatus: string
  orderType: 'RENTAL' | 'PURCHASE'
  customerName: string
  email: string
  phone: string
  userAddress: string
  objectAddress: string
  pickupAddress: string
  sellerName: string
  sellerPhone: string
  productsLabel: string
  purchaseItems: AdminOrderItem[]
  rentalPeriod: string
  deliveryLabel: string
  total: number
  paymentMethod: string
  note: string
  date: string
  userImage?: string
}

const formatDateShort = (date: Date | string) => {
  if (!date) return ''
  const d = new Date(date)
  const months = [
    'იანვ.', 'თებ.', 'მარ.', 'აპრ.', 'მაი.', 'ივნ.',
    'ივლ.', 'აგვ.', 'სექტ.', 'ოქტ.', 'ნოემ.', 'დეკ.',
  ]
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

async function fetchAllAdminOrders(): Promise<AdminOrder[]> {
  const allOrders: AdminOrder[] = []
  let page = 1
  let totalPages = 1

  do {
    const response = await fetch(`/api/admin/orders?page=${page}&limit=200`)
    const data = await response.json()
    if (!data.success) break
    allOrders.push(...(data.orders || []))
    totalPages = data.totalPages ?? 1
    page += 1
  } while (page <= totalPages)

  return allOrders
}

function buildBuyerAddress(order: AdminOrder): string {
  const parts = [
    order.user?.address,
    order.user?.location,
    order.city,
    order.address,
  ].filter((part) => part && part.trim() !== '')

  return [...new Set(parts)].join(', ')
}

function buildSellerPickupAddress(order: AdminOrder): string {
  const addresses = order.items
    .map((item) => item.product?.pickupAddress || item.product?.user?.pickupAddress)
    .filter((address): address is string => Boolean(address?.trim()))

  return [...new Set(addresses)].join('; ')
}

function buildSellerName(order: AdminOrder): string {
  const names = order.items
    .map((item) => item.product?.user?.name)
    .filter((name): name is string => Boolean(name?.trim()))

  return [...new Set(names)].join(', ')
}

function buildSellerPhone(order: AdminOrder): string {
  const phones = order.items
    .map((item) => item.product?.user?.phone)
    .filter((phone): phone is string => Boolean(phone?.trim()))

  return [...new Set(phones)].join(', ')
}

function buildProductsLabel(items: AdminOrderItem[], rentalOnly: boolean): string {
  const filtered = items.filter((item) =>
    rentalOnly ? item.isRental : !item.isRental,
  )

  return filtered
    .map((item) => {
      const name = item.product?.name || item.productName
      const size = item.size ? ` (${item.size})` : ''
      return `${name}${size} ×${item.quantity}`
    })
    .join('; ')
}

function buildRentalPeriod(items: AdminOrderItem[]): string {
  const rentalItems = items.filter(
    (item) => item.isRental && item.rentalStartDate && item.rentalEndDate,
  )

  if (rentalItems.length === 0) return '-'

  return rentalItems
    .map((item) => {
      const days = item.rentalDays ? `, ${item.rentalDays} დღე` : ''
      return `${formatDate(item.rentalStartDate!)} – ${formatDate(item.rentalEndDate!)}${days}`
    })
    .join('; ')
}

function buildDeliveryLabel(order: AdminOrder): string {
  if (order.deliveryCityId && order.deliveryCity?.name) {
    const speed = fromPrismaDeliverySpeed(order.deliverySpeed as 'EXTRA' | 'STANDARD' | null)
    const speedLabel = speed ? getDeliverySpeedLabel(speed) : ''
    const price =
      typeof order.deliveryPrice === 'number'
        ? `, ₾${order.deliveryPrice.toFixed(2)}`
        : ''
    return `მიტანა: ${order.deliveryCity.name}${speedLabel ? `, ${speedLabel}` : ''}${price}`
  }

  return 'ადგილიდან გატანა'
}

function buildObjectAddress(order: AdminOrder): string {
  const pickup = buildSellerPickupAddress(order)
  if (pickup) return pickup
  if (order.deliveryCity?.name) return order.deliveryCity.name
  if (order.address?.trim()) return order.address
  return '-'
}

function transformOrdersToRows(orders: AdminOrder[]): OrderInfoRow[] {
  const rows: OrderInfoRow[] = []

  orders.forEach((order) => {
    if (order.status !== 'PAID' && order.status !== 'SHIPPED') return

    const hasRental = order.items.some((item) => item.isRental)
    const purchaseItems = order.items.filter((item) => !item.isRental)
    const hasPurchase = purchaseItems.length > 0
    const buyerAddress = buildBuyerAddress(order)
    const pickupAddress = buildSellerPickupAddress(order)
    const objectAddress = buildObjectAddress(order)
    const sellerName = buildSellerName(order)
    const sellerPhone = buildSellerPhone(order)
    const deliveryLabel = buildDeliveryLabel(order)

    const base = {
      orderId: order.id,
      orderStatus: order.status,
      customerName: order.customerName || order.user?.name || 'უცნობი',
      email: order.email || order.user?.email || '-',
      phone: order.phone || '-',
      userAddress: buyerAddress || '-',
      objectAddress,
      pickupAddress: pickupAddress || '-',
      sellerName: sellerName || '-',
      sellerPhone: sellerPhone || '-',
      deliveryLabel,
      total: order.total,
      paymentMethod: order.paymentMethod || '-',
      note: order.note || '-',
      date: order.createdAt,
      userImage: order.user?.image || undefined,
    }

    if (hasRental) {
      rows.push({
        ...base,
        id: order.id * 10 + 1,
        orderType: 'RENTAL',
        productsLabel: buildProductsLabel(order.items, true),
        purchaseItems: [],
        rentalPeriod: buildRentalPeriod(order.items),
      })
    }

    if (hasPurchase) {
      rows.push({
        ...base,
        id: order.id * 10 + 2,
        orderType: 'PURCHASE',
        productsLabel: buildProductsLabel(order.items, false),
        purchaseItems,
        rentalPeriod: '-',
      })
    }
  })

  return rows
}

function DetailItem({
  label,
  value,
  className = '',
}: {
  label: string
  value: React.ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-xl border border-gray-100 bg-gray-50 p-4 ${className}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">{label}</p>
      <div className="text-sm sm:text-base text-black break-words">{value}</div>
    </div>
  )
}

function OrderDetailsPanel({
  row,
  onItemUpdate,
}: {
  row: OrderInfoRow
  onItemUpdate: (orderId: number, itemId: number, patch: Partial<OrderItemSaleStatusFields>) => void
}) {
  return (
    <div className="px-4 sm:px-6 py-5 border-t border-[#1B3729]/20 bg-[#1B3729]/5">
      <div className="mb-4">
        <p className="text-sm font-semibold text-[#1B3729]">შეკვეთის დეტალები — #{row.orderId}</p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <DetailItem label="მყიდველი" value={row.customerName} />
          <DetailItem label="ტელეფონი" value={row.phone} />
          <DetailItem label="ელფოსტა" value={row.email} />
        </div>

        <DetailItem label="პროდუქტები" value={row.productsLabel} />

        {row.orderType === 'PURCHASE' && row.purchaseItems.length > 0 && (
          <div className="rounded-xl border border-gray-100 bg-white p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              ყიდვის ნივთების სტატუსი
            </p>
            {row.purchaseItems.map((item) => {
              const fulfillmentLabel = getSaleItemFulfillmentLabel(item)
              const productName = item.product?.name || item.productName
              const sizeLabel = item.size ? ` (${item.size})` : ''

              return (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-black break-words">
                      {productName}
                      {sizeLabel}
                      {item.quantity > 1 ? ` ×${item.quantity}` : ''}
                    </p>
                    {fulfillmentLabel && (
                      <p className="text-xs text-gray-600 mt-1">
                        მიმდინარე სტატუსი: {fulfillmentLabel}
                      </p>
                    )}
                  </div>
                  <OrderItemSaleStatusDropdown
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
                    orderStatus={row.orderStatus}
                    variant="compact"
                    onItemUpdate={(itemId, patch) => onItemUpdate(row.orderId, itemId, patch)}
                  />
                </div>
              )
            })}
          </div>
        )}

        {row.orderType === 'RENTAL' && row.rentalPeriod !== '-' && (
          <DetailItem label="ქირაობის პერიოდი" value={row.rentalPeriod} />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DetailItem label="მყიდველის მისამართი" value={row.userAddress} />
          <DetailItem label="ობიექტის მისამართი" value={row.objectAddress} />
          <DetailItem label="გატანის მისამართი" value={row.pickupAddress} />
          <DetailItem label="მიწოდება" value={row.deliveryLabel} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DetailItem label="გამყიდველი" value={row.sellerName} />
          <DetailItem label="გამყიდველის ტელეფონი" value={row.sellerPhone} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <DetailItem
            label="თანხა"
            value={<span className="text-xl font-bold text-[#1B3729]">₾{row.total.toFixed(2)}</span>}
          />
          <DetailItem label="გადახდის მეთოდი" value={row.paymentMethod} />
          <DetailItem label="შენიშვნა" value={row.note} />
        </div>
      </div>
    </div>
  )
}

const AdminInfoPage = () => {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [filter, setFilter] = useState<'ALL' | 'RENTAL' | 'PURCHASE'>('ALL')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null)

  const toggleRowDetails = (rowId: number) => {
    setExpandedRowId((current) => (current === rowId ? null : rowId))
  }

  const orderRows = React.useMemo(() => transformOrdersToRows(orders), [orders])

  const updateOrderItem = (
    orderId: number,
    itemId: number,
    patch: Partial<OrderItemSaleStatusFields>,
  ) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId
          ? {
              ...order,
              items: order.items.map((item) =>
                item.id === itemId ? { ...item, ...patch } : item,
              ),
            }
          : order,
      ),
    )
  }

  const loadOrders = useCallback(async () => {
    if (status !== 'authenticated' || session?.user?.role !== 'ADMIN') return

    try {
      setLoading(true)
      const fetchedOrders = await fetchAllAdminOrders()
      setOrders(fetchedOrders)
    } catch (error) {
      console.error('Error fetching delivery users:', error)
    } finally {
      setLoading(false)
    }
  }, [status, session?.user?.role])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role === 'ADMIN') {
      markAdminSectionSeen('salesInfo')
    }
  }, [status, session?.user?.role])

  useEffect(() => {
    void loadOrders()
  }, [loadOrders])

  const getFilteredRows = () => {
    if (filter === 'RENTAL') return orderRows.filter((row) => row.orderType === 'RENTAL')
    if (filter === 'PURCHASE') return orderRows.filter((row) => row.orderType === 'PURCHASE')
    return orderRows
  }

  const filteredRows = getFilteredRows()
  const rentalCount = orderRows.filter((row) => row.orderType === 'RENTAL').length
  const purchaseCount = orderRows.filter((row) => row.orderType === 'PURCHASE').length
  const uniqueOrderCount = new Set(orderRows.map((row) => row.orderId)).size

  const toggleSelection = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (
      filteredRows.length > 0 &&
      filteredRows.every((row) => selectedIds.has(row.id))
    ) {
      setSelectedIds(new Set())
      return
    }
    setSelectedIds(new Set(filteredRows.map((row) => row.id)))
  }

  const handleRemoveSelected = async () => {
    if (selectedIds.size === 0) {
      alert('გთხოვთ აირჩიოთ მინიმუმ ერთი ელემენტი წასაშლელად')
      return
    }

    if (
      !confirm(
        `დარწმუნებული ხართ, რომ გსურთ ${selectedIds.size} ელემენტის წაშლა? ეს ქმედება შეუქცევადია.`,
      )
    ) {
      return
    }

    setDeleting(true)
    try {
      const selectedRows = orderRows.filter((row) => selectedIds.has(row.id))
      const uniqueOrderIds = [...new Set(selectedRows.map((row) => row.orderId))]

      const results = await Promise.allSettled(
        uniqueOrderIds.map(async (orderId) => {
          const response = await fetch(`/api/orders/${orderId}`, { method: 'DELETE' })
          if (!response.ok) {
            const data = await response.json()
            throw new Error(data.message || `Failed to delete order ${orderId}`)
          }
          return response.json()
        }),
      )

      const errors = results.filter((result) => result.status === 'rejected')
      const successful = results.filter((result) => result.status === 'fulfilled')

      if (errors.length > 0) {
        alert(
          `შეცდომა: ${errors.length} შეკვეთის წაშლა ვერ მოხერხდა. ${successful.length} შეკვეთა წაიშალა.`,
        )
      } else {
        alert(`${successful.length} შეკვეთა წარმატებით წაიშალა`)
      }

      setSelectedIds(new Set())
      await loadOrders()
    } catch (error) {
      console.error('Error deleting orders:', error)
      alert('შეცდომა შეკვეთების წაშლისას')
    } finally {
      setDeleting(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session || session.user.role !== 'ADMIN') {
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex items-center space-x-2 text-black hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 sm:w-7 sm:h-7 font-bold" />
              <span className="text-sm sm:text-base md:text-lg lg:text-[20px] font-bold text-black">
                უკან დაბრუნება
              </span>
            </button>
            <Link
              href="/admin/analytics"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-black hover:bg-gray-50 transition-colors text-sm sm:text-base font-medium"
            >
              <BarChart3 className="w-4 h-4" />
              ანალიტიკა
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 mb-4 sm:mb-6">
          <div className="flex items-start space-x-2 sm:space-x-3 mb-4 sm:mb-6">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Info className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-black mb-3">
                შეკვეთების ინფორმაცია
              </h1>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <p className="text-sm sm:text-base md:text-[18px] text-black">
                  მიტანით სარგებლობს:{' '}
                  <span className="text-2xl sm:text-3xl font-bold text-red-600">{rentalCount}</span>
                </p>
                <p className="text-sm sm:text-base md:text-[18px] text-black">
                  ყიდვით:{' '}
                  <span className="text-2xl sm:text-3xl font-bold text-red-600">{purchaseCount}</span>
                </p>
                <p className="text-sm sm:text-base md:text-[18px] text-black">
                  სულ შეკვეთა:{' '}
                  <span className="text-2xl sm:text-3xl font-bold text-red-600">{uniqueOrderCount}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-3 sm:px-6 py-1.5 sm:py-2 md:text-[18px] text-[16px] rounded-lg font-medium transition-colors ${
                filter === 'ALL'
                  ? 'bg-[#1B3729] text-white'
                  : 'bg-[#E4F0EC] text-green-700 hover:bg-green-200'
              }`}
            >
              ყველა
            </button>
            <button
              onClick={() => setFilter('RENTAL')}
              className={`px-3 sm:px-6 py-1.5 sm:py-2 md:text-[18px] text-[16px] rounded-lg font-medium transition-colors ${
                filter === 'RENTAL'
                  ? 'bg-[#1B3729] text-white'
                  : 'bg-[#E4F0EC] text-green-700 hover:bg-green-200'
              }`}
            >
              გაქირავება
            </button>
            <button
              onClick={() => setFilter('PURCHASE')}
              className={`px-3 sm:px-6 py-1.5 sm:py-2 md:text-[18px] text-[16px] rounded-lg font-medium transition-colors ${
                filter === 'PURCHASE'
                  ? 'bg-[#1B3729] text-white'
                  : 'bg-[#E4F0EC] text-green-700 hover:bg-green-200'
              }`}
            >
              ყიდვა
            </button>
            {selectedIds.size > 0 && (
              <button
                onClick={handleRemoveSelected}
                disabled={deleting}
                className="ml-auto px-3 sm:px-6 py-1.5 sm:py-2 md:text-[18px] text-[16px] rounded-lg font-medium transition-colors bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>{deleting ? 'წაშლა...' : `წაშლა (${selectedIds.size})`}</span>
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-green-50">
                  <th className="px-3 sm:px-4 py-3 text-left sticky left-0 bg-green-50 z-10">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-gray-400 rounded flex items-center justify-center hover:border-green-600 transition-colors"
                    >
                      {filteredRows.length > 0 &&
                        filteredRows.every((row) => selectedIds.has(row.id)) && (
                          <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                        )}
                    </button>
                  </th>
                  <th className="px-3 sm:px-4 py-3 text-left text-sm font-semibold text-black whitespace-nowrap">ტიპი</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-sm font-semibold text-black whitespace-nowrap">შეკვეთა</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-sm font-semibold text-black whitespace-nowrap">თარიღი</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-sm font-semibold text-black whitespace-nowrap min-w-[140px]">მყიდველი</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-sm font-semibold text-black whitespace-nowrap min-w-[180px]">პროდუქტები</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-sm font-semibold text-black whitespace-nowrap min-w-[140px]">სტატუსი</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-sm font-semibold text-black whitespace-nowrap">დეტალები</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500 md:text-[18px] text-[16px]">
                      არ არის მონაცემები
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => {
                    const isExpanded = expandedRowId === row.id

                    return (
                      <React.Fragment key={row.id}>
                        <tr
                          className={`transition-colors align-middle ${
                            isExpanded ? 'bg-[#1B3729]/5' : 'hover:bg-gray-50'
                          }`}
                        >
                          <td className={`px-3 sm:px-4 py-3 sticky left-0 z-10 border-r border-gray-100 ${isExpanded ? 'bg-[#1B3729]/5' : 'bg-white'}`}>
                            <button
                              type="button"
                              onClick={() => toggleSelection(row.id)}
                              className={`w-4 h-4 sm:w-5 sm:h-5 border-2 rounded flex items-center justify-center transition-colors ${
                                selectedIds.has(row.id)
                                  ? 'bg-green-600 border-green-600'
                                  : 'border-gray-400 hover:border-green-600'
                              }`}
                            >
                              {selectedIds.has(row.id) && (
                                <Check className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                              )}
                            </button>
                          </td>
                          <td className="px-3 sm:px-4 py-3">
                            <span
                              className={`inline-block px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                                row.orderType === 'RENTAL'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {row.orderType === 'RENTAL' ? 'გაქირავება' : 'ყიდვა'}
                            </span>
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-sm text-black font-medium whitespace-nowrap">
                            #{row.orderId}
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-sm text-black whitespace-nowrap">
                            {formatDateShort(row.date)}
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-sm text-black">
                            <div className="flex items-center gap-2 min-w-[120px]">
                              <div className="w-8 h-8 bg-gray-200 rounded-full overflow-hidden flex-shrink-0">
                                {row.userImage ? (
                                  <Image
                                    src={row.userImage}
                                    alt={row.customerName}
                                    width={32}
                                    height={32}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gray-300 flex items-center justify-center text-xs text-gray-600">
                                    {row.customerName.charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <span className="font-medium break-words">{row.customerName}</span>
                            </div>
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-sm text-black break-words max-w-[260px]">
                            {row.productsLabel}
                          </td>
                          <td className="px-3 sm:px-4 py-3">
                            {row.orderType === 'PURCHASE' ? (
                              <div className="flex flex-col gap-2 min-w-[120px]">
                                {row.purchaseItems.map((item) => (
                                  <OrderItemSaleStatusDropdown
                                    key={item.id}
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
                                    orderStatus={row.orderStatus}
                                    variant="compact"
                                    onItemUpdate={(itemId, patch) =>
                                      updateOrderItem(row.orderId, itemId, patch)
                                    }
                                  />
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-500">—</span>
                            )}
                          </td>
                          <td className="px-3 sm:px-4 py-3">
                            <button
                              type="button"
                              onClick={() => toggleRowDetails(row.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-[#1B3729] rounded-lg hover:opacity-95 transition-opacity whitespace-nowrap"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                              დეტალურად
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={8} className="p-0">
                              <OrderDetailsPanel row={row} onItemUpdate={updateOrderItem} />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })
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
