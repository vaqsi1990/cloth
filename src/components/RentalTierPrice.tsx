'use client'

import React from 'react'
import { getDiscountedPrice } from '@/lib/discount-helpers'
import ProductSalePrice from '@/components/ProductSalePrice'

interface RentalTierPriceProps {
  minDays: number
  pricePerDay: number
  discount?: number | null
  totalClassName?: string
}

export default function RentalTierPrice({
  minDays,
  pricePerDay,
  discount,
  totalClassName = 'md:text-[18px] text-[16px] text-black mt-1',
}: RentalTierPriceProps) {
  const originalTotal = minDays * pricePerDay
  const hasDiscount = typeof discount === 'number' && discount > 0
  const discountedTotal = getDiscountedPrice(originalTotal, discount)
  const discountedPerDay = discountedTotal / minDays

  return (
    <>
      {hasDiscount ? (
        <div className="flex items-center gap-2">
          <p className="text-[16px] font-bold text-red-600">
            ₾{discountedPerDay.toFixed(2)}/დღე
          </p>
          <p className="text-[16px] font-bold text-black line-through decoration-black opacity-60">
            ₾{pricePerDay.toFixed(2)}/დღე
          </p>
        </div>
      ) : (
        <p className="text-[16px] font-bold text-black">₾{pricePerDay.toFixed(2)}/დღე</p>
      )}

      <div className={`flex items-center gap-2 flex-wrap ${totalClassName}`}>
        <span>ჯამი:</span>
        {hasDiscount ? (
          <ProductSalePrice originalPrice={originalTotal} discount={discount} size="sm" />
        ) : (
          <span>₾{originalTotal.toFixed(2)}</span>
        )}
      </div>
    </>
  )
}
