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
  onChange: (categoryId: number | undefined) => void
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

  return (
    <select
      value={value}
      onChange={(e) =>
        onChange(e.target.value ? parseInt(e.target.value, 10) : undefined)
      }
      className={className}
    >
      <option value="">{placeholder}</option>
      {groups.map((group) => (
        <optgroup key={group.label} label={group.label}>
          {group.categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}
