import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

    // Parse comma-separated IDs
    const productIds = idsParam
      .split(',')
      .map(id => parseInt(id.trim()))
      .filter(id => !isNaN(id))

    if (productIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid product IDs' },
        { status: 400 }
      )
    }

    // Get the current date to filter active rentals
    const now = new Date()
    
    // Get all active rentals for these products
    const activeRentals = await prisma.rental.findMany({
      where: {
        productId: {
          in: productIds
        },
        status: {
          in: ['RESERVED', 'ACTIVE']
        },
        endDate: {
          gte: now // Rental hasn't ended yet
        }
      },
      select: {
        id: true,
        productId: true,
        variantId: true,
        startDate: true,
        endDate: true,
        status: true,
      },
      orderBy: {
        startDate: 'asc'
      },
      take: 200 // Limit results to prevent excessive data fetching (higher limit for multiple products)
    })

    // Get all active orders with rental items for these products
    const activeOrders = await prisma.order.findMany({
      where: {
        status: {
          in: ['PENDING', 'PAID', 'SHIPPED']
        },
        items: {
          some: {
            productId: {
              in: productIds
            },
            isRental: true,
            rentalEndDate: {
              gte: now // Rental period hasn't ended yet
            }
          }
        }
      },
      select: {
        status: true,
        items: {
          where: {
            productId: {
              in: productIds
            },
            isRental: true,
            rentalEndDate: {
              gte: now
            }
          },
          select: {
            productId: true,
            isRental: true,
            rentalStartDate: true,
            rentalEndDate: true,
            size: true
          }
        }
      },
      take: 100 // Limit results to prevent excessive data fetching
    })

    // Get all products with their variants
    const products = await prisma.product.findMany({
      where: {
        id: {
          in: productIds
        }
      },
      select: {
        id: true,
        variants: {
          select: {
            id: true
          }
        }
      },
      take: 100 // Limit results to prevent excessive data fetching
    })

    type RentalPeriod = { startDate: string; endDate: string; status: string }

    // Pre-group rentals/orders once to avoid expensive per-product filtering.
    // rentalStatusByProduct[productId][key] => periods[]
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

    // Build response object grouped by product ID
    const statuses: { [productId: number]: any[] } = {}

    for (const product of products) {
      const rentalStatusBySize = rentalStatusByProduct[product.id] || {}

      const variantRentalStatus = product.variants.map(variant => {
        const variantKey = `variant_${variant.id}`
        const variantRentals = rentalStatusBySize[variantKey] || []
        return {
          variantId: variant.id,
          activeRentals: variantRentals,
          isAvailable: variantRentals.length === 0,
        }
      })

      statuses[product.id] = variantRentalStatus
    }

    return NextResponse.json({
      success: true,
      statuses
    })

  } catch (error) {
    console.error('Batch rental status fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

