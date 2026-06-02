'use client'

import { groupProductCategories, ProductCategory } from '@/lib/product-categories'

type ProductCategorySelectProps = {
  categories: ProductCategory[]
  value: number | ''
  onChange: (categoryId: number | undefined) => void
  className?: string
  placeholder?: string
}

export default function ProductCategorySelect({
  categories,
  value,
  onChange,
  className,
  placeholder = 'აირჩიეთ კატეგორია',
}: ProductCategorySelectProps) {
  const groups = groupProductCategories(categories)

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
