import { prisma } from '@/lib/prisma'
import { productHasSkuVariants } from '@/lib/product-variants'

export type SaleStockLine = {
  productId: number
  variantId?: number | null
  color?: string | null
  size?: string | null
  quantity?: number
  isRental?: boolean | null
}

export type VariantSkuRow = {
  id: number
  color: string | null
  size: string | null
  stock?: number | null
}

export function resolveVariantIdForSaleItem(
  product: { variants: VariantSkuRow[] },
  item: Pick<SaleStockLine, 'variantId' | 'color' | 'size'>,
): number | null {
  if (item.variantId) {
    return item.variantId
  }

  const color = item.color?.trim() || null
  const size = item.size?.trim() || null
  if (!color && !size) {
    return null
  }

  const match = product.variants.find((variant) => {
    const variantColor = variant.color?.trim() || null
    const variantSize = variant.size?.trim() || null
    return (color ? variantColor === color : true) && (size ? variantSize === size : true)
  })

  return match?.id ?? null
}

export function getAvailableStockFromProduct(
  product: {
    stock?: number | null
    variants: VariantSkuRow[]
  },
  item: Pick<SaleStockLine, 'variantId' | 'color' | 'size'>,
): number {
  if (productHasSkuVariants(product)) {
    const variantId = resolveVariantIdForSaleItem(product, item)
    if (!variantId) return 0
    const variant = product.variants.find((row) => row.id === variantId)
    return variant?.stock ?? 0
  }

  return product.stock ?? 0
}

export async function getAvailableStockForSaleLine(
  line: SaleStockLine,
): Promise<number> {
  if (line.isRental) {
    return Number.MAX_SAFE_INTEGER
  }

  const product = await prisma.product.findUnique({
    where: { id: line.productId },
    select: {
      stock: true,
      variants: {
        select: { id: true, color: true, size: true, stock: true },
      },
    },
  })

  if (!product) {
    return 0
  }

  return getAvailableStockFromProduct(product, line)
}

export async function validateSaleItemStock(
  line: SaleStockLine,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (line.isRental) {
    return { ok: true }
  }

  const quantity = line.quantity ?? 1
  const available = await getAvailableStockForSaleLine(line)

  if (available < quantity) {
    return {
      ok: false,
      message: 'ეს ზომა უკვე გაყიდულია ან მარაგში აღარ არის',
    }
  }

  return { ok: true }
}
