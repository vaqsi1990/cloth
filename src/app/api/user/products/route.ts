import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkAndClearExpiredDiscounts, processExpiredDiscount } from '@/utils/discountUtils'
import { ownerProductListSelect, parseListPagination } from '@/lib/product-owner-query'
import { revalidateProductListCache } from '@/lib/product-list-query'

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

    const where = { userId: session.user.id }

    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        select: ownerProductListSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ])

    const productIds = products
      .filter((p) => p.discount && p.discountDays && p.discountStartDate)
      .map((p) => p.id)

    if (productIds.length > 0) {
      void checkAndClearExpiredDiscounts(productIds).catch(() => {})
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

    const product = await prisma.product.findFirst({
      where: {
        id: parseInt(productId),
        userId: session.user.id,
      },
    })

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 },
      )
    }

    await prisma.product.delete({
      where: { id: parseInt(productId) },
    })

    revalidateProductListCache()

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
