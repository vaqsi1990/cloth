import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validation schema for rental price tier
const rentalPriceTierSchema = z.object({
  minDays: z.number().int().min(1),
  pricePerDay: z.number().positive()
})

const createRentalPriceTiersSchema = z.object({
  tiers: z.array(rentalPriceTierSchema).min(1)
})

// GET - Get rental price tiers for a product
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

    const priceTiers = await prisma.rentalPriceTier.findMany({
      where: { productId },
      orderBy: { minDays: 'asc' }
    })

    return NextResponse.json({
      success: true,
      priceTiers
    })

  } catch (error) {
    console.error('Error fetching rental price tiers:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST - Create/Update rental price tiers for a product
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { id } = await params
    const productId = parseInt(id)
    
    if (isNaN(productId)) {
      return NextResponse.json(
        { error: 'Invalid product ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validatedData = createRentalPriceTiersSchema.parse(body)

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId }
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Delete existing price tiers for this product
    await prisma.rentalPriceTier.deleteMany({
      where: { productId }
    })

    // Create new price tiers
    await prisma.rentalPriceTier.createMany({
      data: validatedData.tiers.map(tier => ({
        productId,
        minDays: tier.minDays,
        pricePerDay: tier.pricePerDay
      }))
    })

    // Fetch the created tiers
    const createdTiers = await prisma.rentalPriceTier.findMany({
      where: { productId },
      orderBy: { minDays: 'asc' }
    })

    return NextResponse.json({
      success: true,
      message: 'Rental price tiers updated successfully',
      priceTiers: createdTiers
    })

  } catch (error) {
    console.error('Error updating rental price tiers:', error)
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false,
          message: 'Validation error',
          errors: error.issues.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// DELETE - Delete all rental price tiers for a product
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { id } = await params
    const productId = parseInt(id)
    
    if (isNaN(productId)) {
      return NextResponse.json(
        { error: 'Invalid product ID' },
        { status: 400 }
      )
    }

    await prisma.rentalPriceTier.deleteMany({
      where: { productId }
    })

    return NextResponse.json({
      success: true,
      message: 'Rental price tiers deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting rental price tiers:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
