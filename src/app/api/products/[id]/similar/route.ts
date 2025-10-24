import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Fetch similar products by category
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
      where: { id: productId },
      select: { 
        categoryId: true,
        gender: true,
        id: true
      }
    })

    if (!currentProduct) {
      return NextResponse.json({
        success: false,
        message: 'პროდუქტი ვერ მოიძებნა'
      }, { status: 404 })
    }

    // Fetch similar products from the same category, excluding current product
    const similarProducts = await prisma.product.findMany({
      where: {
        categoryId: currentProduct.categoryId,
        id: { not: productId }, // Exclude current product
        gender: currentProduct.gender // Same gender
      },
      include: {
        category: true,
        images: {
          orderBy: { position: 'asc' },
          take: 1 // Only get first image for thumbnails
        },
        variants: {
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
