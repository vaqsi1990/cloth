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
<>
</>
  )
}
