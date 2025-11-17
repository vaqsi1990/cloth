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
      include: {
        variant: true
      },
      orderBy: {
        startDate: 'asc'
      }
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
      include: {
        items: {
          where: {
            productId: productId,
            isRental: true,
            rentalEndDate: {
              gte: now // Only include items with active rental periods
            }
          }
        }
      }
    })

    // Group rentals by variant/size
    const rentalStatusBySize: { [size: string]: Array<{ startDate: string, endDate: string, status: string }> } = {}

    activeRentals.forEach(rental => {
      const size = rental.variant?.size || 'UNKNOWN'
      if (!rentalStatusBySize[size]) {
        rentalStatusBySize[size] = []
      }
      rentalStatusBySize[size].push({
        startDate: rental.startDate.toISOString(),
        endDate: rental.endDate.toISOString(),
        status: rental.status
      })
    })

    // Also add rental items from orders
    activeOrders.forEach(order => {
      order.items.forEach(item => {
        if (item.isRental && item.rentalStartDate && item.rentalEndDate) {
          const size = item.size || 'UNKNOWN'
          if (!rentalStatusBySize[size]) {
            rentalStatusBySize[size] = []
          }
          rentalStatusBySize[size].push({
            startDate: item.rentalStartDate.toISOString(),
            endDate: item.rentalEndDate.toISOString(),
            status: order.status
          })
        }
      })
    })

    // Get product variants to show all available sizes
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        variants: true
      }
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Create response with rental status for each variant
    const variantRentalStatus = product.variants.map(variant => {
      const variantSizeKey = variant.size || 'UNKNOWN'
      const variantRentals = rentalStatusBySize[variantSizeKey] || []
      return {
        variantId: variant.id,
        size: variant.size,
        stock: variant.stock,
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
