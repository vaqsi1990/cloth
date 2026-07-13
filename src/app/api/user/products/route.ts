import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkAndClearExpiredDiscounts, processExpiredDiscount } from '@/utils/discountUtils'
import { ownerProductListSelect, parseListPagination } from '@/lib/product-owner-query'
import {
  buildExcludeSoldProductsWhere,
  buildSoldProductSqlExclusion,
} from '@/lib/sold-products'
import { orderProductsByIdList } from '@/lib/admin-product-list-order'
import { notDeletedProductWhere, softDeleteProductAndRevalidate } from '@/lib/product-soft-delete'

// GET - Fetch user's products
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 },
      )
    }

    const { searchParams } = new URL(request.url)
    const { page, limit, skip } = parseListPagination(searchParams)

    const where = {
      userId: session.user.id,
      ...notDeletedProductWhere,
      ...buildExcludeSoldProductsWhere(),
    }

    const [orderedIds, totalCount] = await Promise.all([
      prisma.$queryRaw<{ id: number }[]>`
        SELECT p.id
        FROM "Product" p
        WHERE p."userId" = ${session.user.id}
          AND p."deletedAt" IS NULL
          AND ${buildSoldProductSqlExclusion()}
        ORDER BY
          CASE p."approvalStatus"::text
            WHEN 'PENDING' THEN 0
            WHEN 'REJECTED' THEN 1
            WHEN 'APPROVED' THEN 2
            ELSE 3
          END ASC,
          p."createdAt" DESC,
          p.id DESC
        LIMIT ${limit}
        OFFSET ${skip}
      `,
      prisma.product.count({ where }),
    ])

    const productIds = orderedIds.map((row) => row.id)
    const products =
      productIds.length === 0
        ? []
        : orderProductsByIdList(
            await prisma.product.findMany({
              where: { id: { in: productIds } },
              select: ownerProductListSelect,
            }),
            productIds,
          )

    const discountProductIds = products
      .filter((p) => p.discount && p.discountDays && p.discountStartDate)
      .map((p) => p.id)

    if (discountProductIds.length > 0) {
      void checkAndClearExpiredDiscounts(discountProductIds).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      products: products.map(processExpiredDiscount),
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    })
  } catch (error) {
    console.error('Error fetching user products:', error)
    return NextResponse.json(
      { success: false, error: 'Error fetching products' },
      { status: 500 },
    )
  }
}

// DELETE - Delete user's product
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 },
      )
    }

    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('id')

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 },
      )
    }

    const parsedProductId = parseInt(productId, 10)
    if (Number.isNaN(parsedProductId)) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 },
      )
    }

    const product = await prisma.product.findFirst({
      where: {
        id: parsedProductId,
        userId: session.user.id,
        ...notDeletedProductWhere,
      },
    })

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 },
      )
    }

    await softDeleteProductAndRevalidate(parsedProductId)

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json(
      { success: false, error: 'Error deleting product' },
      { status: 500 },
    )
  }
}
