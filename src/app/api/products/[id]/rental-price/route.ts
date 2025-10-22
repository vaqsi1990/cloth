import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validation schema for rental price calculation
const calculatePriceSchema = z.object({
  days: z.number().int().min(1)
})

// GET - Calculate rental price for specific number of days
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

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '0')
    
    if (isNaN(days) || days < 1) {
      return NextResponse.json(
        { error: 'Invalid days parameter' },
        { status: 400 }
      )
    }

    // Get all price tiers for this product, ordered by minDays descending
    const priceTiers = await prisma.rentalPriceTier.findMany({
      where: { productId },
      orderBy: { minDays: 'desc' }
    })

    if (priceTiers.length === 0) {
      return NextResponse.json(
        { error: 'No rental price tiers found for this product' },
        { status: 404 }
      )
    }

    // Find the appropriate price tier
    // We look for the tier with the highest minDays that is <= the requested days
    const applicableTier = priceTiers.find(tier => days >= tier.minDays)
    
    if (!applicableTier) {
      // If no tier matches, use the tier with the lowest minDays
      const lowestTier = priceTiers[priceTiers.length - 1]
      const totalPrice = days * lowestTier.pricePerDay
      
      return NextResponse.json({
        success: true,
        calculation: {
          days,
          pricePerDay: lowestTier.pricePerDay,
          totalPrice,
          tier: {
            minDays: lowestTier.minDays,
            pricePerDay: lowestTier.pricePerDay
          },
          note: `Using minimum tier (${lowestTier.minDays}+ days)`
        }
      })
    }

    const totalPrice = days * applicableTier.pricePerDay

    return NextResponse.json({
      success: true,
      calculation: {
        days,
        pricePerDay: applicableTier.pricePerDay,
        totalPrice,
        tier: {
          minDays: applicableTier.minDays,
          pricePerDay: applicableTier.pricePerDay
        },
        note: `${days} days qualifies for ${applicableTier.minDays}+ day tier`
      }
    })

  } catch (error) {
    console.error('Error calculating rental price:', error)
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

// POST - Calculate rental price with request body
export async function POST(
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

    const body = await request.json()
    const validatedData = calculatePriceSchema.parse(body)
    const days = validatedData.days

    // Get all price tiers for this product, ordered by minDays descending
    const priceTiers = await prisma.rentalPriceTier.findMany({
      where: { productId },
      orderBy: { minDays: 'desc' }
    })

    if (priceTiers.length === 0) {
      return NextResponse.json(
        { error: 'No rental price tiers found for this product' },
        { status: 404 }
      )
    }

    // Find the appropriate price tier
    const applicableTier = priceTiers.find(tier => days >= tier.minDays)
    
    if (!applicableTier) {
      const lowestTier = priceTiers[priceTiers.length - 1]
      const totalPrice = days * lowestTier.pricePerDay
      
      return NextResponse.json({
        success: true,
        calculation: {
          days,
          pricePerDay: lowestTier.pricePerDay,
          totalPrice,
          tier: {
            minDays: lowestTier.minDays,
            pricePerDay: lowestTier.pricePerDay
          },
          note: `Using minimum tier (${lowestTier.minDays}+ days)`
        }
      })
    }

    const totalPrice = days * applicableTier.pricePerDay

    return NextResponse.json({
      success: true,
      calculation: {
        days,
        pricePerDay: applicableTier.pricePerDay,
        totalPrice,
        tier: {
          minDays: applicableTier.minDays,
          pricePerDay: applicableTier.pricePerDay
        },
        note: `${days} days qualifies for ${applicableTier.minDays}+ day tier`
      }
    })

  } catch (error) {
    console.error('Error calculating rental price:', error)
    
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
