'use client'

import React, { useEffect, useRef, useState } from 'react'
import {
  discountFromSalePrice,
  getProductDiscountBasePrice,
  salePriceFromDiscount,
} from '@/lib/discount-helpers'
import {
  canApplyProductDiscount,
  MIN_PRODUCT_PRICE,
  PRODUCT_DISCOUNT_MIN_SALE_PRICE_MESSAGE,
  PRODUCT_DISCOUNT_NOT_ALLOWED_MESSAGE,
} from '@/lib/product-create-validation'

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
  const discountAllowed = canApplyProductDiscount(basePrice)
  const maxSalePrice = discountAllowed
    ? Math.max(MIN_PRODUCT_PRICE, basePrice - 0.01)
    : basePrice
  const [salePriceInput, setSalePriceInput] = useState('')
  const [localError, setLocalError] = useState('')
  const prevBasePriceRef = useRef<number | null>(null)
  const prevDiscountRef = useRef<number | null | undefined>(undefined)
  const hasSyncedDiscountRef = useRef(false)

  useEffect(() => {
    if (!discountAllowed && (discount || discountDays)) {
      onDiscountChange(undefined)
      onDiscountDaysChange(undefined)
      setSalePriceInput('')
      setLocalError('')
    }
  }, [
    discountAllowed,
    discount,
    discountDays,
    onDiscountChange,
    onDiscountDaysChange,
  ])

  // Sync sale input when discount changes externally (load, clear, manual % field elsewhere).
  useEffect(() => {
    if (hasSyncedDiscountRef.current && prevDiscountRef.current === discount) {
      return
    }
    hasSyncedDiscountRef.current = true
    prevDiscountRef.current = discount

    if (!discount || discount <= 0 || !discountAllowed) {
      setSalePriceInput('')
      return
    }

    const salePrice = salePriceFromDiscount(basePrice, discount)
    setSalePriceInput(salePrice !== undefined ? String(salePrice) : '')
  }, [discount, basePrice, discountAllowed])

  // When base (old) price changes, keep the sale price fixed and update discount amount only.
  useEffect(() => {
    if (prevBasePriceRef.current === null) {
      prevBasePriceRef.current = basePrice
      return
    }

    if (prevBasePriceRef.current === basePrice) {
      return
    }

    prevBasePriceRef.current = basePrice

    const trimmed = salePriceInput.trim()
    if (!trimmed || !discountAllowed) {
      return
    }

    const parsed = parseFloat(trimmed)
    if (Number.isNaN(parsed) || parsed < MIN_PRODUCT_PRICE) {
      return
    }

    const nextDiscount = discountFromSalePrice(basePrice, parsed)
    if (nextDiscount !== discount) {
      onDiscountChange(nextDiscount)
    }
  }, [basePrice, salePriceInput, discount, discountAllowed, onDiscountChange])

  const applySalePrice = (parsed: number) => {
    if (parsed < MIN_PRODUCT_PRICE) {
      setLocalError(PRODUCT_DISCOUNT_MIN_SALE_PRICE_MESSAGE)
      onDiscountChange(undefined)
      return
    }

    if (parsed >= basePrice) {
      setLocalError('ახალი ფასი უნდა იყოს მიმდინარე ფასზე ნაკლები')
      onDiscountChange(undefined)
      return
    }

    setLocalError('')
    onDiscountChange(discountFromSalePrice(basePrice, parsed))
  }

  const handleSalePriceChange = (value: string) => {
    setSalePriceInput(value)

    if (!value.trim()) {
      setLocalError('')
      onDiscountChange(undefined)
      return
    }

    const parsed = parseFloat(value)
    if (Number.isNaN(parsed)) {
      return
    }

    applySalePrice(parsed)
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

  const displayError = localError || discountError

  return (
    <div className="space-y-4">
      <h3 className="text-[20px] text-black font-semibold">ფასდაკლება</h3>

      {basePrice <= 0 ? (
        <p className="text-sm text-gray-600">{emptyPriceMessage}</p>
      ) : !discountAllowed ? (
        <>
          <p className="text-sm text-gray-600">
            {currentPriceLabel}: <span className="font-medium text-black">₾{basePrice.toFixed(2)}</span>
          </p>
          <p className="text-sm text-amber-700">{PRODUCT_DISCOUNT_NOT_ALLOWED_MESSAGE}</p>
        </>
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
                min={MIN_PRODUCT_PRICE}
                step="0.01"
                max={maxSalePrice}
                value={salePriceInput}
                onChange={(e) => handleSalePriceChange(e.target.value)}
                placeholder={`მაგ: ${Math.max(MIN_PRODUCT_PRICE, basePrice - 1).toFixed(2)}`}
                className={inputClassName}
              />
              <p className="text-xs text-gray-500 mt-1">
                მინიმუმ ₾{MIN_PRODUCT_PRICE.toFixed(2)}
              </p>
              {displayError && (
                <p className="text-red-500 text-sm mt-1">{displayError}</p>
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

          {savings && savings > 0 && salePriceInput && !displayError && (
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
