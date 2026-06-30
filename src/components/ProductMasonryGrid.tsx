import { ReactNode } from 'react'

interface ProductMasonryGridProps<T> {
  items: T[]
  getKey: (item: T) => string | number
  renderItem: (item: T, index: number) => ReactNode
  className?: string
}

export default function ProductMasonryGrid<T>({
  items,
  getKey,
  renderItem,
  className = '',
}: ProductMasonryGridProps<T>) {
  const leftItems = items.filter((_, index) => index % 2 === 0)
  const rightItems = items.filter((_, index) => index % 2 === 1)

  return (
    <>
      <div className={`flex items-start gap-4 mb-8 lg:hidden ${className}`}>
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {leftItems.map((item, columnIndex) => (
            <div key={getKey(item)}>{renderItem(item, columnIndex * 2)}</div>
          ))}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {rightItems.map((item, columnIndex) => (
            <div key={getKey(item)}>{renderItem(item, columnIndex * 2 + 1)}</div>
          ))}
        </div>
      </div>

      <div className="mb-8 hidden gap-4 gap-y-16 lg:grid lg:grid-cols-3 xl:grid-cols-4 items-stretch">
        {items.map((item, index) => (
          <div key={getKey(item)}>{renderItem(item, index)}</div>
        ))}
      </div>
    </>
  )
}
