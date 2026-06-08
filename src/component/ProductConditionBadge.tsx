import React from 'react'
import { getProductConditionLabel } from '@/lib/product-condition'

type ProductConditionBadgeProps = {
  isNew: boolean
  isSecondHand: boolean
  className?: string
}

const ProductConditionBadge = ({
  isNew,
  isSecondHand,
  className = '',
}: ProductConditionBadgeProps) => {
  const label = getProductConditionLabel({ isNew, isSecondHand })

  if (!label) {
    return null
  }

  return (
    <span
      className={`inline-flex items-center rounded-md bg-[#1B3729] px-2 py-1 text-xs font-medium text-white ${className}`}
    >
      {label}
    </span>
  )
}

export default ProductConditionBadge
