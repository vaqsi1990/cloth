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
    p.stock > 0
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
    OR (
      p."isRentable" = true
      AND (
        p."pricePerDay" > 0
        OR EXISTS (
          SELECT 1 FROM "RentalPriceTier" rpt
          WHERE rpt."productId" = p.id AND rpt."pricePerDay" > 0
        )
      )
    )
  )`
}

export function buildSaleStockAvailabilityWhere(): Prisma.ProductWhereInput {
  return {
    OR: [
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
      {
        AND: [
          { isRentable: true },
          {
            OR: [
              { pricePerDay: { gt: 0 } },
              { rentalPriceTiers: { some: { pricePerDay: { gt: 0 } } } },
            ],
          },
        ],
      },
    ],
  }
}

/** Shop, search, and public product pages (non-owner, non-admin). */
export function buildPublicProductDiscoveryWhere(): Prisma.ProductWhereInput {
  return {
    AND: [
      { status: { notIn: ['MAINTENANCE', 'DAMAGED', 'RESERVED'] } },
      { approvalStatus: 'APPROVED' },
      { userId: { not: null } },
      { user: { banned: false } },
      buildExcludeSoldProductsWhere(),
      buildSaleStockAvailabilityWhere(),
    ],
  }
}
