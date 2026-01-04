import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET - Fetch similar products by category
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const resolvedParams = await params
    const productId = parseInt(resolvedParams.id)
    
    if (isNaN(productId)) {
      return NextResponse.json({
        success: false,
        message: 'არასწორი პროდუქტის ID'
      }, { status: 400 })
    }

    // First, get the current product to find its category
    const currentProduct = await prisma.product.findUnique({
      // @ts-ignore - cacheStrategy is available with Prisma Accelerate
      cacheStrategy: {
        swr: 60, // Stale-while-revalidating for 60 seconds
        ttl: 60, // Cache results for 60 seconds
      },
      where: { id: productId },
      select: { 
        categoryId: true,
        gender: true,
        id: true,
        approvalStatus: true,
        userId: true,
        user: {
          select: {
            blocked: true
          }
        }
      }
    })

    if (!currentProduct) {
      return NextResponse.json({
        success: false,
        message: 'პროდუქტი ვერ მოიძებნა'
      }, { status: 404 })
    }

    // Only show AVAILABLE and APPROVED products to non-admin users
    const isAdmin = session?.user?.role === 'ADMIN'
    const requesterId = session?.user?.id
    const isOwner = requesterId && currentProduct.userId === requesterId

    if (
      !currentProduct ||
      (!isAdmin && currentProduct.user?.blocked) ||
      (!isAdmin && !isOwner && currentProduct.approvalStatus !== 'APPROVED')
    ) {
      return NextResponse.json({
        success: false,
        message: 'პროდუქტი ვერ მოიძებნა'
      }, { status: 404 })
    }

    // Fetch similar products from the same category, excluding current product
    const similarProducts = await prisma.product.findMany({
      // @ts-ignore - cacheStrategy is available with Prisma Accelerate
      cacheStrategy: {
        swr: 60, // Stale-while-revalidating for 60 seconds
        ttl: 60, // Cache results for 60 seconds
      },
      where: {
        categoryId: currentProduct.categoryId,
        id: { not: productId }, // Exclude current product
        gender: currentProduct.gender, // Same gender
        ...(isAdmin ? {} : { 
          status: 'AVAILABLE',
          approvalStatus: 'APPROVED',
          user: {
            blocked: false
          }
        })
      },
      select: {
        id: true,
        name: true,
        slug: true,
        discount: true,
        discountDays: true,
        stock: true,
        rating: true,
        isRentable: true,
        rentalPriceTiers: {
          select: {
            minDays: true,
            pricePerDay: true
          },
          orderBy: { minDays: 'asc' }
        },
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
          orderBy: { position: 'asc' },
          take: 1 // Only get first image for thumbnails
        },
        variants: {
          select: {
            id: true,
            price: true
          },
          take: 1 // Only get first variant for price display
        },
        user: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 8 // Limit to 8 similar products
    })

    return NextResponse.json({
      success: true,
      products: similarProducts
    })
    
  } catch (error) {
    console.error('Error fetching similar products:', error)
    return NextResponse.json({
      success: false,
      message: 'შეცდომა მსგავსი პროდუქტების მიღებისას'
    }, { status: 500 })
  }
}
