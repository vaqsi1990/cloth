'use client'

import React from 'react'
import ProductSalePrice from '@/components/ProductSalePrice'
import { productHasActiveDiscount } from '@/lib/discount-helpers'
import {
  getProductListDisplayPrice,
  getProductListOriginalPriceLabel,
  getProductListPriceLabel,
  type ProductListPriceInput,
} from '@/lib/product-list-price'

type ProductListPriceProps = {
  product: ProductListPriceInput
  className?: string
}

export default function ProductListPrice({ product, className = '' }: ProductListPriceProps) {
  const priceLabel = getProductListPriceLabel(product)
  const originalPriceLabel = getProductListOriginalPriceLabel(product)
  const hasDiscount = productHasActiveDiscount(product)

  if (hasDiscount && priceLabel && originalPriceLabel) {
    return (
      <span className={`inline-flex flex-wrap items-baseline gap-x-2 ${className}`}>
        <span className="font-regular text-gray-500 line-through md:text-[16px] text-[14px]">
          {originalPriceLabel}
        </span>
        <span className="font-regular text-red-600 md:text-[18px] text-[16px]">{priceLabel}</span>
      </span>
    )
  }

  if (priceLabel) {
    return (
      <span className={`font-regular text-black md:text-[18px] text-[16px] ${className}`}>
        {priceLabel}
      </span>
    )
  }

  return (
    <ProductSalePrice
      originalPrice={getProductListDisplayPrice(product)}
      discount={product.discount}
      className={className}
    />
  )
}
