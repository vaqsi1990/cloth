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
import { ORDER_ITEM_RETURNED_STATUS_LABEL } from '@/lib/order-item-fulfillment-status'
import { getPendingFulfillmentSaleItems, getSaleItemFulfillmentLabel } from '@/lib/order-item-sale-status'

type AdminInfoFilter =
  | 'PENDING'
  | 'ALL'
  | 'RENTAL'
  | 'PURCHASE'
  | 'TRANSFERRED'
  | 'CANCELED'

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
  statusItems: AdminOrderItem[]
  rentalPeriod: string
  deliveryLabel: string
  deliveryServiceLabel: string
  total: number
  paymentMethod: string
  note: string
  date: string
  userImage?: string
}

const mobileInfoBorderClass = 'border-b border-black pb-3 md:border-b-0 md:pb-0'

function MobileInfoBox({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={`${mobileInfoBorderClass} ${className}`}>{children}</div>
}

function BuyerProfile({
  name,
  image,
  className = '',
}: {
  name: string
  image?: string
  className?: string
}) {
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      {image ? (
        <div className="w-12 h-12 bg-gray-200 rounded-full overflow-hidden shrink-0">
          <Image
            src={image}
            alt={name}
            width={48}
            height={48}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="w-12 h-12 bg-gray-200 rounded-full shrink-0 flex items-center justify-center text-gray-500 text-sm font-semibold">
          {name.charAt(0).toUpperCase()}
        </div>
      )}
      <span className="text-sm text-black font-medium text-center break-words">{name}</span>
    </div>
  )
}

function BuyerContactInfo({
  phone,
  address,
  className = '',
  showTitle = true,
}: {
  phone: string
  address: string
  className?: string
  showTitle?: boolean
}) {
  return (
    <div className={`text-sm text-black space-y-2 ${className}`}>
      {showTitle && (
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">მყიდველის ინფორმაცია</p>
      )}
      <div className="space-y-1">
        <p className="break-words">
          <span className="text-gray-500">ტელეფონი:</span> {phone}
        </p>
        <p className="break-words">
          <span className="text-gray-500">მისამართი:</span> {address}
        </p>
      </div>
    </div>
  )
}

function SellerContactInfo({
  phone,
  address,
  className = '',
  showTitle = true,
}: {
  phone: string
  address: string
  className?: string
  showTitle?: boolean
}) {
  return (
    <div className={`text-sm text-black space-y-2 ${className}`}>
      {showTitle && (
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">გამყიდველის ინფორმაცია</p>
      )}
      <div className="space-y-1">
        <p className="break-words">
          <span className="text-gray-500">ტელეფონი:</span> {phone}
        </p>
        <p className="break-words">
          <span className="text-gray-500">მისამართი:</span> {address}
        </p>
      </div>
    </div>
  )
}

function formatOrderDateNumeric(date: Date | string): string {
  if (!date) return '-'
  const d = new Date(date)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}.${month}.${year}`
}

function OrderMetaInfo({
  orderId,
  deliveryType,
  orderDate,
  className = '',
  showTitle = true,
}: {
  orderId: number
  deliveryType: string
  orderDate: string
  className?: string
  showTitle?: boolean
}) {
  return (
    <div className={`text-sm text-black space-y-2 ${className}`}>
      {showTitle && (
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">შეკვეთის ინფორმაცია</p>
      )}
      <div className="space-y-1">
        <p className="break-words">
          <span className="text-gray-500">გაყიდვის ნომერი:</span> #{orderId}
        </p>
        <p className="break-words">{formatOrderDateNumeric(orderDate)}</p>
        <p className="break-words">
          <span className="text-gray-500">მიტანის ტიპი:</span> {deliveryType}
        </p>
      </div>
    </div>
  )
}

function OrderInfoFields({ row, className = '' }: { row: OrderInfoRow; className?: string }) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${className}`}>
      <MobileInfoBox>
        <OrderMetaInfo orderId={row.orderId} deliveryType={row.deliveryServiceLabel} orderDate={row.date} />
      </MobileInfoBox>
      <MobileInfoBox>
        <BuyerProfile name={row.customerName} image={row.userImage} />
      </MobileInfoBox>
      <MobileInfoBox>
        <BuyerContactInfo phone={row.phone} address={row.userAddress} />
      </MobileInfoBox>
      <MobileInfoBox>
        <SellerContactInfo phone={row.sellerPhone} address={row.pickupAddress} />
      </MobileInfoBox>
    </div>
  )
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

function formatItemOriginalPrice(price: number): string {
  return `₾${Number(price || 0).toFixed(2)}`
}

function buildProductsLabel(items: AdminOrderItem[], rentalOnly: boolean): string {
  const filtered = items.filter((item) =>
    rentalOnly ? item.isRental : !item.isRental,
  )

  return filtered
    .map((item) => {
      const name = item.product?.name || item.productName
      const size = item.size ? ` (${item.size})` : ''
      const price = formatItemOriginalPrice(item.price)
      return `${name}${size} ×${item.quantity} · ორიგინალი ფასი: ${price}`
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

function buildDeliveryServiceLabel(order: AdminOrder): string {
  if (!order.deliveryCityId) return 'ადგილიდან გატანა'
  const speed = fromPrismaDeliverySpeed(order.deliverySpeed as 'EXTRA' | 'STANDARD' | null)
  if (speed === 'extra') return 'ექსტრა'
  if (speed === 'standard') return 'სტანდარტული'
  return '-'
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
    const deliveryServiceLabel = buildDeliveryServiceLabel(order)

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
      deliveryServiceLabel,
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
        statusItems: order.items.filter((item) => item.isRental),
        rentalPeriod: buildRentalPeriod(order.items),
      })
    }

    if (hasPurchase) {
      rows.push({
        ...base,
        id: order.id * 10 + 2,
        orderType: 'PURCHASE',
        productsLabel: buildProductsLabel(order.items, false),
        statusItems: purchaseItems,
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
    <div className={`rounded-xl border border-gray-100 bg-gray-50 p-4 text-center md:text-left max-md:rounded-none max-md:border-0 max-md:border-b max-md:border-black max-md:bg-transparent ${className}`}>
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
    <div className="px-4 sm:px-6 py-5 border-t border-[#1B3729]/20 bg-[#1B3729]/5 text-center md:text-left">
      <div className="mb-4">
        <p className="text-sm font-semibold text-[#1B3729]">შეკვეთის დეტალები — #{row.orderId}</p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <DetailItem
            label="მყიდველი"
            value={
              <div className="flex flex-col items-center md:items-start gap-2">
                {row.userImage ? (
                  <div className="w-12 h-12 bg-gray-200 rounded-full overflow-hidden shrink-0">
                    <Image
                      src={row.userImage}
                      alt={row.customerName}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : null}
                <span>{row.customerName}</span>
              </div>
            }
          />
          <DetailItem label="ტელეფონი" value={row.phone} />
          <DetailItem label="ელფოსტა" value={row.email} />
        </div>

        <DetailItem label="პროდუქტები" value={row.productsLabel} />

        {row.statusItems.length > 0 && (
          <div className="rounded-xl border border-gray-100 bg-white p-4 space-y-3 text-center md:text-left max-md:rounded-none max-md:border-0 max-md:border-b max-md:border-black max-md:bg-transparent">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {row.orderType === 'RENTAL' ? 'ქირავების ნივთების სტატუსი' : 'ყიდვის ნივთების სტატუსი'}
            </p>
            {row.statusItems.map((item) => {
              const fulfillmentLabel = getSaleItemFulfillmentLabel(item)
              const productName = item.product?.name || item.productName
              const sizeLabel = item.size ? ` (${item.size})` : ''

              return (
                <div
                  key={item.id}
                  className="flex flex-col items-center sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 max-md:rounded-none max-md:border-0 max-md:border-b max-md:border-black max-md:bg-transparent"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-black break-words">
                      {productName}
                      {sizeLabel}
                      {item.quantity > 1 ? ` ×${item.quantity}` : ''}
                    </p>
                    <p className="text-xs text-gray-700 mt-1">
                      ორიგინალი ფასი:{' '}
                      <span className="font-semibold text-black">
                        {formatItemOriginalPrice(item.price)}
                      </span>
                      {item.quantity > 1
                        ? ` · ჯამი: ${formatItemOriginalPrice(item.price * item.quantity)}`
                        : ''}
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

function OrderInfoRowCard({
  row,
  isExpanded,
  isSelected,
  onToggleSelect,
  onToggleDetails,
  onItemUpdate,
}: {
  row: OrderInfoRow
  isExpanded: boolean
  isSelected: boolean
  onToggleSelect: () => void
  onToggleDetails: () => void
  onItemUpdate: (orderId: number, itemId: number, patch: Partial<OrderItemSaleStatusFields>) => void
}) {
  return (
    <div
      className={`rounded-xl border overflow-hidden ${
        isExpanded ? 'border-[#1B3729]/30 bg-[#1B3729]/5' : 'border-gray-200 bg-white'
      }`}
    >
      <div className="p-4 space-y-3 text-center relative">
        <button
          type="button"
          onClick={onToggleSelect}
          className={`absolute top-4 right-4 w-5 h-5 border-2 rounded flex items-center justify-center shrink-0 transition-colors ${
            isSelected
              ? 'bg-green-600 border-green-600'
              : 'border-gray-400 hover:border-green-600'
          }`}
        >
          {isSelected && <Check className="w-4 h-4 text-white" />}
        </button>

        <OrderInfoFields row={row} className="text-center sm:text-left" />

        {row.statusItems.length > 0 && (
          <MobileInfoBox className="space-y-2 flex flex-col items-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">სტატუსი</p>
            {row.statusItems.map((item) => (
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
                onItemUpdate={(itemId, patch) => onItemUpdate(row.orderId, itemId, patch)}
              />
            ))}
          </MobileInfoBox>
        )}

        <button
          type="button"
          onClick={onToggleDetails}
          className=""
        >
          {isExpanded ? <ChevronUp className="w-8 h-8" /> : <ChevronDown className="w-8 h-8" />}
       
        </button>
      </div>

      {isExpanded && (
        <OrderDetailsPanel row={row} onItemUpdate={onItemUpdate} />
      )}
    </div>
  )
}

const AdminInfoPage = () => {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [filter, setFilter] = useState<AdminInfoFilter>('PENDING')
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
    if (filter === 'PENDING') {
      return orderRows.filter(
        (row) => getPendingFulfillmentSaleItems(row.statusItems).length > 0,
      )
    }
    if (filter === 'RENTAL') {
      return orderRows.filter((row) => row.orderType === 'RENTAL')
    }
    if (filter === 'PURCHASE') {
      return orderRows.filter((row) => row.orderType === 'PURCHASE')
    }
    if (filter === 'TRANSFERRED') {
      return orderRows.filter((row) =>
        row.statusItems.some((item) => item.sellerMarkedTransferred === true),
      )
    }
    if (filter === 'CANCELED') {
      return orderRows.filter((row) =>
        row.statusItems.some((item) => item.sellerCanceledItem === true),
      )
    }
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
          <div className="flex flex-col items-center text-center sm:flex-row sm:items-center sm:justify-between sm:text-left gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex items-center justify-center space-x-2 text-black hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 sm:w-7 sm:h-7 font-bold" />
              <span className="text-sm sm:text-base md:text-lg lg:text-[20px] font-bold text-black">
                უკან დაბრუნებული
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
          <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left space-y-3 sm:space-y-0 sm:space-x-3 mb-4 sm:mb-6">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Info className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-black mb-3">
                შეკვეთების ინფორმაცია
              </h1>
              <div className="flex flex-wrap justify-center sm:justify-start gap-x-6 gap-y-2">
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

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3">
            <button
              onClick={() => setFilter('PENDING')}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base rounded-lg font-medium transition-colors ${
                filter === 'PENDING'
                  ? 'bg-[#1B3729] text-white'
                  : 'bg-[#E4F0EC] text-green-700 hover:bg-green-200'
              }`}
            >
              მოლოდინში
            </button>
            <button
              onClick={() => setFilter('ALL')}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base rounded-lg font-medium transition-colors ${
                filter === 'ALL'
                  ? 'bg-[#1B3729] text-white'
                  : 'bg-[#E4F0EC] text-green-700 hover:bg-green-200'
              }`}
            >
              ყველა
            </button>
            <button
              onClick={() => setFilter('RENTAL')}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base rounded-lg font-medium transition-colors ${
                filter === 'RENTAL'
                  ? 'bg-[#1B3729] text-white'
                  : 'bg-[#E4F0EC] text-green-700 hover:bg-green-200'
              }`}
            >
              გაქირავება
            </button>
            <button
              onClick={() => setFilter('PURCHASE')}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base rounded-lg font-medium transition-colors ${
                filter === 'PURCHASE'
                  ? 'bg-[#1B3729] text-white'
                  : 'bg-[#E4F0EC] text-green-700 hover:bg-green-200'
              }`}
            >
              ყიდვა
            </button>
            <button
              onClick={() => setFilter('TRANSFERRED')}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base rounded-lg font-medium transition-colors ${
                filter === 'TRANSFERRED'
                  ? 'bg-[#1B3729] text-white'
                  : 'bg-[#E4F0EC] text-green-700 hover:bg-green-200'
              }`}
            >
              გაცემული
            </button>
            <button
              onClick={() => setFilter('CANCELED')}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base rounded-lg font-medium transition-colors ${
                filter === 'CANCELED'
                  ? 'bg-[#1B3729] text-white'
                  : 'bg-[#E4F0EC] text-green-700 hover:bg-green-200'
              }`}
            >
              {ORDER_ITEM_RETURNED_STATUS_LABEL}
            </button>
            {selectedIds.size > 0 && (
              <button
                onClick={handleRemoveSelected}
                disabled={deleting}
                className="w-full sm:w-auto sm:ml-auto px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base rounded-lg font-medium transition-colors bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>{deleting ? 'წაშლა...' : `წაშლა (${selectedIds.size})`}</span>
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Mobile cards */}
          <div className="md:hidden p-3 sm:p-4 space-y-[5px] text-center">
            {filteredRows.length > 0 && (
              <div className="flex flex-col items-center gap-2 pb-1">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="inline-flex items-center justify-center gap-2 text-sm text-gray-700"
                >
                  <span
                    className={`w-5 h-5 border-2 rounded flex items-center justify-center ${
                      filteredRows.every((row) => selectedIds.has(row.id))
                        ? 'bg-green-600 border-green-600'
                        : 'border-gray-400'
                    }`}
                  >
                    {filteredRows.length > 0 &&
                      filteredRows.every((row) => selectedIds.has(row.id)) && (
                        <Check className="w-4 h-4 text-white" />
                      )}
                  </span>
                  ყველას მონიშვნა
                </button>
                <span className="text-xs text-gray-500">{filteredRows.length} ჩანაწერი</span>
              </div>
            )}

            {filteredRows.length === 0 ? (
              <div className="py-10 text-center text-gray-500 text-sm sm:text-base">
                არ არის მონაცემები
              </div>
            ) : (
              filteredRows.map((row) => (
                <OrderInfoRowCard
                  key={row.id}
                  row={row}
                  isExpanded={expandedRowId === row.id}
                  isSelected={selectedIds.has(row.id)}
                  onToggleSelect={() => toggleSelection(row.id)}
                  onToggleDetails={() => toggleRowDetails(row.id)}
                  onItemUpdate={updateOrderItem}
                />
              ))
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto bg-gray-50 p-3 sm:p-4">
            <table className="min-w-full border-separate border-spacing-y-[8px]">
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
                  <th className="px-3 sm:px-4 py-3 text-left text-sm font-semibold text-black whitespace-nowrap min-w-[160px]">
                    შეკვეთის ინფორმაცია
                  </th>
                  <th className="px-3 sm:px-4 py-3 text-left text-sm font-semibold text-black whitespace-nowrap min-w-[120px]">
                    მყიდველი
                  </th>
                  <th className="px-3 sm:px-4 py-3 text-left text-sm font-semibold text-black whitespace-nowrap min-w-[200px]">
                    მყიდველის ინფორმაცია
                  </th>
                  <th className="px-3 sm:px-4 py-3 text-left text-sm font-semibold text-black whitespace-nowrap min-w-[200px]">
                    გამყიდველის ინფორმაცია
                  </th>
                  <th className="px-3 sm:px-4 py-3 text-left text-sm font-semibold text-black whitespace-nowrap min-w-[140px]">სტატუსი</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-sm font-semibold text-black whitespace-nowrap">დეტალები</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500 md:text-[18px] text-[16px]">
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
                          <td className={`px-3 sm:px-4 py-3 sticky left-0 z-10 border border-gray-100 ${isExpanded ? 'bg-[#1B3729]/5' : 'bg-white'}`}>
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
                          <td className={`px-3 sm:px-4 py-3 text-sm text-black break-words min-w-[160px] border border-gray-100 ${isExpanded ? 'bg-[#1B3729]/5' : 'bg-white'}`}>
                            <OrderMetaInfo
                              orderId={row.orderId}
                              deliveryType={row.deliveryServiceLabel}
                              orderDate={row.date}
                              showTitle={false}
                            />
                          </td>
                          <td className={`px-3 sm:px-4 py-3 text-sm text-black border border-gray-100 ${isExpanded ? 'bg-[#1B3729]/5' : 'bg-white'}`}>
                            <BuyerProfile name={row.customerName} image={row.userImage} />
                          </td>
                          <td className={`px-3 sm:px-4 py-3 text-sm text-black break-words min-w-[200px] border border-gray-100 ${isExpanded ? 'bg-[#1B3729]/5' : 'bg-white'}`}>
                            <BuyerContactInfo phone={row.phone} address={row.userAddress} showTitle={false} />
                          </td>
                          <td className={`px-3 sm:px-4 py-3 text-sm text-black break-words min-w-[200px] border border-gray-100 ${isExpanded ? 'bg-[#1B3729]/5' : 'bg-white'}`}>
                            <SellerContactInfo phone={row.sellerPhone} address={row.pickupAddress} showTitle={false} />
                          </td>
                          <td className={`px-3 sm:px-4 py-3 border border-gray-100 ${isExpanded ? 'bg-[#1B3729]/5' : 'bg-white'}`}>
                            {row.statusItems.length > 0 ? (
                              <div className="flex flex-col gap-2 min-w-[120px]">
                                {row.statusItems.map((item) => (
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
                          <td className={`px-3 sm:px-4 py-3 border border-gray-100 ${isExpanded ? 'bg-[#1B3729]/5' : 'bg-white'}`}>
                            <button
                              type="button"
                              onClick={() => toggleRowDetails(row.id)}
                              className=""
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-10 h-10" />
                              ) : (
                                <ChevronDown className="w-10 h-10" />
                              )}
                             
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={7} className="p-0 border border-gray-100 bg-[#1B3729]/5">
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
