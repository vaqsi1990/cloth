import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const productId = parseInt(id)
    
    if (isNaN(productId)) {
      return NextResponse.json(
        { error: 'Invalid product ID' },
        { status: 400 }
      )
    }

    // Get the current date to filter active rentals
    const now = new Date()
    
    // Get all active rentals for this product
    // Only consider rentals that haven't been returned/canceled and are within date range
    const activeRentals = await prisma.rental.findMany({
      where: {
        productId: productId,
        status: {
          in: ['RESERVED', 'ACTIVE']
        },
        endDate: {
          gte: now // Rental hasn't ended yet
        }
      },
      select: {
        id: true,
        variantId: true,
        startDate: true,
        endDate: true,
        status: true,
      },
      orderBy: {
        startDate: 'asc'
      },
      take: 100 // Limit results to prevent excessive data fetching
    })

    // Get all active orders with rental items for this product
    // Filter for orders that have rental periods that haven't ended yet
    const activeOrders = await prisma.order.findMany({
      where: {
        status: {
          in: ['PENDING', 'PAID', 'SHIPPED']
        },
        items: {
          some: {
            productId: productId,
            isRental: true,
            rentalEndDate: {
              gte: now // Rental period hasn't ended yet
            }
          }
        }
      },
      select: {
        id: true,
        status: true,
        items: {
          where: {
            productId: productId,
            isRental: true,
            rentalEndDate: {
              gte: now // Only include items with active rental periods
            }
          },
          select: {
            id: true,
            isRental: true,
            rentalStartDate: true,
            rentalEndDate: true,
            size: true,
          }
        }
      },
      take: 100 // Limit results to prevent excessive data fetching
    })

    // Group rentals by variant ID
    const rentalStatusByVariant: { [variantId: string]: Array<{ startDate: string, endDate: string, status: string }> } = {}

    activeRentals.forEach(rental => {
      const variantId = rental.variantId ? `variant_${rental.variantId}` : 'no_variant'
      if (!rentalStatusByVariant[variantId]) {
        rentalStatusByVariant[variantId] = []
      }
      rentalStatusByVariant[variantId].push({
        startDate: rental.startDate.toISOString(),
        endDate: rental.endDate.toISOString(),
        status: rental.status
      })
    })

    // Also add rental items from orders
    activeOrders.forEach(order => {
      order.items.forEach(item => {
        if (item.isRental && item.rentalStartDate && item.rentalEndDate) {
          // Use product size from order item or default
          const sizeKey = item.size || 'default'
          if (!rentalStatusByVariant[sizeKey]) {
            rentalStatusByVariant[sizeKey] = []
          }
          rentalStatusByVariant[sizeKey].push({
            startDate: item.rentalStartDate.toISOString(),
            endDate: item.rentalEndDate.toISOString(),
            status: order.status
          })
        }
      })
    })

    // Get product variants
    const product = await prisma.product.findUnique({
      // @ts-ignore - cacheStrategy is available with Prisma Accelerate
      cacheStrategy: {
        swr: 60, // Stale-while-revalidating for 60 seconds
        ttl: 60, // Cache results for 60 seconds
      },
      where: { id: productId },
      select: {
        id: true,
        variants: {
          select: {
            id: true,
          }
        }
      }
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Create response with rental status for each variant (using variant IDs)
    const variantRentalStatus = product.variants.map(variant => {
      const variantKey = `variant_${variant.id}`
      const variantRentals = rentalStatusByVariant[variantKey] || []
      return {
        variantId: variant.id,
        activeRentals: variantRentals,
        isAvailable: variantRentals.length === 0
      }
    })

    return NextResponse.json({
      success: true,
      productId: productId,
      variants: variantRentalStatus,
      totalActiveRentals: activeRentals.length,
      totalActiveOrders: activeOrders.length
    })

  } catch (error) {
    console.error('Rental status fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
