import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkAndClearExpiredDiscount, processExpiredDiscount } from '@/utils/discountUtils'

// Helper function to build product select query
const buildProductSelect = () => ({
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
  rejectionReason: true,
  approvedAt: true,
  createdAt: true,
  updatedAt: true,
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
    }
  },
  purpose: {
    select: {
      id: true,
      name: true,
      slug: true,
    }
  },
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true
    }
  },
  images: {
    select: {
      id: true,
      url: true,
      alt: true,
      position: true,
    },
    orderBy: { position: 'asc' as const }
  },
  variants: {
    select: {
      id: true,
      price: true,
    },
    orderBy: { price: 'asc' as const } // Order variants by price
  },
  rentalPriceTiers: {
    select: {
      id: true,
      minDays: true,
      pricePerDay: true,
    },
    orderBy: { minDays: 'asc' as const }
  }
})

// Helper function to calculate days between two dates
const calculateDays = (startDate: Date, endDate: Date): number => {
  return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
}

// GET - Fetch user's own product by SKU with detailed rental information
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sku: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    const resolvedParams = await params
    const sku = decodeURIComponent(resolvedParams.sku)
    
    // Find product by SKU - only if it belongs to the current user
    const product = await prisma.product.findFirst({
      where: {
        sku,
        userId: session.user.id // Only user's own products
      },
      select: buildProductSelect()
    })

    if (!product) {
      return NextResponse.json({
        success: false,
        message: 'პროდუქტი ამ SKU-ით ვერ მოიძებნა ან არ გაქვთ წვდომა'
      }, { status: 404 })
    }

    // Check and clear expired discount if needed
    await checkAndClearExpiredDiscount(product.id)
    
    // Re-fetch product to get updated discount data
    const updatedProduct = await prisma.product.findFirst({
      where: {
        sku,
        userId: session.user.id
      },
      select: buildProductSelect()
    })

    if (!updatedProduct) {
      return NextResponse.json({
        success: false,
        message: 'პროდუქტი ამ SKU-ით ვერ მოიძებნა ან არ გაქვთ წვდომა'
      }, { status: 404 })
    }

    const processedProduct = processExpiredDiscount(updatedProduct)

    // Get all rentals for this product (active and past)
    const rentals = await prisma.rental.findMany({
      where: { productId: product.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        variant: {
          select: {
            id: true
          }
        },
        transactions: {
          select: {
            id: true,
            total: true,
            createdAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Get rental orders (from OrderItem)
    const rentalOrders = await prisma.orderItem.findMany({
      where: {
        productId: product.id,
        isRental: true
      },
      include: {
        order: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true
              }
            }
          }
        }
      },
      orderBy: { order: { createdAt: 'desc' } }
    })

    // Calculate rental duration and format dates for each rental
    const rentalsWithDuration = rentals.map(rental => {
      const durationDays = calculateDays(rental.startDate, rental.endDate)
      
      return {
        ...rental,
        durationDays,
        startDate: rental.startDate.toISOString(),
        endDate: rental.endDate.toISOString(),
        createdAt: rental.createdAt.toISOString(),
        updatedAt: rental.updatedAt.toISOString()
      }
    })

    // Process rental orders from OrderItems
    const rentalOrdersWithDuration = rentalOrders
      .filter(item => item.rentalStartDate && item.rentalEndDate)
      .map(item => {
        const durationDays = calculateDays(item.rentalStartDate!, item.rentalEndDate!)
        
        return {
          id: item.id,
          orderId: item.orderId,
          orderStatus: item.order.status,
          customerName: item.order.customerName,
          customerPhone: item.order.phone,
          customerEmail: item.order.email,
          user: item.order.user,
          size: item.size, // Size is stored on OrderItem, not variant
          startDate: item.rentalStartDate!.toISOString(),
          endDate: item.rentalEndDate!.toISOString(),
          durationDays,
          price: item.price,
          orderCreatedAt: item.order.createdAt.toISOString()
        }
      })

    // Get active rentals (status ACTIVE or RESERVED, and endDate in future)
    const now = new Date()
    const activeRentals = rentalsWithDuration.filter(r => {
      const endDate = new Date(r.endDate)
      return (r.status === 'ACTIVE' || r.status === 'RESERVED') && endDate >= now
    })

    return NextResponse.json({
      success: true,
      product: {
        ...processedProduct,
        createdAt: processedProduct.createdAt.toISOString(),
        updatedAt: processedProduct.updatedAt.toISOString()
      },
      rentals: {
        all: rentalsWithDuration,
        active: activeRentals,
        total: rentalsWithDuration.length,
        activeCount: activeRentals.length
      },
      rentalOrders: rentalOrdersWithDuration
    })
    
  } catch (error) {
    console.error('Error fetching product by SKU:', error)
    return NextResponse.json({
      success: false,
      message: 'შეცდომა პროდუქტის მიღებისას'
    }, { status: 500 })
  }
}

