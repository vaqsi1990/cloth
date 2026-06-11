'use client'

import React, { useEffect, useState } from 'react'
import {
  discountFromSalePrice,
  getProductDiscountBasePrice,
  salePriceFromDiscount,
} from '@/lib/discount-helpers'

interface ProductDiscountFieldsProps {
  variants: Array<{ price?: number | null }>
  rentalPriceTiers?: Array<{ minDays: number; pricePerDay: number }>
  discount?: number | null
  discountDays?: number | null
  onDiscountChange: (discount: number | undefined) => void
  onDiscountDaysChange: (discountDays: number | undefined) => void
  discountError?: string
  discountDaysError?: string
  labelClassName?: string
  inputClassName?: string
}

export default function ProductDiscountFields({
  variants,
  rentalPriceTiers = [],
  discount,
  discountDays,
  onDiscountChange,
  onDiscountDaysChange,
  discountError,
  discountDaysError,
  labelClassName = 'block text-[20px] text-black font-medium mb-2',
  inputClassName = 'w-full px-4 py-3 border border-gray-300 rounded-lg text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
}: ProductDiscountFieldsProps) {
  const { basePrice, priceType } = getProductDiscountBasePrice(variants, rentalPriceTiers)
  const [salePriceInput, setSalePriceInput] = useState('')

  useEffect(() => {
    const salePrice = salePriceFromDiscount(basePrice, discount)
    setSalePriceInput(salePrice !== undefined ? String(salePrice) : '')
  }, [basePrice, discount])

  const handleSalePriceChange = (value: string) => {
    setSalePriceInput(value)

    if (!value.trim()) {
      onDiscountChange(undefined)
      return
    }

    const parsed = parseFloat(value)
    if (Number.isNaN(parsed)) {
      return
    }

    onDiscountChange(discountFromSalePrice(basePrice, parsed))
  }

  const savings =
    discount && discount > 0 ? discount : discountFromSalePrice(basePrice, parseFloat(salePriceInput))

  const currentPriceLabel =
    priceType === 'rental'
      ? 'გაქირავების საწყისი ფასი (პირველი გეგმა)'
      : 'მიმდინარე გაყიდვის ფასი'

  const emptyPriceMessage =
    priceType === null
      ? 'ჯერ მიუთითეთ გაყიდვის ან გაქირავების ფასი, შემდეგ შეძლებთ ახალი ფასის დაყენებას.'
      : ''

  return (
    <div className="space-y-4">
      <h3 className="text-[20px] text-black font-semibold">ფასდაკლება</h3>

      {basePrice <= 0 ? (
        <p className="text-sm text-gray-600">{emptyPriceMessage}</p>
      ) : (
        <>
          <p className="text-sm text-gray-600">
            {currentPriceLabel}: <span className="font-medium text-black">₾{basePrice.toFixed(2)}</span>
            {priceType === 'rental' && (
              <span className="block mt-1">
                ფასდაკლება გამოიყენება როგორც გაყიდვაზე, ისე გაქირავებაზე.
              </span>
            )}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClassName}>ახალი ფასი (₾)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                max={basePrice - 0.01}
                value={salePriceInput}
                onChange={(e) => handleSalePriceChange(e.target.value)}
                placeholder={`მაგ: ${(basePrice * 0.8).toFixed(2)}`}
                className={inputClassName}
              />
              {discountError && (
                <p className="text-red-500 text-sm mt-1">{discountError}</p>
              )}
            </div>

            <div>
              <label className={labelClassName}>ფასდაკლების ვადა (დღეები)</label>
              <input
                type="number"
                min="1"
                step="1"
                value={discountDays ?? ''}
                onChange={(e) =>
                  onDiscountDaysChange(
                    e.target.value ? parseInt(e.target.value, 10) : undefined,
                  )
                }
                placeholder="ოფციონალური"
                className={inputClassName}
              />
              {discountDaysError && (
                <p className="text-red-500 text-sm mt-1">{discountDaysError}</p>
              )}
            </div>
          </div>

          {savings && savings > 0 && salePriceInput && (
            <p className="text-sm text-gray-600">
              დანაზოგი: <span className="font-medium text-red-600">₾{savings.toFixed(2)}</span>
              {salePriceInput && (
                <>
                  {' '}
                  · ახალი ფასი:{' '}
                  <span className="font-medium text-red-600">₾{parseFloat(salePriceInput).toFixed(2)}</span>
                </>
              )}
            </p>
          )}
        </>
      )}
    </div>
  )
}
