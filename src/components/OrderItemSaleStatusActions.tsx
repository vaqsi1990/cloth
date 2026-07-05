'use client'

import React, { useState } from 'react'
import ConfirmDialog from '@/component/ConfirmDialog'
import { showToast } from '@/utils/toast'

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
  orderId?: number
  variant?: 'default' | 'compact'
  showSellerReportActions?: boolean
  reportingOutOfStockItemId?: number | null
  reportingDamagedItemId?: number | null
  onItemUpdate: (itemId: number, patch: Partial<OrderItemSaleStatusFields>) => void
  onOrderCanceled?: (orderId: number) => void
  onReportOutOfStock?: (itemId: number) => void
  onReportDamaged?: (itemId: number) => void
}

export default function OrderItemSaleStatusActions({
  item,
  orderStatus,
  orderId,
  variant = 'default',
  showSellerReportActions = false,
  reportingOutOfStockItemId = null,
  reportingDamagedItemId = null,
  onItemUpdate,
  onOrderCanceled,
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

  if (item.isRental) return null
  if (orderStatus !== 'PAID' && orderStatus !== 'SHIPPED') return null

  const isCompact = variant === 'compact'
  const badgeClass = isCompact
    ? 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap'
    : 'inline-flex items-center rounded-lg px-3 py-2 text-[15px] font-medium'
  const buttonClass = isCompact
    ? 'inline-flex items-center rounded px-2 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50'
    : 'inline-flex items-center rounded-lg px-3 py-2 text-[15px] font-medium transition disabled:cursor-not-allowed disabled:opacity-50'

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
        if (data.orderCanceled && data.orderId != null) {
          onOrderCanceled?.(data.orderId)
        }
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

  if (item.sellerMarkedTransferred) {
    return (
      <span className={`${badgeClass} border border-green-300 bg-green-50 text-green-800`}>
        გაცემული
      </span>
    )
  }

  if (item.sellerCanceledItem) {
    return (
      <span className={`${badgeClass} border border-red-300 bg-red-50 text-red-700`}>
        გაუქმებული
      </span>
    )
  }

  if (item.sellerReportedOutOfStock) {
    return (
      <span
        className={`${badgeClass} border border-amber-300 bg-amber-50 text-amber-800`}
      >
        მარაგში არ მაქვს
      </span>
    )
  }

  if (item.sellerReportedDamaged) {
    return (
      <span
        className={`${badgeClass} border border-orange-300 bg-orange-50 text-orange-800`}
      >
        დაზიანებულია
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
          className={`${buttonClass} border border-green-300 bg-green-50 text-green-800 hover:bg-green-100`}
        >
          {markingTransferredItemId === item.id ? 'ინახება...' : 'გაცემული'}
        </button>
        <button
          type="button"
          onClick={() => setConfirmAction('cancel')}
          disabled={cancelingItemId === item.id}
          className={`${buttonClass} border border-red-300 bg-red-50 text-red-700 hover:bg-red-100`}
        >
          {cancelingItemId === item.id ? 'იუქმდება...' : 'გაუქმება'}
        </button>
        {showSellerReportActions && onReportOutOfStock && onReportDamaged && (
          <>
            <button
              type="button"
              onClick={() => onReportOutOfStock(item.id)}
              disabled={reportingOutOfStockItemId === item.id}
              className={`${buttonClass} border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100`}
            >
              {reportingOutOfStockItemId === item.id
                ? 'იგზავნება...'
                : 'მარაგში არ მაქვს'}
            </button>
            <button
              type="button"
              onClick={() => onReportDamaged(item.id)}
              disabled={reportingDamagedItemId === item.id}
              className={`${buttonClass} border border-orange-300 bg-orange-50 text-orange-800 hover:bg-orange-100`}
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
            ? 'დარწმუნებული ხართ რომ გაუქმება გსურთ?'
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
