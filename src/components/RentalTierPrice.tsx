'use client'

import React from 'react'
import { getDiscountedPrice } from '@/lib/discount-helpers'
import ProductSalePrice, { type ProductPricingMode } from '@/components/ProductSalePrice'
import { getBuyerPrice } from '@/lib/platform-pricing'

interface RentalTierPriceProps {
  minDays: number
  pricePerDay: number
  discount?: number | null
  totalClassName?: string
  pricingMode?: ProductPricingMode
}

export default function RentalTierPrice({
  minDays,
  pricePerDay,
  discount,
  totalClassName = 'md:text-[18px] text-[16px] text-black mt-1',
  pricingMode = 'buyer',
}: RentalTierPriceProps) {
  const originalTotal = minDays * pricePerDay
  const hasDiscount = typeof discount === 'number' && discount > 0
  const discountedTotal = getDiscountedPrice(originalTotal, discount)
  const displayPricePerDay =
    pricingMode === 'buyer' ? getBuyerPrice(pricePerDay) : pricePerDay
  const displayDiscountedPerDay =
    pricingMode === 'buyer'
      ? getBuyerPrice(discountedTotal) / minDays
      : discountedTotal / minDays

  return (
    <>
      {hasDiscount ? (
        <div className="flex items-center gap-2">
          <p className="text-[16px] font-bold text-red-600">
            ₾{displayDiscountedPerDay.toFixed(2)}/დღე
          </p>
          <p className="text-[16px] font-bold text-black line-through decoration-black opacity-60">
            ₾{displayPricePerDay.toFixed(2)}/დღე
          </p>
        </div>
      ) : (
        <p className="text-[16px] font-bold text-black">₾{displayPricePerDay.toFixed(2)}/დღე</p>
      )}

      <div className={`flex items-center gap-2 flex-wrap ${totalClassName}`}>
        <span>ჯამი:</span>
        {hasDiscount ? (
          <ProductSalePrice
            originalPrice={originalTotal}
            discount={discount}
            size="sm"
            pricingMode={pricingMode}
          />
        ) : (
          <span>
            ₾
            {(pricingMode === 'buyer'
              ? getBuyerPrice(originalTotal)
              : originalTotal
            ).toFixed(2)}
          </span>
        )}
      </div>
    </>
  )
}
