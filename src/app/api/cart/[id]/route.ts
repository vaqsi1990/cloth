import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// PUT - Update cart item quantity
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        message: 'Authentication required'
      }, { status: 401 })
    }

    const resolvedParams = await params
    const itemId = parseInt(resolvedParams.id)

    if (isNaN(itemId)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid item ID'
      }, { status: 400 })
    }

    const body = await request.json()
    const quantitySchema = z.object({
      quantity: z.number().min(1)
    })
    const validatedData = quantitySchema.parse(body)

    // Check if item belongs to user's cart
    const cartItem = await prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cart: {
          userId: session.user.id
        }
      }
    })

    if (!cartItem) {
      return NextResponse.json({
        success: false,
        message: 'Item not found in cart'
      }, { status: 404 })
    }

    // Update quantity
    await prisma.cartItem.update({
      where: { id: itemId },
      data: {
        quantity: validatedData.quantity
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Item quantity updated'
    })

  } catch (error) {
    console.error('Error updating cart item:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: 'Invalid data',
        errors: error.issues
      }, { status: 400 })
    }
    return NextResponse.json({
      success: false,
      message: 'Error updating cart item'
    }, { status: 500 })
  }
}

// DELETE - Remove item from cart
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        message: 'Authentication required'
      }, { status: 401 })
    }

    const resolvedParams = await params
    const itemId = parseInt(resolvedParams.id)

    if (isNaN(itemId)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid item ID'
      }, { status: 400 })
    }

    // Check if item belongs to user's cart
    const cartItem = await prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cart: {
          userId: session.user.id
        }
      }
    })

    if (!cartItem) {
      return NextResponse.json({
        success: false,
        message: 'Item not found in cart'
      }, { status: 404 })
    }

    // Remove item
    await prisma.cartItem.delete({
      where: { id: itemId }
    })

    return NextResponse.json({
      success: true,
      message: 'Item removed from cart'
    })

  } catch (error) {
    console.error('Error removing cart item:', error)
    return NextResponse.json({
      success: false,
      message: 'Error removing cart item'
    }, { status: 500 })
  }
}
