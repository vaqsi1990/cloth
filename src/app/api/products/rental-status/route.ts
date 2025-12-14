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
      include: {
        variant: true
      },
      orderBy: {
        startDate: 'asc'
      }
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
      include: {
        items: {
          where: {
            productId: {
              in: productIds
            },
            isRental: true,
            rentalEndDate: {
              gte: now
            }
          }
        }
      }
    })

    // Get all products with their variants
    const products = await prisma.product.findMany({
      where: {
        id: {
          in: productIds
        }
      },
      include: {
        variants: true
      }
    })

    // Build response object grouped by product ID
    const statuses: { [productId: number]: any[] } = {}

    products.forEach(product => {
      // Group rentals by variant/size for this product
      const rentalStatusBySize: { [size: string]: Array<{ startDate: string, endDate: string, status: string }> } = {}

      // Add rentals for this product
      activeRentals
        .filter(rental => rental.productId === product.id)
        .forEach(rental => {
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

      // Add order items for this product
      activeOrders.forEach(order => {
        order.items
          .filter(item => item.productId === product.id)
          .forEach(item => {
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

      // Create variant rental status for this product
      const variantRentalStatus = product.variants.map(variant => {
        const variantSizeKey = variant.size || 'UNKNOWN'
        const variantRentals = rentalStatusBySize[variantSizeKey] || []
        return {
          variantId: variant.id,
          size: variant.size,
          activeRentals: variantRentals,
          isAvailable: variantRentals.length === 0
        }
      })

      statuses[product.id] = variantRentalStatus
    })

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

