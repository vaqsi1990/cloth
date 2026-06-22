import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkAndClearExpiredDiscounts, processExpiredDiscount } from '@/utils/discountUtils'
import { ownerProductListSelect, parseListPagination } from '@/lib/product-owner-query'
import { buildPublicProductDiscoveryWhere } from '@/lib/sold-products'
import { Prisma } from '@prisma/client'

function buildAuthorProductWhere(userId: string, isAdmin: boolean): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {
    userId,
    status: { notIn: ['RESERVED'] },
  }

  if (!isAdmin) {
    Object.assign(where, buildPublicProductDiscoveryWhere())
  }

  return where
}

// GET - Fetch products by author/user ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions)
    const resolvedParams = await params
    const userId = resolvedParams.id

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'ავტორის ID აუცილებელია' },
        { status: 400 },
      )
    }

    const { searchParams } = new URL(request.url)
    const usePagination = searchParams.has('page') || searchParams.has('limit')
    const { page, limit, skip } = parseListPagination(searchParams)

    const [user, isAdmin] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          image: true,
          blocked: true,
          banned: true,
        },
      }),
      Promise.resolve(session?.user?.role === 'ADMIN'),
    ])

    if (!user || (!isAdmin && user.banned)) {
      return NextResponse.json(
        { success: false, message: 'ავტორი ვერ მოიძებნა' },
        { status: 404 },
      )
    }

    const where = buildAuthorProductWhere(userId, isAdmin)

    const listArgs = {
      where,
      select: {
        ...ownerProductListSelect,
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' as const },
      ...(usePagination ? { skip, take: limit } : {}),
    }

    const products = await prisma.product.findMany(listArgs)

    const totalCount = usePagination
      ? await prisma.product.count({ where })
      : products.length

    const productIds = products
      .filter((p) => p.discount && p.discountDays && p.discountStartDate)
      .map((p) => p.id)

    if (productIds.length > 0) {
      void checkAndClearExpiredDiscounts(productIds).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      author: user,
      products: products.map(processExpiredDiscount),
      ...(usePagination
        ? {
            page,
            limit,
            totalCount,
            totalPages: Math.ceil(totalCount / limit),
          }
        : {}),
    })
  } catch (error) {
    console.error('Error fetching author products:', error)
    return NextResponse.json(
      { success: false, message: 'შეცდომა ავტორის პროდუქტების მიღებისას' },
      { status: 500 },
    )
  }
}
