import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkAndBlockUser } from '@/utils/revenue'
import { RentalStatus } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is blocked
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { 
        blocked: true 
      }
    })

    if (user?.blocked) {
      return NextResponse.json(
        { 
          error: 'Your account requires identity verification. Please upload a document.',
          blocked: true
        },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { 
      productId, 
      variantId, 
      startDate, 
      endDate, 
      pricePerDay,
      totalPrice 
    } = body

    // Validate required fields
    if (!productId || !startDate || !endDate || !pricePerDay || !totalPrice) {
      return NextResponse.json(
        { error: 'Missing required fields: productId, startDate, endDate, pricePerDay, totalPrice' },
        { status: 400 }
      )
    }

    // Validate dates
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    if (start >= end) {
      return NextResponse.json(
        { error: 'Start date must be before end date' },
        { status: 400 }
      )
    }

    if (start < new Date()) {
      return NextResponse.json(
        { error: 'Start date cannot be in the past' },
        { status: 400 }
      )
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { variants: true }
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Also check for size-based rentals if variantId is not provided
    // or if we need to validate by size from the variant
    
    // If variantId is provided, check if variant exists and belongs to product
    if (variantId) {
      const variant = await prisma.productVariant.findFirst({
        where: { 
          id: variantId, 
          productId: productId 
        }
      })

      if (!variant) {
        return NextResponse.json(
          { error: 'Product variant not found' },
          { status: 404 }
        )
      }

      // Check if variant is available for rental during the requested period
      // Need to check both rental table and order items with active rentals
      
      // 1. Check rental table
      const existingRentals = await prisma.rental.findMany({
        where: {
          variantId: variantId,
          status: {
            in: ['RESERVED', 'ACTIVE']
          }
        }
      })

      // 2. Check order items with active rentals for this product
      const existingOrders = await prisma.order.findMany({
        where: {
          status: {
            in: ['PENDING', 'PAID', 'SHIPPED']
          },
          items: {
            some: {
              productId: productId,
              isRental: true,
              rentalEndDate: {
                gte: new Date()
              }
            }
          }
        },
        include: {
          items: {
            where: {
              productId: productId,
              isRental: true
            }
          }
        }
      })

      // Check for conflicts including maintenance buffer (1 day after rental ends)
      const hasConflict = () => {
        // Check existing rentals from rental table
        for (const rental of existingRentals) {
          const rentalStart = new Date(rental.startDate)
          const rentalEnd = new Date(rental.endDate)
          const rentalLastBlockedDate = new Date(rentalEnd.getTime() + 24 * 60 * 60 * 1000) // Add 1 day maintenance
          
          // Check if requested dates conflict with this rental period
          if (start < rentalLastBlockedDate && end >= rentalStart) {
            return true
          }
        }

        // Check order items
        for (const order of existingOrders) {
          for (const item of order.items) {
            if (item.isRental && item.rentalStartDate && item.rentalEndDate) {
              const itemStart = new Date(item.rentalStartDate)
              const itemEnd = new Date(item.rentalEndDate)
              const itemLastBlockedDate = new Date(itemEnd.getTime() + 24 * 60 * 60 * 1000) // Add 1 day maintenance
              
              // Check if requested dates conflict with this rental period
              if (start < itemLastBlockedDate && end >= itemStart) {
                return true
              }
            }
          }
        }

        return false
      }

      if (hasConflict()) {
        return NextResponse.json(
          { error: 'Product variant is not available for the selected dates' },
          { status: 409 }
        )
      }
    }

    // Create rental
    const rental = await prisma.rental.create({
      data: {
        productId,
        variantId: variantId || null,
        userId: session.user.id,
        startDate: start,
        endDate: end,
        pricePerDay,
        totalPrice,
        status: 'RESERVED'
      },
      include: {
        product: {
          include: {
            images: true,
            category: true
          }
        },
        variant: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    const sellerId = product.userId
    if (!sellerId) {
      console.error('Product owner not found for rental', { productId })
      return NextResponse.json(
        { error: 'Product owner not found' },
        { status: 500 }
      )
    }

    // Create transaction record
    const transaction = await prisma.transaction.create({
      data: {
        type: 'RENT',
        total: totalPrice,
        userId: sellerId,
        rentalId: rental.id
      }
    })

    // Check revenue and block user if needed
    await checkAndBlockUser(sellerId, 2)

    return NextResponse.json({
      success: true,
      rental,
      transaction
    }, { status: 201 })

  } catch (error) {
    console.error('Rental creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const productIdParam = searchParams.get('productId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    const whereClause: { userId: string; status?: RentalStatus; productId?: number } = {
      userId: session.user.id
    }

    if (status) {
      whereClause.status = status as RentalStatus
    }

    if (productIdParam) {
      const productId = parseInt(productIdParam)
      if (!isNaN(productId)) {
        whereClause.productId = productId
      }
    }

    const rentals = await prisma.rental.findMany({
      where: whereClause,
      include: {
        product: {
          include: {
            images: true,
            category: true
          }
        },
        variant: true,
        transactions: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    })

    const total = await prisma.rental.count({
      where: whereClause
    })

    return NextResponse.json({
      rentals,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Rental fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
