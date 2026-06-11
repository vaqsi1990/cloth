'use client'

import React from 'react'
import { getDiscountedPrice } from '@/lib/discount-helpers'

interface ProductSalePriceProps {
  originalPrice: number
  discount?: number | null
  size?: 'sm' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: {
    sale: 'font-regular text-red-600 md:text-[18px] text-[16px]',
    original: 'font-regular text-black md:text-[18px] text-[16px] line-through decoration-black opacity-60',
  },
  lg: {
    sale: 'text-3xl font-bold text-red-600',
    original: 'text-xl font-bold text-black line-through decoration-black opacity-60',
  },
}

export default function ProductSalePrice({
  originalPrice,
  discount,
  size = 'sm',
  className = '',
}: ProductSalePriceProps) {
  const hasDiscount = typeof discount === 'number' && discount > 0
  const classes = sizeClasses[size]

  if (!hasDiscount) {
    const regularClass =
      size === 'lg'
        ? 'text-3xl font-bold text-black'
        : 'font-regular text-black md:text-[18px] text-[16px]'

    return (
      <span className={`${regularClass} ${className}`}>
        ₾{originalPrice.toFixed(2)}
      </span>
    )
  }

  const salePrice = getDiscountedPrice(originalPrice, discount)

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className={classes.sale}>₾{salePrice.toFixed(2)}</span>
      <span className={classes.original} style={{ textDecorationThickness: size === 'lg' ? '2px' : '1px' }}>
        ₾{originalPrice.toFixed(2)}
      </span>
    </div>
  )
}
