'use client'

import React from 'react'
import { getDiscountedPrice } from '@/lib/discount-helpers'
import { getBuyerPrice } from '@/lib/platform-pricing'

export type ProductPricingMode = 'seller' | 'buyer'

interface ProductSalePriceProps {
  originalPrice: number
  discount?: number | null
  size?: 'sm' | 'lg'
  className?: string
  /** Seller price for authors; buyer price (×1.09) for public listings. */
  pricingMode?: ProductPricingMode
}

const sizeClasses = {
  sm: {
    original: 'font-regular text-black md:text-[18px] text-[16px] line-through decoration-black opacity-60',
    sale: 'font-regular text-red-600 md:text-[18px] text-[16px]',
  },
  lg: {
    original: 'text-xl font-bold text-black line-through decoration-black opacity-60',
    sale: 'text-3xl font-bold text-red-600',
  },
}

function toDisplayPrices(
  sellerPrice: number,
  discount: number | null | undefined,
  pricingMode: ProductPricingMode,
) {
  const sellerOriginal = sellerPrice
  const sellerSale = getDiscountedPrice(sellerPrice, discount)

  if (pricingMode === 'seller') {
    return { original: sellerOriginal, sale: sellerSale }
  }

  return {
    original: getBuyerPrice(sellerOriginal),
    sale: getBuyerPrice(sellerSale),
  }
}

export default function ProductSalePrice({
  originalPrice,
  discount,
  size = 'sm',
  className = '',
  pricingMode = 'buyer',
}: ProductSalePriceProps) {
  const hasDiscount = typeof discount === 'number' && discount > 0
  const classes = sizeClasses[size]
  const { original, sale } = toDisplayPrices(originalPrice, discount, pricingMode)

  if (!hasDiscount) {
    const regularClass =
      size === 'lg'
        ? 'text-3xl font-bold text-black'
        : 'font-regular text-black md:text-[18px] text-[16px]'

    return (
      <span className={`${regularClass} ${className}`}>
        ₾{original.toFixed(2)}
      </span>
    )
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className={classes.original} style={{ textDecorationThickness: size === 'lg' ? '2px' : '1px' }}>
        ₾{original.toFixed(2)}
      </span>
      <span className={`${classes.sale}`}>₾{sale.toFixed(2)}</span>
    </div>
  )
}
