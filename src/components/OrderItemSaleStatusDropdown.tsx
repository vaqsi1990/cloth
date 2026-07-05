'use client'

import React, { useState } from 'react'
import { showToast } from '@/utils/toast'
import {
  getOrderItemFulfillmentStatus,
  ORDER_ITEM_FULFILLMENT_STATUS_LABELS,
  toOrderItemFulfillmentClientPatch,
  type OrderItemFulfillmentStatus,
} from '@/lib/order-item-fulfillment-status'
import type { OrderItemSaleStatusFields } from '@/components/OrderItemSaleStatusActions'

type OrderItemSaleStatusDropdownProps = {
  item: OrderItemSaleStatusFields
  orderStatus: string
  variant?: 'default' | 'compact'
  audience?: 'admin' | 'seller'
  onItemUpdate: (itemId: number, patch: Partial<OrderItemSaleStatusFields>) => void
}

export default function OrderItemSaleStatusDropdown({
  item,
  orderStatus,
  variant = 'default',
  audience = 'admin',
  onItemUpdate,
}: OrderItemSaleStatusDropdownProps) {
  const [saving, setSaving] = useState(false)
  const currentStatus = getOrderItemFulfillmentStatus(item)

  if (orderStatus !== 'PAID' && orderStatus !== 'SHIPPED') return null

  const isCompact = variant === 'compact'
  const selectClass = isCompact
    ? 'rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-black focus:border-[#1B3729] focus:outline-none focus:ring-1 focus:ring-[#1B3729] disabled:opacity-50'
    : 'rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-[15px] font-medium text-black focus:border-[#1B3729] focus:outline-none focus:ring-1 focus:ring-[#1B3729] disabled:opacity-50'

  const statusApiPath =
    audience === 'seller'
      ? `/api/user/sales/items/${item.id}/fulfillment-status`
      : `/api/admin/order-items/${item.id}/fulfillment-status`

  const handleChange = async (nextStatus: OrderItemFulfillmentStatus) => {
    if (nextStatus === currentStatus || saving) return

    try {
      setSaving(true)
      const response = await fetch(statusApiPath, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      const data = await response.json()

      if (!data.success) {
        showToast(data.message || 'შეცდომა სტატუსის განახლებისას', 'error')
        return
      }

      onItemUpdate(item.id, toOrderItemFulfillmentClientPatch(nextStatus, data.item))
      showToast(data.message || 'სტატუსი განახლდა', 'success')
    } catch {
      showToast('შეცდომა სტატუსის განახლებისას', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <select
      value={currentStatus}
      disabled={saving}
      onChange={(event) =>
        void handleChange(event.target.value as OrderItemFulfillmentStatus)
      }
      className={selectClass}
      aria-label="ნივთის სტატუსი"
    >
      {(Object.keys(ORDER_ITEM_FULFILLMENT_STATUS_LABELS) as OrderItemFulfillmentStatus[]).map(
        (status) => (
          <option key={status} value={status}>
            {ORDER_ITEM_FULFILLMENT_STATUS_LABELS[status]}
          </option>
        ),
      )}
    </select>
  )
}
