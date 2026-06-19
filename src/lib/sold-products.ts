import { Prisma } from '@prisma/client'
import { buildProductHasSkuVariantsWhere } from '@/lib/product-variants'

export const COMPLETED_SALE_ORDER_STATUSES = ['PAID', 'SHIPPED'] as const

export const soldProductOrderItemFilter = {
  isRental: false,
  order: {
    status: { in: [...COMPLETED_SALE_ORDER_STATUSES] },
  },
} satisfies Prisma.OrderItemWhereInput

/**
 * Hide simple (non-SKU) products that were already sold.
 * Multi-variant products stay visible while other variants remain available.
 */
export function buildExcludeSoldProductsWhere(): Prisma.ProductWhereInput {
  return {
    OR: [
      buildProductHasSkuVariantsWhere(),
      {
        NOT: {
          orderItems: {
            some: soldProductOrderItemFilter,
          },
        },
      },
    ],
  }
}

/** SQL fragment for raw product list queries (`p` = Product alias). */
export function buildSoldProductSqlExclusion(): Prisma.Sql {
  return Prisma.sql`(
    EXISTS (
      SELECT 1 FROM "ProductVariant" pv
      WHERE pv."productId" = p.id
        AND (
          (pv.color IS NOT NULL AND TRIM(pv.color) <> '')
          OR (pv.size IS NOT NULL AND TRIM(pv.size) <> '')
          OR (pv."imageUrl" IS NOT NULL AND TRIM(pv."imageUrl") <> '')
        )
    )
    OR NOT EXISTS (
      SELECT 1 FROM "OrderItem" oi
      INNER JOIN "Order" o ON o.id = oi."orderId"
      WHERE oi."productId" = p.id
        AND oi."isRental" = false
        AND o.status IN ('PAID', 'SHIPPED')
    )
  )`
}

/** Sale listings need stock on the product or on at least one priced variant. */
export function buildSaleStockAvailabilitySql(): Prisma.Sql {
  return Prisma.sql`(
    p."isRentable" = true
    OR p.stock > 0
    OR EXISTS (
      SELECT 1 FROM "ProductVariant" pv
      WHERE pv."productId" = p.id
        AND pv.price > 0
        AND pv.stock > 0
    )
    OR NOT EXISTS (
      SELECT 1 FROM "ProductVariant" pv
      WHERE pv."productId" = p.id AND pv.price > 0
    )
  )`
}

export function buildSaleStockAvailabilityWhere(): Prisma.ProductWhereInput {
  return {
    OR: [
      { isRentable: true },
      { stock: { gt: 0 } },
      {
        variants: {
          some: {
            stock: { gt: 0 },
            price: { gt: 0 },
          },
        },
      },
      {
        variants: {
          none: {
            price: { gt: 0 },
          },
        },
      },
    ],
  }
}
