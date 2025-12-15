import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Fetch user's products for admin
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const resolvedParams = await params
    const userId = resolvedParams.id

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'მომხმარებელი ვერ მოიძებნა'
      }, { status: 404 })
    }

    // Fetch user's products
    const products = await prisma.product.findMany({
      where: {
        userId: userId
      },
      include: {
        images: true,
        category: true,
        purpose: true,
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
      products
    })

  } catch (error) {
    console.error('Error fetching user products:', error)
    return NextResponse.json(
      { success: false, error: 'Error fetching user products' },
      { status: 500 }
    )
  }
}
