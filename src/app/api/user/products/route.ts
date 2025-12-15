import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkAndClearExpiredDiscounts, processExpiredDiscount } from '@/utils/discountUtils'

// GET - Fetch user's products
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const products = await prisma.product.findMany({
      where: {
        userId: session.user.id
      },
      include: {
        images: true,
        category: true,
        purpose: true,
        variants: true,
        rentalPriceTiers: {
          orderBy: { minDays: 'asc' }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Check and clear expired discounts
    const productIds = products
      .filter(p => p.discount && p.discountDays && p.discountStartDate)
      .map(p => p.id)
    
    if (productIds.length > 0) {
      await checkAndClearExpiredDiscounts(productIds)
      // Re-fetch products to get updated data
      const updatedProducts = await prisma.product.findMany({
        where: {
          userId: session.user.id
        },
        include: {
          images: true,
          category: true,
          purpose: true,
          variants: true,
          rentalPriceTiers: {
            orderBy: { minDays: 'asc' }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
      return NextResponse.json({
        success: true,
        products: updatedProducts.map(processExpiredDiscount)
      })
    }

    return NextResponse.json({
      success: true,
      products: products.map(processExpiredDiscount)
    })

  } catch (error) {
    console.error('Error fetching user products:', error)
    return NextResponse.json(
      { success: false, error: 'Error fetching products' },
      { status: 500 }
    )
  }
}

// DELETE - Delete user's product
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('id')

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      )
    }

    const product = await prisma.product.findFirst({
      where: {
        id: parseInt(productId),
        userId: session.user.id
      }
    })

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    // Delete the product
    await prisma.product.delete({
      where: { id: parseInt(productId) }
    })

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json(
      { success: false, error: 'Error deleting product' },
      { status: 500 }
    )
  }
}
