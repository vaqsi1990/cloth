'use client'

import React from 'react'

export type SizePillOption = {
  value: string
  label: string
  disabled?: boolean
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

function isMultipleMode(
  props: SizePillSelectorProps,
): props is SizePillSelectorMultipleProps {
  return props.mode === 'multiple'
}

function isOptionSelected(optionValue: string, selectedValues: string[]): boolean {
  const upper = optionValue.toUpperCase()
  return selectedValues.some(
    (entry) => entry === optionValue || entry.toUpperCase() === upper,
  )
}

type SizePillButtonsProps = {
  options: SizePillOption[]
  compact: boolean
  isSelected: (optionValue: string) => boolean
  onSelect: (optionValue: string, currentlySelected: boolean) => void
}

function SizePillButtons({
  options,
  compact,
  isSelected,
  onSelect,
}: SizePillButtonsProps) {
  const pillSizeClass = compact
    ? 'px-3 py-1.5 text-xs sm:text-sm'
    : 'px-5 py-2 text-sm sm:text-base'

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = isSelected(option.value)
        const isDisabled = Boolean(option.disabled)

        return (
          <button
            key={option.value}
            type="button"
            disabled={isDisabled}
            aria-disabled={isDisabled}
            onClick={() => {
              if (isDisabled) return
              onSelect(option.value, selected)
            }}
            className={`rounded-full border-2 font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-1 ${pillSizeClass} ${
              isDisabled
                ? 'cursor-not-allowed border-dashed border-gray-300 text-gray-400'
                : selected
                  ? 'border-black text-black'
                  : 'border-gray-300 text-black hover:border-gray-400'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export default function SizePillSelector(props: SizePillSelectorProps) {
  const { options, className = '', error, compact = false } = props

  if (isMultipleMode(props)) {
    return (
      <div className={className}>
        <SizePillButtons
          options={options}
          compact={compact}
          isSelected={(optionValue) => isOptionSelected(optionValue, props.values)}
          onSelect={(optionValue) => props.onToggle(optionValue)}
        />
        {error ? <p className="text-red-500 text-sm mt-2">{error}</p> : null}
      </div>
    )
  }

  return (
    <div className={className}>
      <SizePillButtons
        options={options}
        compact={compact}
        isSelected={(optionValue) => props.value === optionValue}
        onSelect={(optionValue, currentlySelected) => {
          props.onChange(currentlySelected ? '' : optionValue)
        }}
      />
      {error ? <p className="text-red-500 text-sm mt-2">{error}</p> : null}
    </div>
  )
}
