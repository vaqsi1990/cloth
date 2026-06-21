'use client'

import React from 'react'
import ProductMinPriceNotice from '@/components/ProductMinPriceNotice'

type SimpleProductSalePriceSectionProps = {
  price: number
  onPriceChange: (price: number) => void
  error?: string
  titleClassName?: string
  labelClassName?: string
  inputClassName?: string
}

export default function SimpleProductSalePriceSection({
  price,
  onPriceChange,
  error,
  titleClassName = 'text-[20px] text-black font-semibold mb-6',
  labelClassName = 'block text-[20px] text-black font-medium mb-2',
  inputClassName =
    'w-1/2 max-w-xs px-3 py-2 border border-gray-300 rounded-lg text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
}: SimpleProductSalePriceSectionProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className={titleClassName}>გაყიდვა</h2>
      <ProductMinPriceNotice mode="purchase" className="mb-4" />
      <div>
        <label className={labelClassName}>
          ფასი (₾) <span className="text-red-600">*</span>
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={price === 0 ? '' : price || ''}
          onChange={(e) => {
            const val = e.target.value === '' ? 0 : parseFloat(e.target.value)
            onPriceChange(Number.isFinite(val) ? val : 0)
          }}
          className={`${inputClassName} ${error ? 'border-red-500' : 'border-gray-300'}`}
        />
        {error ? <p className="text-red-500 text-sm mt-1">{error}</p> : null}
      </div>
    </div>
  )
}
