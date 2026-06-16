import { Prisma } from '@prisma/client'

export const COMPLETED_SALE_ORDER_STATUSES = ['PAID', 'SHIPPED'] as const

export const soldProductOrderItemFilter = {
  isRental: false,
  order: {
    status: { in: [...COMPLETED_SALE_ORDER_STATUSES] },
  },
} satisfies Prisma.OrderItemWhereInput

/** Exclude products that were purchased in a completed sale order. */
export function buildExcludeSoldProductsWhere(): Prisma.ProductWhereInput {
  return {
    NOT: {
      orderItems: {
        some: soldProductOrderItemFilter,
      },
    },
  }
}

/** SQL fragment for raw product list queries (`p` = Product alias). */
export function buildSoldProductSqlExclusion(): Prisma.Sql {
  return Prisma.sql`NOT EXISTS (
    SELECT 1 FROM "OrderItem" oi
    INNER JOIN "Order" o ON o.id = oi."orderId"
    WHERE oi."productId" = p.id
      AND oi."isRental" = false
      AND o.status IN ('PAID', 'SHIPPED')
  )`
}

/** Sale-only listings with no stock should not appear in the shop. */
export function buildSaleStockAvailabilitySql(): Prisma.Sql {
  return Prisma.sql`(
    p."isRentable" = true
    OR p.stock > 0
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
          none: {
            price: { gt: 0 },
          },
        },
      },
    ],
  }
}
