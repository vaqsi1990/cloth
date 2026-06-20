'use client'

import React from 'react'
import { Plus, X } from 'lucide-react'
import ProductColorPicker, { getProductColorPickerState } from '@/components/ProductColorPicker'
import type { ProductVariantFormRow } from '@/lib/product-variants'
import { getFormRowSizes } from '@/lib/product-variants'
import {
  buildProductFormSizeOptions,
  getProductFormSizeLabel,
  getProductFormSizeSelectValue,
  parseProductFormSizeSelection,
} from '@/lib/shop-product-filters'
import type { ProductCategory, ProductGender } from '@/lib/product-categories'
import VariantImageUpload from '@/components/VariantImageUpload'
import SizePillSelector from '@/components/SizePillSelector'
import ProductMinPriceNotice from '@/components/ProductMinPriceNotice'

export type { ProductVariantFormRow } from '@/lib/product-variants'

type ProductVariantEditorProps = {
  variants: ProductVariantFormRow[]
  gender: ProductGender | ''
  categoryId?: number
  categories?: ProductCategory[]
  sizeSystem: 'EU' | 'US' | 'UK' | 'CN'
  isSizeOptional: boolean
  requireSize?: boolean
  requireImage?: boolean
  showPrice?: boolean
  errors?: Record<string, string>
  onAdd: () => void
  onRemove: (index: number) => void
  onUpdate: (index: number, field: keyof ProductVariantFormRow, value: string | number | string[] | undefined) => void
  onPatch?: (index: number, patch: Partial<ProductVariantFormRow>) => void
}

export default function ProductVariantEditor({
  variants,
  gender,
  categoryId,
  categories,
  sizeSystem,
  isSizeOptional,
  requireSize = false,
  requireImage = false,
  showPrice = true,
  errors = {},
  onAdd,
  onRemove,
  onUpdate,
  onPatch,
}: ProductVariantEditorProps) {
  const sizeOptionsInput = { categoryId, categories }
  const combinedSizeOptions = buildProductFormSizeOptions(gender, sizeOptionsInput)
  const sizeLabel = getProductFormSizeLabel(gender, sizeOptionsInput)
  const showSizeField = requireSize || !isSizeOptional

  const patchVariant = (index: number, patch: Partial<ProductVariantFormRow>) => {
    if (onPatch) {
      onPatch(index, patch)
      return
    }

    for (const [field, value] of Object.entries(patch) as Array<
      [keyof ProductVariantFormRow, ProductVariantFormRow[keyof ProductVariantFormRow]]
    >) {
      onUpdate(index, field, value as string | number | string[] | undefined)
    }
  }

  return (
    <div className="space-y-4">
      {showPrice && <ProductMinPriceNotice mode="purchase" className="mb-2" />}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-[20px] text-black font-semibold">ვარიანტები (ფერი / ზომა)</h3>
          <p className="text-sm text-gray-600 mt-1">
            თითოეულ ვარიანტს დაამატეთ ერთი ან რამდენიმე ზომა, სურათი და გაყიდვის ფასი.
          </p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="bg-black text-white px-4 font-bold py-2 rounded-lg text-[20px] flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>დამატება</span>
        </button>
      </div>

      {variants.map((variant, index) => {
        const activeSizeSystem = variant.sizeSystem || sizeSystem
        const selectedSizeValues = getFormRowSizes(variant)
          .map((size) => getProductFormSizeSelectValue(gender, activeSizeSystem, size))
          .filter(Boolean)
        const { value: colorPickerValue, customColor } = getProductColorPickerState(variant.color)

        return (
          <div key={index} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 border border-gray-200 rounded-lg">
            <div className="md:col-span-2 lg:col-span-3">
              <ProductColorPicker
                value={colorPickerValue}
                customColor={customColor}
                labelClassName="block text-[18px] text-black font-medium mb-2"
                inputClassName="w-full mt-2 px-3 py-2 placeholder:text-gray-500 border border-gray-300 rounded-lg text-[16px] text-black focus:ring-2 focus:ring-black focus:border-transparent"
                onSelect={(selectedValue) => {
                  if (selectedValue === 'სხვა ფერი') {
                    onUpdate(index, 'color', customColor || undefined)
                    return
                  }

                  onUpdate(index, 'color', selectedValue || undefined)
                }}
                onCustomColorChange={(value) => onUpdate(index, 'color', value || undefined)}
              />
              {errors[`variants.${index}.color`] && (
                <p className="text-red-500 text-sm mt-1">{errors[`variants.${index}.color`]}</p>
              )}
            </div>

            {showSizeField && (
              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-[18px] text-black font-medium mb-2">
                  {sizeLabel}
                  {requireSize && <span className="text-red-600"> *</span>}
                </label>
                <SizePillSelector
                  mode="multiple"
                  values={selectedSizeValues}
                  onToggle={(optionValue) => {
                    const parsed = parseProductFormSizeSelection(optionValue, gender)
                    const isSelected = selectedSizeValues.includes(optionValue)
                    const currentSizes = getFormRowSizes(variant)

                    const nextSizes = isSelected
                      ? currentSizes.filter(
                          (size) =>
                            getProductFormSizeSelectValue(gender, activeSizeSystem, size) !==
                            optionValue,
                        )
                      : parsed.size
                        ? [...currentSizes, parsed.size]
                        : currentSizes

                    patchVariant(index, {
                      sizes: nextSizes.length > 0 ? nextSizes : undefined,
                      size: undefined,
                      sizeSystem: parsed.sizeSystem || activeSizeSystem,
                    })
                  }}
                  options={combinedSizeOptions.map((option) => ({
                    value: option.value,
                    label: option.label,
                  }))}
                  compact={gender === 'CHILDREN'}
                  error={errors[`variants.${index}.size`]}
                />
                {selectedSizeValues.length > 1 ? (
                  <p className="text-sm text-gray-500 mt-2">
                    არჩეულია {selectedSizeValues.length} ზომა
                  </p>
                ) : null}
              </div>
            )}

            <div>
              <label className="block text-[18px] text-black font-medium mb-2">რაოდენობა</label>
              <input
                type="number"
                min={0}
                value={variant.stock === 0 ? '' : variant.stock}
                onChange={(e) => {
                  const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10)
                  onUpdate(index, 'stock', Number.isFinite(val) ? val : 0)
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[18px] text-black [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            {requireImage && (
              <div className="md:col-span-2 lg:col-span-1">
                <VariantImageUpload
                  value={variant.imageUrl}
                  onChange={(url) => onUpdate(index, 'imageUrl', url)}
                  error={errors[`variants.${index}.imageUrl`]}
                />
              </div>
            )}

            {showPrice && (
              <div>
                <label className="block text-[18px] text-black font-medium mb-2">ფასი (₾)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={variant.price === 0 ? '' : variant.price || ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? 0 : parseFloat(e.target.value)
                    onUpdate(index, 'price', Number.isFinite(val) ? val : 0)
                  }}
                  className={`w-full px-3 py-2 border rounded-lg text-[18px] text-black [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                    errors[`variants.${index}.price`] ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors[`variants.${index}.price`] && (
                  <p className="text-red-500 text-sm mt-1">{errors[`variants.${index}.price`]}</p>
                )}
              </div>
            )}

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="bg-red-500 text-white px-3 py-2 rounded-lg flex items-center"
              >
                <X className="w-7 h-7" />
              </button>
            </div>
          </div>
        )
      })}

      {variants.length === 0 && (
        <p className="text-sm text-gray-500">
          დაამატეთ ვარიანტები — თითოეულს სჭირდება ზომა და სურათი.
        </p>
      )}

      {errors.variants && (
        <p className="text-red-500 text-sm">{errors.variants}</p>
      )}
    </div>
  )
}
