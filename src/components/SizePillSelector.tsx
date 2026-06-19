'use client'

import React from 'react'

export type SizePillOption = {
  value: string
  label: string
}

type SizePillSelectorBaseProps = {
  options: SizePillOption[]
  className?: string
  error?: string
  compact?: boolean
}

type SizePillSelectorSingleProps = SizePillSelectorBaseProps & {
  mode?: 'single'
  value: string
  onChange: (value: string) => void
}

type SizePillSelectorMultipleProps = SizePillSelectorBaseProps & {
  mode: 'multiple'
  values: string[]
  onToggle: (value: string) => void
}

export type SizePillSelectorProps = SizePillSelectorSingleProps | SizePillSelectorMultipleProps

function isSelected(
  mode: 'single' | 'multiple',
  optionValue: string,
  value: string,
  values: string[],
): boolean {
  if (mode === 'multiple') {
    const upper = optionValue.toUpperCase()
    return values.some((entry) => entry === optionValue || entry.toUpperCase() === upper)
  }
  return value === optionValue
}

export default function SizePillSelector(props: SizePillSelectorProps) {
  const { options, className = '', error, compact = false } = props
  const mode = props.mode ?? 'single'
  const value = mode === 'single' ? props.value : ''
  const values = mode === 'multiple' ? props.values : []

  const pillSizeClass = compact
    ? 'px-3 py-1.5 text-xs sm:text-sm'
    : 'px-5 py-2 text-sm sm:text-base'

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = isSelected(mode, option.value, value, values)

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                if (mode === 'multiple') {
                  props.onToggle(option.value)
                  return
                }
                props.onChange(selected ? '' : option.value)
              }}
              className={`rounded-full border-2 font-medium text-black transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-1 ${pillSizeClass} ${
                selected
                  ? 'border-black'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>
      {error ? <p className="text-red-500 text-sm mt-2">{error}</p> : null}
    </div>
  )
}
