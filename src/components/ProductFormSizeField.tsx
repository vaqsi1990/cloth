'use client'

import React, { useEffect, useMemo, useState } from 'react'
import SizePillSelector from '@/components/SizePillSelector'
import { isFootwearCategoryId } from '@/lib/product-categories'
import {
  appendCustomFootwearSizeOptions,
  buildFootwearFormSelectValue,
  buildProductFormSizeOptions,
  getCustomFootwearSizeInputValue,
  isProductFormSizeOptionSelected,
  isValidCustomFootwearSize,
  parseProductFormSizeSelection,
  resolveProductFormCategories,
  type ProductFormSizeOptionsInput,
} from '@/lib/shop-product-filters'

type ProductFormSizeFieldBaseProps = {
  gender: 'MEN' | 'WOMEN' | 'CHILDREN' | 'UNISEX' | string
  sizeOptionsInput: ProductFormSizeOptionsInput
  className?: string
  error?: string
  compact?: boolean
  inputClassName?: string
}

type ProductFormSizeFieldSingleProps = ProductFormSizeFieldBaseProps & {
  mode?: 'single'
  value: string
  onChange: (value: string) => void
}

type ProductFormSizeFieldMultipleProps = ProductFormSizeFieldBaseProps & {
  mode: 'multiple'
  values: string[]
  onToggle: (value: string) => void
}

export type ProductFormSizeFieldProps =
  | ProductFormSizeFieldSingleProps
  | ProductFormSizeFieldMultipleProps

function isMultipleMode(
  props: ProductFormSizeFieldProps,
): props is ProductFormSizeFieldMultipleProps {
  return props.mode === 'multiple'
}

export default function ProductFormSizeField(props: ProductFormSizeFieldProps) {
  const {
    gender,
    sizeOptionsInput,
    className = '',
    error,
    compact = false,
    inputClassName = 'w-full max-w-[11rem] mt-2 px-2.5 py-1.5 text-sm placeholder:text-gray-400 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent',
  } = props

  const categories = resolveProductFormCategories(sizeOptionsInput)
  const isFootwear = sizeOptionsInput.categoryId
    ? isFootwearCategoryId(sizeOptionsInput.categoryId, categories)
    : false

  const combinedSizeOptions = useMemo(
    () => buildProductFormSizeOptions(gender, sizeOptionsInput),
    [gender, sizeOptionsInput],
  )

  const pillOptions = useMemo(() => {
    const base = combinedSizeOptions.map((option) => ({
      value: option.value,
      label: option.label,
    }))
    if (!isFootwear || !isMultipleMode(props)) return base
    return appendCustomFootwearSizeOptions(
      gender,
      combinedSizeOptions,
      props.values,
      sizeOptionsInput,
    )
  }, [combinedSizeOptions, gender, isFootwear, props, sizeOptionsInput])

  const singleParsedSize = !isMultipleMode(props)
    ? parseProductFormSizeSelection(props.value, gender, sizeOptionsInput)
    : null

  const singleCustomValue = singleParsedSize
    ? getCustomFootwearSizeInputValue(
        gender,
        singleParsedSize.size,
        singleParsedSize.sizeSystem,
        sizeOptionsInput,
      )
    : ''

  const [customSizeInput, setCustomSizeInput] = useState(
    isMultipleMode(props) ? '' : singleCustomValue,
  )

  useEffect(() => {
    if (isMultipleMode(props)) return
    setCustomSizeInput(singleCustomValue)
  }, [singleCustomValue, props.mode])

  const commitCustomSize = (raw: string) => {
    const trimmed = raw.trim()
    if (!trimmed || !isValidCustomFootwearSize(trimmed)) return

    const selectValue = buildFootwearFormSelectValue(trimmed)

    if (isMultipleMode(props)) {
      if (!isProductFormSizeOptionSelected(selectValue, props.values)) {
        props.onToggle(selectValue)
      }
      setCustomSizeInput('')
      return
    }

    props.onChange(selectValue)
  }

  const handleCustomKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      commitCustomSize(customSizeInput)
    }
  }

  return (
    <div className={className}>
      {isMultipleMode(props) ? (
        <SizePillSelector
          mode="multiple"
          values={props.values}
          onToggle={props.onToggle}
          options={pillOptions}
          compact={compact}
          error={isFootwear ? undefined : error}
        />
      ) : (
        <SizePillSelector
          value={props.value}
          onChange={props.onChange}
          options={pillOptions}
          compact={compact}
          error={isFootwear ? undefined : error}
        />
      )}

      {isFootwear ? (
        <>
          <input
            type="text"
            value={customSizeInput}
            onChange={(e) => {
              const next = e.target.value
              setCustomSizeInput(next)
              if (!isMultipleMode(props) && !next.trim()) {
                props.onChange('')
              }
            }}
            onBlur={() => commitCustomSize(customSizeInput)}
            onKeyDown={handleCustomKeyDown}
            placeholder="სხვა ზომა..."
            className={inputClassName}
            aria-label="სხვა ზომა"
          />
          {error ? <p className="text-red-500 text-sm mt-2">{error}</p> : null}
        </>
      ) : null}
    </div>
  )
}
