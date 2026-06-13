import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { prismaCacheStrategy } from '@/lib/prisma-cache'

const RENTAL_STATUS_CACHE = { swr: 30, ttl: 30 }

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const idsParam = searchParams.get('ids')
    
    if (!idsParam) {
      return NextResponse.json(
        { error: 'Product IDs are required' },
        { status: 400 }
      )
    }

    const productIds = idsParam
      .split(',')
      .map(id => parseInt(id.trim(), 10))
      .filter(id => !isNaN(id))

    if (productIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid product IDs' },
        { status: 400 }
      )
    }

    const now = new Date()

    const [activeRentals, activeOrders, products] = await Promise.all([
      prisma.rental.findMany({
        where: {
          productId: { in: productIds },
          status: { in: ['RESERVED', 'ACTIVE'] },
          endDate: { gte: now },
        },
        select: {
          productId: true,
          variantId: true,
          startDate: true,
          endDate: true,
          status: true,
        },
        orderBy: { startDate: 'asc' },
        take: 200,
        ...prismaCacheStrategy(RENTAL_STATUS_CACHE),
      }),
      prisma.order.findMany({
        where: {
          status: { in: ['PENDING', 'PAID', 'SHIPPED'] },
          items: {
            some: {
              productId: { in: productIds },
              isRental: true,
              rentalEndDate: { gte: now },
            },
          },
        },
        select: {
          status: true,
          items: {
            where: {
              productId: { in: productIds },
              isRental: true,
              rentalEndDate: { gte: now },
            },
            select: {
              productId: true,
              isRental: true,
              rentalStartDate: true,
              rentalEndDate: true,
              size: true,
            },
          },
        },
        take: 100,
        ...prismaCacheStrategy(RENTAL_STATUS_CACHE),
      }),
      prisma.product.findMany({
        where: { id: { in: productIds } },
        select: {
          id: true,
          variants: {
            select: { id: true },
          },
        },
        take: 100,
        ...prismaCacheStrategy(RENTAL_STATUS_CACHE),
      }),
    ])

    type RentalPeriod = { startDate: string; endDate: string; status: string }

    const rentalStatusByProduct: Record<number, Record<string, RentalPeriod[]>> = {}

    for (const rental of activeRentals) {
      const pid = rental.productId
      const variantKey = rental.variantId ? `variant_${rental.variantId}` : 'no_variant'
      if (!rentalStatusByProduct[pid]) rentalStatusByProduct[pid] = {}
      if (!rentalStatusByProduct[pid][variantKey]) rentalStatusByProduct[pid][variantKey] = []
      rentalStatusByProduct[pid][variantKey].push({
        startDate: rental.startDate.toISOString(),
        endDate: rental.endDate.toISOString(),
        status: rental.status,
      })
    }

    for (const order of activeOrders) {
      for (const item of order.items) {
        if (!item.isRental || !item.rentalStartDate || !item.rentalEndDate) continue
        const pid = item.productId as number
        const sizeKey = item.size || 'default'
        if (!rentalStatusByProduct[pid]) rentalStatusByProduct[pid] = {}
        if (!rentalStatusByProduct[pid][sizeKey]) rentalStatusByProduct[pid][sizeKey] = []
        rentalStatusByProduct[pid][sizeKey].push({
          startDate: item.rentalStartDate.toISOString(),
          endDate: item.rentalEndDate.toISOString(),
          status: order.status,
        })
      }
    }

    const statuses: { [productId: number]: Array<{
      variantId: number
      activeRentals: RentalPeriod[]
      isAvailable: boolean
    }> } = {}

    for (const product of products) {
      const rentalStatusBySize = rentalStatusByProduct[product.id] || {}

      statuses[product.id] = product.variants.map(variant => {
        const variantKey = `variant_${variant.id}`
        const variantRentals = rentalStatusBySize[variantKey] || []
        return {
          variantId: variant.id,
          activeRentals: variantRentals,
          isAvailable: variantRentals.length === 0,
        }
      })
    }

    const response = NextResponse.json({
      success: true,
      statuses,
    })
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=30, stale-while-revalidate=60',
    )
    return response

  } catch (error) {
    console.error('Batch rental status fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
