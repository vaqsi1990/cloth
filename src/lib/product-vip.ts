export const VIP_MONTHLY_PRICE_GEL = 2
export const VIP_DURATION_DAYS = 30

export type VipProductFields = {
  isVip?: boolean
  vipExpiresAt?: string | Date | null
  createdAt?: string | Date | null
  id?: number
}

export function isProductVipActive(product: VipProductFields): boolean {
  if (!product.isVip || !product.vipExpiresAt) return false
  return new Date(product.vipExpiresAt).getTime() > Date.now()
}

export function getVipExpiryDate(from = new Date()): Date {
  const expiresAt = new Date(from)
  expiresAt.setDate(expiresAt.getDate() + VIP_DURATION_DAYS)
  return expiresAt
}

export function compareVipProductPriority(a: VipProductFields, b: VipProductFields): number {
  const aVip = isProductVipActive(a) ? 1 : 0
  const bVip = isProductVipActive(b) ? 1 : 0
  if (aVip !== bVip) return bVip - aVip

  const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
  const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
  if (aTime !== bTime) return bTime - aTime

  return (b.id ?? 0) - (a.id ?? 0)
}

export function sortProductsByVipPriority<T extends VipProductFields>(products: T[]): T[] {
  return [...products].sort(compareVipProductPriority)
}
