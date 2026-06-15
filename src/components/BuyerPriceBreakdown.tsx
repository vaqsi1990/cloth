'use client'

import React from 'react'
import { getDiscountedPrice } from '@/lib/discount-helpers'
import {
  getBuyerPrice,
  getCommissionFromSellerPrice,
  PLATFORM_COMMISSION_RATE,
} from '@/lib/platform-pricing'

interface BuyerPriceBreakdownProps {
  sellerPrice: number
  discount?: number | null
  className?: string
}

export default function BuyerPriceBreakdown({
  sellerPrice,
  discount,
  className = '',
}: BuyerPriceBreakdownProps) {
  if (!sellerPrice || sellerPrice <= 0) return null

  const sellerEffective = getDiscountedPrice(sellerPrice, discount)
  const commission = getCommissionFromSellerPrice(sellerEffective)
  const total = getBuyerPrice(sellerEffective)
  const commissionPercent = Math.round(PLATFORM_COMMISSION_RATE * 100)

  return (
    <div
      className={`rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-black space-y-1 ${className}`}
    >
      <div className="flex justify-between gap-4">
        <span>პროდუქტის ფასი</span>
        <span>₾{sellerEffective.toFixed(2)}</span>
      </div>
      
      <div className="flex justify-between gap-4 font-semibold border-t border-gray-200 pt-1">
        <span>სულ</span>
        <span>₾{total.toFixed(2)}</span>
      </div>
    </div>
  )
}
