'use client'

import React from 'react'
import { PRODUCT_COLORS } from '@/lib/product-colors'

const OTHER_COLOR_LABEL = 'სხვა ფერი'
const PREDEFINED_COLOR_LABELS = new Set(PRODUCT_COLORS.map((color) => color.label))

export function getProductColorPickerState(color: string | undefined) {
  if (!color) {
    return { value: '', customColor: '' }
  }

  if (PREDEFINED_COLOR_LABELS.has(color)) {
    return { value: color, customColor: '' }
  }

  return { value: OTHER_COLOR_LABEL, customColor: color }
}

type ProductColorPickerProps = {
  value: string
  customColor: string
  onSelect: (label: string) => void
  onCustomColorChange: (value: string) => void
  labelClassName?: string
  inputClassName?: string
  error?: string
  showLabel?: boolean
}

export default function ProductColorPicker({
  value,
  customColor,
  onSelect,
  onCustomColorChange,
  labelClassName = 'block text-[20px] text-black font-medium mb-2',
  inputClassName = 'w-full max-w-[11rem] mt-2 px-2.5 py-1.5 text-sm placeholder:text-gray-400 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent',
  error,
  showLabel = true,
}: ProductColorPickerProps) {
  const selectedSwatch =
    value && value !== OTHER_COLOR_LABEL && PREDEFINED_COLOR_LABELS.has(value) ? value : ''

  return (
    <div>
      {showLabel && <label className={labelClassName}>ფერი</label>}
      <div className="grid grid-cols-4 gap-x-4 gap-y-3 max-w-xs">
        {PRODUCT_COLORS.map((color) => {
          const isSelected = selectedSwatch === color.label

          return (
            <button
              key={color.id}
              type="button"
              onClick={() => onSelect(color.label)}
              title={color.label}
              className="flex flex-col items-center gap-1 focus:outline-none"
            >
              <span
                className={`w-7 h-7 rounded-full border transition-all ${
                  isSelected
                    ? 'border-[#1B3729] ring-2 ring-[#1B3729] ring-offset-1'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                style={{ backgroundColor: color.color }}
              />
            </button>
          )
        })}
      </div>

      <input
        type="text"
        value={customColor}
        onChange={(e) => onCustomColorChange(e.target.value)}
        placeholder="სხვა ფერი..."
        className={inputClassName}
        aria-label="სხვა ფერი"
      />

      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  )
}
