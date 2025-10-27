import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET - Fetch all products by author/user ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const resolvedParams = await params
    const userId = resolvedParams.id
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        message: 'ავტორის ID აუცილებელია'
      }, { status: 400 })
    }

    // First get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        image: true
      }
    })

    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'ავტორი ვერ მოიძებნა'
      }, { status: 404 })
    }

    // Only show AVAILABLE products to non-admin users
    const isAdmin = session?.user?.role === 'ADMIN'

    const products = await prisma.product.findMany({
      where: { 
        userId: userId,
        ...(isAdmin ? {} : { status: 'AVAILABLE' })
      },
      include: {
        category: true,
        user: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },
        images: {
          orderBy: { position: 'asc' }
        },
        variants: {
          orderBy: { size: 'asc' }
        },
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
      author: user,
      products: products
    })
    
  } catch (error) {
    console.error('Error fetching author products:', error)
    return NextResponse.json({
      success: false,
      message: 'შეცდომა ავტორის პროდუქტების მიღებისას'
    }, { status: 500 })
  }
}
