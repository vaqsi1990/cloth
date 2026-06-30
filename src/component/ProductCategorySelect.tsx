'use client'

import {
  groupProductCategories,
  groupProductCategoriesForGender,
  type ProductCategory,
  type ProductGender,
} from '@/lib/product-categories'

type ProductCategorySelectProps = {
  categories: ProductCategory[]
  value: number | ''
  onChange: (categoryId: number | undefined, categorySlug?: string) => void
  className?: string
  placeholder?: string
  gender?: ProductGender | null
}

export default function ProductCategorySelect({
  categories,
  value,
  onChange,
  className,
  placeholder = 'აირჩიეთ კატეგორია',
  gender,
}: ProductCategorySelectProps) {
  const groups = gender
    ? groupProductCategoriesForGender(categories, gender)
    : groupProductCategories(categories)

  const flatCategories = groups.flatMap((group) => group.categories)
  const selectedSlug = value
    ? flatCategories.find((category) => category.id === value)?.slug ?? ''
    : ''

  return (
    <select
      value={selectedSlug}
      onChange={(e) => {
        const slug = e.target.value
        if (!slug) {
          onChange(undefined)
          return
        }
        const category = flatCategories.find((entry) => entry.slug === slug)
        onChange(category?.id, category?.slug)
      }}
      className={className}
    >
      <option value="">{placeholder}</option>
      {groups.map((group) => (
        <optgroup key={group.label} label={group.label}>
          {group.categories.map((category) => (
            <option key={category.slug} value={category.slug}>
              {category.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}
