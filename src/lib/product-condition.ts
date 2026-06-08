export type ProductCondition = 'new' | 'second-hand' | null

export function getProductCondition(product: {
  isNew: boolean
  isSecondHand: boolean
}): ProductCondition {
  if (product.isNew) return 'new'
  if (product.isSecondHand) return 'second-hand'
  return null
}

export function getProductConditionLabel(product: {
  isNew: boolean
  isSecondHand: boolean
}): string | null {
  const condition = getProductCondition(product)
  if (condition === 'new') return 'ახალი'
  if (condition === 'second-hand') return 'მეორადი'
  return null
}

export function applyProductCondition(
  condition: ProductCondition,
): { isNew: boolean; isSecondHand: boolean } {
  return {
    isNew: condition === 'new',
    isSecondHand: condition === 'second-hand',
  }
}
