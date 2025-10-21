import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { RentalStatus } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
      const conflictingRentals = await prisma.rental.findMany({
        where: {
          variantId: variantId,
          status: {
            in: ['RESERVED', 'ACTIVE']
          },
          OR: [
            {
              AND: [
                { startDate: { lte: start } },
                { endDate: { gte: start } }
              ]
            },
            {
              AND: [
                { startDate: { lte: end } },
                { endDate: { gte: end } }
              ]
            },
            {
              AND: [
                { startDate: { gte: start } },
                { endDate: { lte: end } }
              ]
            }
          ]
        }
      })

      if (conflictingRentals.length > 0) {
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

    // Create transaction record
    const transaction = await prisma.transaction.create({
      data: {
        type: 'RENT',
        total: totalPrice,
        userId: session.user.id,
        rentalId: rental.id
      }
    })

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
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    const whereClause: { userId: string; status?: RentalStatus } = {
      userId: session.user.id
    }

    if (status) {
      whereClause.status = status as RentalStatus
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
