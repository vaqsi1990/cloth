'use client'

import React from 'react'
import type { ProductPricingMode } from '@/lib/product-form-pricing'
import { MIN_PRODUCT_PRICE } from '@/lib/product-create-validation'

type ProductMultiPricingSelectorProps = {
  pricingMode: ProductPricingMode | null
  onPricingModeChange: (mode: ProductPricingMode) => void
  error?: string
}

export default function ProductMultiPricingSelector({
  pricingMode,
  onPricingModeChange,
  error,
}: ProductMultiPricingSelectorProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="md:text-[20px] text-[18px] text-black font-semibold mb-2">
        გაქირავება თუ გაყიდვა
      </h2>
      <p className="text-sm text-gray-600 mb-4">
        აირჩიეთ ერთ-ერთი — პროდუქტი ან იყიდება, ან იქირავება.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label
          className={`flex items-start gap-3 rounded-xl border-2 p-4 cursor-pointer transition ${
            pricingMode === 'rental'
              ? 'border-[#1B3729] bg-emerald-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <input
            type="radio"
            name="product-pricing-mode"
            checked={pricingMode === 'rental'}
            onChange={() => onPricingModeChange('rental')}
            className="mt-1 h-5 w-5"
          />
          <span>
            <span className="block md:text-[18px] text-[16px] font-semibold text-black">გაქირავება</span>
            <span className="block text-sm text-gray-600 mt-1">
              ფასის გეგმა ქვემოთ — მინ. {MIN_PRODUCT_PRICE} ₾/დღე
            </span>
          </span>
        </label>

        <label
          className={`flex items-start gap-3 rounded-xl border-2 p-4 cursor-pointer transition ${
            pricingMode === 'purchase'
              ? 'border-[#1B3729] bg-emerald-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <input
            type="radio"
            name="product-pricing-mode"
            checked={pricingMode === 'purchase'}
            onChange={() => onPricingModeChange('purchase')}
            className="mt-1 h-5 w-5"
          />
          <span>
            <span className="block md:text-[18px] text-[16px] font-semibold text-black">გაყიდვა</span>
            <span className="block text-sm text-gray-600 mt-1">
              გაყიდვის ფასი ქვემოთ (მინ. {MIN_PRODUCT_PRICE} ₾)
            </span>
          </span>
        </label>
      </div>

      {pricingMode === 'purchase' && (
        <p className="text-sm text-[#1B3729] font-medium mt-4">
          გაყიდვის ფასის ველი გამოჩნდება ქვემოთ.
        </p>
      )}

      {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
    </div>
  )
}
