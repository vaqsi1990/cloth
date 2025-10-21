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

    // Get all active rentals for this product
    const activeRentals = await prisma.rental.findMany({
      where: {
        productId: productId,
        status: {
          in: ['RESERVED', 'ACTIVE']
        }
      },
      include: {
        variant: true
      },
      orderBy: {
        startDate: 'asc'
      }
    })

    // Group rentals by variant/size
    const rentalStatusBySize: { [size: string]: Array<{ startDate: Date, endDate: Date, status: string }> } = {}

    activeRentals.forEach(rental => {
      const size = rental.variant?.size || 'UNKNOWN'
      if (!rentalStatusBySize[size]) {
        rentalStatusBySize[size] = []
      }
      rentalStatusBySize[size].push({
        startDate: rental.startDate,
        endDate: rental.endDate,
        status: rental.status
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
    const variantRentalStatus = product.variants.map(variant => ({
      variantId: variant.id,
      size: variant.size,
      stock: variant.stock,
      activeRentals: rentalStatusBySize[variant.size] || [],
      isAvailable: !rentalStatusBySize[variant.size] || rentalStatusBySize[variant.size].length === 0
    }))

    return NextResponse.json({
      success: true,
      productId: productId,
      variants: variantRentalStatus,
      totalActiveRentals: activeRentals.length
    })

  } catch (error) {
    console.error('Rental status fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
