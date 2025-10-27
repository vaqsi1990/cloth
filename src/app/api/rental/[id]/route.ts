import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { RentalStatus } from '@prisma/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const rentalId = parseInt(resolvedParams.id)
    
    if (isNaN(rentalId)) {
      return NextResponse.json(
        { error: 'Invalid rental ID' },
        { status: 400 }
      )
    }

    const rental = await prisma.rental.findFirst({
      where: {
        id: rentalId,
        userId: session.user.id
      },
      include: {
        product: {
          include: {
            images: true,
            category: true,
            rentalPriceTiers: {
              orderBy: { minDays: 'asc' }
            }
          }
        },
        variant: true,
        transactions: true
      }
    })

    if (!rental) {
      return NextResponse.json(
        { error: 'Rental not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ rental })

  } catch (error) {
    console.error('Rental fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const rentalId = parseInt(resolvedParams.id)
    
    if (isNaN(rentalId)) {
      return NextResponse.json(
        { error: 'Invalid rental ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { status, startDate, endDate } = body

    // Check if rental exists and belongs to user
    const existingRental = await prisma.rental.findFirst({
      where: {
        id: rentalId,
        userId: session.user.id
      }
    })

    if (!existingRental) {
      return NextResponse.json(
        { error: 'Rental not found' },
        { status: 404 }
      )
    }

    // Validate status if provided
    const validStatuses: RentalStatus[] = ['RESERVED', 'ACTIVE', 'RETURNED', 'LATE', 'CANCELED']
    if (status && !validStatuses.includes(status as RentalStatus)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }

    // Validate dates if provided
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      
      if (start >= end) {
        return NextResponse.json(
          { error: 'Start date must be before end date' },
          { status: 400 }
        )
      }
    }

    // Prepare update data
    const updateData: {
      status?: RentalStatus
      startDate?: Date
      endDate?: Date
    } = {}
    if (status) updateData.status = status as RentalStatus
    if (startDate) updateData.startDate = new Date(startDate)
    if (endDate) updateData.endDate = new Date(endDate)

    const updatedRental = await prisma.rental.update({
      where: { id: rentalId },
      data: updateData,
      include: {
        product: {
          include: {
            images: true,
            category: true,
            rentalPriceTiers: {
              orderBy: { minDays: 'asc' }
            }
          }
        },
        variant: true,
        transactions: true
      }
    })

    // If rental is returned, set product status back to AVAILABLE (but keep isRentable flag)
    if (status === 'RETURNED') {
      const product = await prisma.product.findUnique({
        where: { id: existingRental.productId }
      })
      
      if (product && product.isRentable) {
        // Set product status to AVAILABLE
        await prisma.product.update({
          where: { id: existingRental.productId },
          data: { status: 'AVAILABLE' }
        })
        console.log(`Set product ${existingRental.productId} status back to AVAILABLE`)
        
        // Delete all order items for this product
        await prisma.orderItem.deleteMany({
          where: {
            productId: existingRental.productId,
            isRental: true
          }
        })
        console.log(`Deleted order items for product ${existingRental.productId}`)
      }
    }

    return NextResponse.json({
      success: true,
      rental: updatedRental
    })

  } catch (error) {
    console.error('Rental update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const rentalId = parseInt(resolvedParams.id)
    
    if (isNaN(rentalId)) {
      return NextResponse.json(
        { error: 'Invalid rental ID' },
        { status: 400 }
      )
    }

    // Check if rental exists and belongs to user
    const existingRental = await prisma.rental.findFirst({
      where: {
        id: rentalId,
        userId: session.user.id
      }
    })

    if (!existingRental) {
      return NextResponse.json(
        { error: 'Rental not found' },
        { status: 404 }
      )
    }

    // Only allow cancellation if rental is still reserved
    if (existingRental.status !== 'RESERVED') {
      return NextResponse.json(
        { error: 'Only reserved rentals can be cancelled' },
        { status: 400 }
      )
    }

    // Update rental status to cancelled instead of deleting
    const cancelledRental = await prisma.rental.update({
      where: { id: rentalId },
      data: { status: 'CANCELED' },
      include: {
        product: {
          include: {
            images: true,
            category: true,
            rentalPriceTiers: {
              orderBy: { minDays: 'asc' }
            }
          }
        },
        variant: true,
        transactions: true
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Rental cancelled successfully',
      rental: cancelledRental
    })

  } catch (error) {
    console.error('Rental cancellation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
