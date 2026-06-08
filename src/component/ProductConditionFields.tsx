'use client'

import React from 'react'
import { applyProductCondition, getProductCondition, type ProductCondition } from '@/lib/product-condition'

type ProductConditionFieldsProps = {
  isNew: boolean
  isSecondHand: boolean
  onChange: (values: { isNew: boolean; isSecondHand: boolean }) => void
  className?: string
  labelClassName?: string
}

const ProductConditionFields = ({
  isNew,
  isSecondHand,
  onChange,
  className = '',
  labelClassName = 'block md:text-[18px] text-[16px] text-black font-medium mb-2',
}: ProductConditionFieldsProps) => {
  const selected = getProductCondition({ isNew, isSecondHand })

  const handleSelect = (condition: ProductCondition) => {
    onChange(applyProductCondition(condition))
  }

  return (
    <div className={className}>
      <label className={labelClassName}>მდგომარეობა</label>
      <div className="flex flex-wrap gap-4">
        <label className="inline-flex items-center gap-2 cursor-pointer select-none text-black md:text-[18px] text-[16px]">
          <input
            type="radio"
            name="product-condition"
            checked={selected === 'new'}
            onChange={() => handleSelect('new')}
            className="h-4 w-4"
          />
          <span>ახალი</span>
        </label>
        <label className="inline-flex items-center gap-2 cursor-pointer select-none text-black md:text-[18px] text-[16px]">
          <input
            type="radio"
            name="product-condition"
            checked={selected === 'second-hand'}
            onChange={() => handleSelect('second-hand')}
            className="h-4 w-4"
          />
          <span>მეორადი</span>
        </label>
        <label className="inline-flex items-center gap-2 cursor-pointer select-none text-black md:text-[18px] text-[16px]">
          <input
            type="radio"
            name="product-condition"
            checked={selected === null}
            onChange={() => handleSelect(null)}
            className="h-4 w-4"
          />
          <span>არ არის მითითებული</span>
        </label>
      </div>
    </div>
  )
}

export default ProductConditionFields
