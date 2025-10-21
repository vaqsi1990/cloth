import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rentalId = parseInt(params.id)
    
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
            category: true
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
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rentalId = parseInt(params.id)
    
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
    const validStatuses = ['RESERVED', 'ACTIVE', 'RETURNED', 'LATE', 'CANCELED']
    if (status && !validStatuses.includes(status)) {
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
    const updateData: any = {}
    if (status) updateData.status = status
    if (startDate) updateData.startDate = new Date(startDate)
    if (endDate) updateData.endDate = new Date(endDate)

    const updatedRental = await prisma.rental.update({
      where: { id: rentalId },
      data: updateData,
      include: {
        product: {
          include: {
            images: true,
            category: true
          }
        },
        variant: true,
        transactions: true
      }
    })

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
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rentalId = parseInt(params.id)
    
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
            category: true
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
