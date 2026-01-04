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

    console.time("db")
    const products = await prisma.product.findMany({
      where: {
        userId: session.user.id
      },
      select: {
        id: true,
        name: true,
        slug: true,
        brand: true,
        description: true,
        sku: true,
        stock: true,
        gender: true,
        color: true,
        location: true,
        sizeSystem: true,
        size: true,
        isNew: true,
        discount: true,
        discountDays: true,
        discountStartDate: true,
        rating: true,
        categoryId: true,
        purposeId: true,
        userId: true,
        isRentable: true,
        pricePerDay: true,
        maxRentalDays: true,
        status: true,
        approvalStatus: true,
        createdAt: true,
        updatedAt: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        purpose: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        images: {
          select: {
            id: true,
            url: true,
            alt: true,
            position: true
          },
          orderBy: { position: 'asc' }
        },
        variants: {
          select: {
            id: true,
            price: true
          }
        },
        rentalPriceTiers: {
          select: {
            id: true,
            minDays: true,
            pricePerDay: true
          },
          orderBy: { minDays: 'asc' }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    console.timeEnd("db")
    console.log("finish")

    // Check and clear expired discounts
    const productIds = products
      .filter(p => p.discount && p.discountDays && p.discountStartDate)
      .map(p => p.id)
    
    if (productIds.length > 0) {
      await checkAndClearExpiredDiscounts(productIds)
      // Re-fetch products to get updated data
      console.time("db")
      const updatedProducts = await prisma.product.findMany({
        where: {
          userId: session.user.id
        },
        select: {
          id: true,
          name: true,
          slug: true,
          brand: true,
          description: true,
          sku: true,
          stock: true,
          gender: true,
          color: true,
          location: true,
          sizeSystem: true,
          size: true,
          isNew: true,
          discount: true,
          discountDays: true,
          discountStartDate: true,
          rating: true,
          categoryId: true,
          purposeId: true,
          userId: true,
          isRentable: true,
          pricePerDay: true,
          maxRentalDays: true,
          status: true,
          approvalStatus: true,
          createdAt: true,
          updatedAt: true,
          category: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          },
          purpose: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          },
          images: {
            select: {
              id: true,
              url: true,
              alt: true,
              position: true
            },
            orderBy: { position: 'asc' }
          },
          variants: {
            select: {
              id: true,
              price: true
            }
          },
          rentalPriceTiers: {
            select: {
              id: true,
              minDays: true,
              pricePerDay: true
            },
            orderBy: { minDays: 'asc' }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
      console.timeEnd("db")
      console.log("finish")
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
    console.timeEnd("db")
    console.log("finish")
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
