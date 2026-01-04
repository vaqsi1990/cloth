import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkAndClearExpiredDiscounts, processExpiredDiscount } from '@/utils/discountUtils'

// Helper function to build product query
const buildProductQuery = (userId: string, isAdmin: boolean) => {
  const whereClause: any = { 
    userId,
    // RESERVED products are hidden from everyone, including admins
    status: {
      notIn: ['RESERVED'] // Hide sold products from all users
    }
  }
  
  if (!isAdmin) {
    whereClause.user = { blocked: false }
    whereClause.approvalStatus = 'APPROVED'
    whereClause.status = {
      notIn: ['MAINTENANCE', 'DAMAGED', 'RESERVED'] // Non-admin users don't see maintenance or damaged products
    }
  }
  
  return {
    where: whereClause,
    include: {
      category: true,
      purpose: true,
      user: {
        select: {
          id: true,
          name: true,
          image: true
        }
      },
      images: {
        orderBy: { position: 'asc' as const }
      },
      variants: {
        orderBy: { price: 'asc' as const } // Order by price since size was removed
      },
      rentalPriceTiers: {
        orderBy: { minDays: 'asc' as const }
      }
    },
    orderBy: {
      createdAt: 'desc' as const
    }
  }
}

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

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        image: true,
        blocked: true
      }
    })

    const isAdmin = session?.user?.role === 'ADMIN'

    if (!user || (!isAdmin && user.blocked)) {
      return NextResponse.json({
        success: false,
        message: 'ავტორი ვერ მოიძებნა'
      }, { status: 404 })
    }

    // Fetch products
    console.time("db")
    const products = await prisma.product.findMany(
      buildProductQuery(userId, isAdmin)
    )
    console.timeEnd("db")
    console.log("finish")

    // Check and clear expired discounts if needed
    const productIds = products
      .filter(p => p.discount && p.discountDays && p.discountStartDate)
      .map(p => p.id)
    
    let finalProducts = products

    if (productIds.length > 0) {
      await checkAndClearExpiredDiscounts(productIds)
      // Re-fetch products to get updated discount data
      console.time("db")
      finalProducts = await prisma.product.findMany(
        buildProductQuery(userId, isAdmin)
      )
      console.timeEnd("db")
      console.log("finish")
    }

    // Process expired discounts and return
    return NextResponse.json({
      success: true,
      author: user,
      products: finalProducts.map(processExpiredDiscount)
    })
    
  } catch (error) {
    console.timeEnd("db")
    console.log("finish")
    console.error('Error fetching author products:', error)
    return NextResponse.json({
      success: false,
      message: 'შეცდომა ავტორის პროდუქტების მიღებისას'
    }, { status: 500 })
  }
}
