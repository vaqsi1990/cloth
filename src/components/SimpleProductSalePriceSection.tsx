'use client'

import React from 'react'
import ProductMinPriceNotice from '@/components/ProductMinPriceNotice'

type SimpleProductSalePriceSectionProps = {
  price: number
  stock: number
  onPriceChange: (price: number) => void
  onStockChange: (stock: number | undefined) => void
  error?: string
  stockError?: string
  titleClassName?: string
  labelClassName?: string
  inputClassName?: string
}

export default function SimpleProductSalePriceSection({
  price,
  stock,
  onPriceChange,
  onStockChange,
  error,
  stockError,
  titleClassName = 'text-[20px] text-black font-semibold mb-6',
  labelClassName = 'block text-[20px] text-black font-medium mb-2',
  inputClassName =
    'w-full px-3 py-2 border border-gray-300 rounded-lg text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
}: SimpleProductSalePriceSectionProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className={titleClassName}>გაყიდვა</h2>
      <ProductMinPriceNotice mode="purchase" className="mb-4" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl">
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
        <div>
          <label className={labelClassName}>
            რაოდენობა <span className="text-red-600">*</span>
          </label>
          <input
            type="number"
            min="1"
            step="1"
            value={stock === undefined || stock === 0 ? '' : stock}
            onChange={(e) => {
              const val =
                e.target.value === '' ? undefined : parseInt(e.target.value, 10) || 0
              onStockChange(val)
            }}
            className={`${inputClassName} ${stockError ? 'border-red-500' : 'border-gray-300'}`}
          />
          {stockError ? <p className="text-red-500 text-sm mt-1">{stockError}</p> : null}
        </div>
      </div>
    </div>
  )
}
