import type { Gender, SizeSystem } from '@prisma/client'
import type { Prisma } from '@prisma/client'

export type OrderItemProductSnapshot = {
  name: string
  image: string | null
  brand: string | null
  color: string | null
  sku: string | null
  size: string | null
  sizeSystem: SizeSystem | null
  gender: Gender | null
  categoryName: string | null
  price: number
  quantity: number
  isRentable: boolean
}

type SnapshotProduct = {
  name: string
  brand: string | null
  color: string | null
  sku: string | null
  size: string | null
  sizeSystem: SizeSystem | null
  gender: Gender
  isRentable: boolean
  userId: string | null
  images?: Array<{ url: string }>
  category?: { name: string } | null
}

export function buildOrderItemProductSnapshot(input: {
  productName: string
  image: string | null
  size: string | null
  color?: string | null
  variantId?: number | null
  price: number
  quantity: number
  product: SnapshotProduct | null | undefined
}): OrderItemProductSnapshot & { variantId?: number | null } {
  const product = input.product

  return {
    name: product?.name || input.productName,
    image: input.image || product?.images?.[0]?.url || null,
    brand: product?.brand ?? null,
    color: input.color || product?.color || null,
    sku: product?.sku ?? null,
    size: input.size || product?.size || null,
    sizeSystem: product?.sizeSystem ?? null,
    gender: product?.gender ?? null,
    categoryName: product?.category?.name ?? null,
    price: input.price,
    quantity: input.quantity,
    isRentable: product?.isRentable ?? false,
    variantId: input.variantId ?? null,
  }
}

export function parseOrderItemProductSnapshot(
  value: unknown,
): OrderItemProductSnapshot | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  const snapshot = value as Record<string, unknown>

  if (typeof snapshot.name !== 'string') {
    return null
  }

  return {
    name: snapshot.name,
    image: typeof snapshot.image === 'string' ? snapshot.image : null,
    brand: typeof snapshot.brand === 'string' ? snapshot.brand : null,
    color: typeof snapshot.color === 'string' ? snapshot.color : null,
    sku: typeof snapshot.sku === 'string' ? snapshot.sku : null,
    size: typeof snapshot.size === 'string' ? snapshot.size : null,
    sizeSystem:
      snapshot.sizeSystem === 'EU' ||
      snapshot.sizeSystem === 'US' ||
      snapshot.sizeSystem === 'UK' ||
      snapshot.sizeSystem === 'CN'
        ? snapshot.sizeSystem
        : null,
    gender:
      snapshot.gender === 'MEN' ||
      snapshot.gender === 'WOMEN' ||
      snapshot.gender === 'CHILDREN' ||
      snapshot.gender === 'UNISEX'
        ? snapshot.gender
        : null,
    categoryName:
      typeof snapshot.categoryName === 'string' ? snapshot.categoryName : null,
    price: typeof snapshot.price === 'number' ? snapshot.price : 0,
    quantity: typeof snapshot.quantity === 'number' ? snapshot.quantity : 1,
    isRentable: snapshot.isRentable === true,
  }
}

export const orderItemSnapshotProductSelect = {
  name: true,
  brand: true,
  color: true,
  sku: true,
  size: true,
  sizeSystem: true,
  gender: true,
  isRentable: true,
  userId: true,
  images: {
    select: { url: true },
    take: 1,
    orderBy: { position: 'asc' as const },
  },
  category: {
    select: { name: true },
  },
} as const

export function isSaleOrderItem(isRental: boolean | null | undefined): boolean {
  return isRental !== true
}

export function formatSnapshotGender(gender: Gender | null): string | null {
  switch (gender) {
    case 'MEN':
      return 'კაცი'
    case 'WOMEN':
      return 'ქალი'
    case 'CHILDREN':
      return 'ბავშვი'
    case 'UNISEX':
      return 'უნისექსი'
    default:
      return null
  }
}

type OrderItemVariantSource = {
  productName?: string
  size?: string | null
  color?: string | null
  productSnapshot?: unknown
  product?: { name?: string } | null
}

export function getOrderItemProductName(item: OrderItemVariantSource): string {
  const snapshot = parseOrderItemProductSnapshot(item.productSnapshot)
  return (
    snapshot?.name ||
    item.product?.name ||
    item.productName ||
    'პროდუქტი'
  )
}

export function getOrderItemVariantLabel(item: OrderItemVariantSource): string | null {
  const snapshot = parseOrderItemProductSnapshot(item.productSnapshot)
  const size = snapshot?.size ?? item.size
  const color = snapshot?.color ?? item.color
  const sizeSystem = snapshot?.sizeSystem ?? null

  const parts: string[] = []
  if (size) {
    parts.push(
      sizeSystem ? `ზომა: ${size} (${sizeSystem})` : `ზომა: ${size}`,
    )
  }
  if (color) {
    parts.push(`ფერი: ${color}`)
  }

  return parts.length > 0 ? parts.join(' · ') : null
}

export function getOrderItemAdminSummary(item: OrderItemVariantSource): string {
  const name = getOrderItemProductName(item)
  const variant = getOrderItemVariantLabel(item)
  return variant ? `${name} — ${variant}` : name
}
