'use client'

import React, { useState } from 'react'
import ConfirmDialog from '@/component/ConfirmDialog'
import { showToast } from '@/utils/toast'
import OrderItemSaleStatusDropdown from '@/components/OrderItemSaleStatusDropdown'
import {
  getOrderItemFulfillmentStatus,
  ORDER_ITEM_RETURNED_STATUS_LABEL,
} from '@/lib/order-item-fulfillment-status'

export type OrderItemSaleStatusFields = {
  id: number
  isRental?: boolean | null
  sellerMarkedTransferred?: boolean
  sellerMarkedTransferredAt?: string | null
  sellerCanceledItem?: boolean
  sellerCanceledAt?: string | null
  sellerReportedOutOfStock?: boolean
  sellerReportedDamaged?: boolean
}

type OrderItemSaleStatusActionsProps = {
  item: OrderItemSaleStatusFields
  orderStatus: string
  variant?: 'default' | 'compact'
  allowStatusChange?: boolean
  statusAudience?: 'admin' | 'seller'
  showSellerReportActions?: boolean
  reportingOutOfStockItemId?: number | null
  reportingDamagedItemId?: number | null
  onItemUpdate: (itemId: number, patch: Partial<OrderItemSaleStatusFields>) => void
  onReportOutOfStock?: (itemId: number) => void
  onReportDamaged?: (itemId: number) => void
}

export default function OrderItemSaleStatusActions({
  item,
  orderStatus,
  variant = 'default',
  allowStatusChange = false,
  statusAudience = 'seller',
  showSellerReportActions = false,
  reportingOutOfStockItemId = null,
  reportingDamagedItemId = null,
  onItemUpdate,
  onReportOutOfStock,
  onReportDamaged,
}: OrderItemSaleStatusActionsProps) {
  const [confirmAction, setConfirmAction] = useState<'transfer' | 'cancel' | null>(
    null,
  )
  const [markingTransferredItemId, setMarkingTransferredItemId] = useState<
    number | null
  >(null)
  const [cancelingItemId, setCancelingItemId] = useState<number | null>(null)

  if (orderStatus !== 'PAID' && orderStatus !== 'SHIPPED') return null

  const isCompact = variant === 'compact'
  const badgeClass = isCompact
    ? 'inline-flex items-center rounded-lg px-2 py-1 text-xs font-medium whitespace-nowrap'
    : 'inline-flex items-center rounded-lg px-3 py-1.5 text-[15px] font-medium'
  const primaryButtonClass = isCompact
    ? 'inline-flex items-center rounded-lg px-2 py-1 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 bg-[#1B3729] text-white hover:bg-[#164321]'
    : 'inline-flex items-center rounded-lg px-3 py-1.5 text-[15px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 bg-[#1B3729] text-white hover:bg-[#164321]'
  const secondaryButtonClass = isCompact
    ? 'inline-flex items-center rounded-lg px-2 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 border border-gray-300 bg-white text-black hover:bg-gray-50 hover:border-black'
    : 'inline-flex items-center rounded-lg px-3 py-1.5 text-[15px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 border border-gray-300 bg-white text-black hover:bg-gray-50 hover:border-black'

  const handleMarkTransferred = async () => {
    try {
      setMarkingTransferredItemId(item.id)
      const response = await fetch(
        `/api/user/sales/items/${item.id}/mark-transferred`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transferred: true }),
        },
      )
      const data = await response.json()
      if (data.success) {
        onItemUpdate(item.id, {
          sellerMarkedTransferred: true,
          sellerMarkedTransferredAt:
            data.item?.sellerMarkedTransferredAt ?? new Date().toISOString(),
        })
        showToast(data.message, 'success')
        setConfirmAction(null)
        return true
      }
      showToast(data.message || 'შეცდომა გაცემის მონიშვნისას', 'error')
      return false
    } catch {
      showToast('შეცდომა გაცემის მონიშვნისას', 'error')
      return false
    } finally {
      setMarkingTransferredItemId(null)
    }
  }

  const handleCancelItem = async () => {
    try {
      setCancelingItemId(item.id)
      const response = await fetch(`/api/user/sales/items/${item.id}/cancel`, {
        method: 'POST',
      })
      const data = await response.json()
      if (data.success) {
        onItemUpdate(item.id, {
          sellerCanceledItem: true,
          sellerCanceledAt:
            data.item?.sellerCanceledAt ?? new Date().toISOString(),
        })
        showToast(data.message || 'ნივთი გაუქმდა', 'success')
        setConfirmAction(null)
        return true
      }
      showToast(data.message || 'შეცდომა ნივთის გაუქმებისას', 'error')
      return false
    } catch {
      showToast('შეცდომა ნივთის გაუქმებისას', 'error')
      return false
    } finally {
      setCancelingItemId(null)
    }
  }

  const handleConfirm = async () => {
    if (confirmAction === 'transfer') {
      await handleMarkTransferred()
      return
    }
    if (confirmAction === 'cancel') {
      await handleCancelItem()
    }
  }

  if (item.sellerReportedOutOfStock) {
    return (
      <span className={`${badgeClass} bg-gray-100 text-black border border-gray-300`}>
        მარაგში არ მაქვს
      </span>
    )
  }

  if (item.sellerReportedDamaged) {
    return (
      <span className={`${badgeClass} bg-gray-100 text-black border border-gray-300`}>
        დაზიანებულია
      </span>
    )
  }

  if (allowStatusChange) {
    const fulfillmentStatus = getOrderItemFulfillmentStatus(item)
    const showReportActions =
      showSellerReportActions &&
      fulfillmentStatus === 'PENDING' &&
      onReportOutOfStock &&
      onReportDamaged

    return (
      <div className={`flex flex-wrap items-center gap-2 ${isCompact ? '' : 'mt-1'}`}>
        <OrderItemSaleStatusDropdown
          item={item}
          orderStatus={orderStatus}
          variant={variant}
          audience={statusAudience}
          onItemUpdate={onItemUpdate}
        />
        {showReportActions && (
          <>
            <button
              type="button"
              onClick={() => onReportOutOfStock(item.id)}
              disabled={reportingOutOfStockItemId === item.id}
              className={secondaryButtonClass}
            >
              {reportingOutOfStockItemId === item.id
                ? 'იგზავნება...'
                : 'მარაგში არ მაქვს'}
            </button>
            <button
              type="button"
              onClick={() => onReportDamaged(item.id)}
              disabled={reportingDamagedItemId === item.id}
              className={secondaryButtonClass}
            >
              {reportingDamagedItemId === item.id
                ? 'იგზავნება...'
                : 'დაზიანებულია'}
            </button>
          </>
        )}
      </div>
    )
  }

  if (item.sellerMarkedTransferred) {
    return (
      <span className={`${badgeClass} bg-[#1B3729] text-white`}>
        გაცემული
      </span>
    )
  }

  if (item.sellerCanceledItem) {
    return (
      <span className={`${badgeClass} bg-gray-100 text-black border border-gray-300`}>
        {ORDER_ITEM_RETURNED_STATUS_LABEL}
      </span>
    )
  }

  return (
    <>
      <div className={`flex flex-wrap gap-2 ${isCompact ? '' : 'mt-1'}`}>
        <button
          type="button"
          onClick={() => setConfirmAction('transfer')}
          disabled={markingTransferredItemId === item.id}
          className={primaryButtonClass}
        >
          {markingTransferredItemId === item.id ? 'ინახება...' : 'გაცემული'}
        </button>
        <button
          type="button"
          onClick={() => setConfirmAction('cancel')}
          disabled={cancelingItemId === item.id}
          className={secondaryButtonClass}
        >
          {cancelingItemId === item.id ? 'ინახება...' : ORDER_ITEM_RETURNED_STATUS_LABEL}
        </button>
        {showSellerReportActions && onReportOutOfStock && onReportDamaged && (
          <>
            <button
              type="button"
              onClick={() => onReportOutOfStock(item.id)}
              disabled={reportingOutOfStockItemId === item.id}
              className={secondaryButtonClass}
            >
              {reportingOutOfStockItemId === item.id
                ? 'იგზავნება...'
                : 'მარაგში არ მაქვს'}
            </button>
            <button
              type="button"
              onClick={() => onReportDamaged(item.id)}
              disabled={reportingDamagedItemId === item.id}
              className={secondaryButtonClass}
            >
              {reportingDamagedItemId === item.id
                ? 'იგზავნება...'
                : 'დაზიანებულია'}
            </button>
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmAction !== null}
        message={
          confirmAction === 'cancel'
            ? `დარწმუნებული ხართ რომ ${ORDER_ITEM_RETURNED_STATUS_LABEL} გსურთ?`
            : 'დაადასტურეთ რომ ნამდვილად გადაეცით პროდუქტი'
        }
        confirmLabel="კი"
        cancelLabel="არა"
        loading={
          confirmAction === 'cancel'
            ? cancelingItemId === item.id
            : markingTransferredItemId === item.id
        }
        onConfirm={() => void handleConfirm()}
        onCancel={() => {
          if (cancelingItemId !== null || markingTransferredItemId !== null) return
          setConfirmAction(null)
        }}
      />
    </>
  )
}
