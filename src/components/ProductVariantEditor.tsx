'use client'

import React from 'react'
import { Plus, X } from 'lucide-react'
import ProductColorPicker, { getProductColorPickerState } from '@/components/ProductColorPicker'
import type { ProductVariantFormRow } from '@/lib/product-variants'
import {
  buildSizeDetailsForSelection,
  getFormRowSizeDetails,
  getFormRowSizes,
} from '@/lib/product-variants'
import {
  buildProductFormSizeOptions,
  getProductFormSizeLabel,
  getProductFormSizeSelectValue,
  isProductFormSizeOptionSelected,
  normalizeAdultClothingSize,
  normalizeStoredFootwearSize,
  parseProductFormSizeSelection,
} from '@/lib/shop-product-filters'
import { isFootwearCategoryId } from '@/lib/product-categories'
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
  const isFootwear = isFootwearCategoryId(categoryId, categories ?? [])

  const normalizeRowSize = (size: string) =>
    isFootwear ? normalizeStoredFootwearSize(size) : size.trim()

  const uniqueRowSizes = (sizes: string[]) => {
    const seen = new Set<string>()
    const unique: string[] = []
    for (const size of sizes) {
      const normalized = normalizeRowSize(size)
      if (!normalized) continue
      const key = normalized.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      unique.push(normalized)
    }
    return unique
  }

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
            {showPrice
              ? 'თითოეულ ფერს დაამატეთ ზომები, სურათი და გაყიდვის ფასი. თითოეულ ზომას ცალკე მიუთითეთ რაოდენობა და ფასი.'
              : 'თითოეულ ფერს დაამატეთ ერთი ან რამდენიმე ზომა, სურათი და რაოდენობა.'}
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
        const selectedSizes = getFormRowSizes(variant)
        const selectedSizeValues = selectedSizes
          .map((size) =>
            getProductFormSizeSelectValue(gender, activeSizeSystem, size, sizeOptionsInput),
          )
          .filter(Boolean)
        const hasPerSizeStock = showSizeField && selectedSizes.length > 0
        const hasPerSizePrice = showPrice && showSizeField && selectedSizes.length > 0
        const showPerSizeRows = hasPerSizeStock || hasPerSizePrice
        const showSharedStockPrice = !showPerSizeRows
        const { value: colorPickerValue, customColor } = getProductColorPickerState(variant.color)
        const swatchValue = colorPickerValue === 'სხვა ფერი' ? '' : colorPickerValue

        const formatSizeLabel = (size: string) => {
          const normalizedSize = normalizeRowSize(size)
          const option = combinedSizeOptions.find(
            (entry) =>
              entry.size === normalizedSize ||
              entry.value === normalizedSize ||
              entry.size === size ||
              entry.value === size,
          )
          return option?.label || normalizeAdultClothingSize(normalizedSize)
        }

        const applySizeSelection = (
          nextSizes: string[],
          nextSizeSystem?: ProductVariantFormRow['sizeSystem'],
        ) => {
          const normalizedSizes = uniqueRowSizes(nextSizes)
          const nextDetails = buildSizeDetailsForSelection(variant.sizeDetails, normalizedSizes, {
            price: variant.price,
            stock: variant.stock,
          })

          patchVariant(index, {
            sizes: normalizedSizes.length > 1 ? normalizedSizes : undefined,
            size: normalizedSizes.length === 1 ? normalizedSizes[0] : undefined,
            sizeDetails: normalizedSizes.length > 0 ? nextDetails : undefined,
            price: showPrice ? (nextDetails[0]?.price ?? variant.price) : variant.price,
            stock: nextDetails[0]?.stock ?? variant.stock,
            sizeSystem:
              normalizedSizes.length > 0
                ? nextSizeSystem || variant.sizeSystem || activeSizeSystem
                : variant.sizeSystem,
          })
        }

        const updateSizeDetail = (
          size: string,
          field: 'price' | 'stock',
          rawValue: string,
        ) => {
          const sizeDetails = getFormRowSizeDetails(variant)
          const nextDetails = sizeDetails.map((detail) => {
            if (detail.size !== size) return detail
            if (field === 'price') {
              const val = rawValue === '' ? 0 : parseFloat(rawValue)
              return { ...detail, price: Number.isFinite(val) ? val : 0 }
            }
            const val = rawValue === '' ? 0 : parseInt(rawValue, 10)
            return { ...detail, stock: Number.isFinite(val) ? val : 0 }
          })

          patchVariant(index, {
            sizeDetails: nextDetails,
            price: nextDetails.length === 1 ? nextDetails[0].price : variant.price,
            stock: nextDetails.length === 1 ? nextDetails[0].stock : variant.stock,
          })
        }

        return (
          <div key={index} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 border border-gray-200 rounded-lg">
            <div className="md:col-span-2 lg:col-span-3">
              <ProductColorPicker
                value={swatchValue}
                customColor={customColor}
                labelClassName="block text-[18px] text-black font-medium mb-2"
                inputClassName="w-full max-w-[11rem] mt-2 px-2.5 py-1.5 text-sm placeholder:text-gray-400 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent"
                onSelect={(selectedValue) => {
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
                    const parsed = parseProductFormSizeSelection(optionValue, gender, sizeOptionsInput)
                    const isSelected = isProductFormSizeOptionSelected(optionValue, selectedSizeValues)
                    const currentSizes = uniqueRowSizes(getFormRowSizes(variant))

                    const nextSizes = isSelected
                      ? currentSizes.filter(
                          (size) =>
                            !isProductFormSizeOptionSelected(
                              optionValue,
                              [
                                getProductFormSizeSelectValue(
                                  gender,
                                  activeSizeSystem,
                                  size,
                                  sizeOptionsInput,
                                ),
                              ].filter(Boolean),
                            ),
                        )
                      : parsed.size
                        ? uniqueRowSizes([...currentSizes, parsed.size])
                        : currentSizes

                    applySizeSelection(nextSizes, parsed.sizeSystem || activeSizeSystem)
                  }}
                  options={combinedSizeOptions.map((option) => ({
                    value: option.value,
                    label: option.label,
                  }))}
                  compact={gender === 'CHILDREN'}
                  error={errors[`variants.${index}.size`]}
                />
                {showPerSizeRows ? (
                  <p className="text-sm text-gray-500 mt-2">
                    არჩეულია {selectedSizes.length} ზომა
                    {hasPerSizePrice
                      ? ' — თითოეულს ცალკე მიუთითეთ რაოდენობა და ფასი'
                      : ' — თითოეულს ცალკე მიუთითეთ რაოდენობა'}
                  </p>
                ) : null}
              </div>
            )}

            {showPerSizeRows ? (
              <div className="md:col-span-2 lg:col-span-3 space-y-3">
                {getFormRowSizeDetails(variant).map((detail, detailIndex) => (
                  <div
                    key={detail.size}
                    className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center">
                      <span className="text-[16px] font-medium text-black">
                        {formatSizeLabel(detail.size)}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">რაოდენობა</label>
                      <input
                        type="number"
                        min={0}
                        value={detail.stock === 0 ? '' : detail.stock}
                        onChange={(e) => updateSizeDetail(detail.size, 'stock', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[16px] text-black [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    {showPrice && (
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">ფასი (₾)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={detail.price === 0 ? '' : detail.price || ''}
                          onChange={(e) => updateSizeDetail(detail.size, 'price', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg text-[16px] text-black [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                            errors[`variants.${index}.sizeDetails.${detailIndex}.price`]
                              ? 'border-red-500'
                              : 'border-gray-300'
                          }`}
                        />
                        {errors[`variants.${index}.sizeDetails.${detailIndex}.price`] && (
                          <p className="text-red-500 text-sm mt-1">
                            {errors[`variants.${index}.sizeDetails.${detailIndex}.price`]}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : showSharedStockPrice ? (
              <>
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
              </>
            ) : null}

            {requireImage && (
              <div className="md:col-span-2 lg:col-span-1">
                <VariantImageUpload
                  value={variant.imageUrl}
                  onChange={(url) => onUpdate(index, 'imageUrl', url)}
                  error={errors[`variants.${index}.imageUrl`]}
                />
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
