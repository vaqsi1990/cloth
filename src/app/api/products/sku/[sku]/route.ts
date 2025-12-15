import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkAndClearExpiredDiscount, processExpiredDiscount } from '@/utils/discountUtils'

// GET - Fetch product by SKU with detailed rental information
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sku: string }> }
) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Access denied. Admin only.' },
        { status: 403 }
      )
    }

    const resolvedParams = await params
    const sku = decodeURIComponent(resolvedParams.sku)
    
    // Find product by SKU
    const product = await prisma.product.findUnique({
      where: { sku: sku },
      include: {
        category: true,
        purpose: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        images: {
          orderBy: { position: 'asc' }
        },
        variants: true,
        rentalPriceTiers: {
          orderBy: { minDays: 'asc' }
        }
      }
    })

    if (!product) {
      return NextResponse.json({
        success: false,
        message: 'პროდუქტი ამ SKU-ით ვერ მოიძებნა'
      }, { status: 404 })
    }

    // Check and clear expired discount if needed
    await checkAndClearExpiredDiscount(product.id)
    
    // Re-fetch product to get updated data
    const updatedProduct = await prisma.product.findUnique({
      where: { sku: sku },
      include: {
        category: true,
        purpose: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        images: {
          orderBy: { position: 'asc' }
        },
        variants: true,
        rentalPriceTiers: {
          orderBy: { minDays: 'asc' }
        }
      }
    })

    if (!updatedProduct) {
      return NextResponse.json({
        success: false,
        message: 'პროდუქტი ამ SKU-ით ვერ მოიძებნა'
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
            id: true,
            size: true
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

    // Calculate rental duration for each rental
    const rentalsWithDuration = rentals.map(rental => {
      const start = new Date(rental.startDate)
      const end = new Date(rental.endDate)
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      
      return {
        ...rental,
        durationDays: days,
        startDate: rental.startDate.toISOString(),
        endDate: rental.endDate.toISOString(),
        createdAt: rental.createdAt.toISOString(),
        updatedAt: rental.updatedAt.toISOString()
      }
    })

    // Process rental orders
    const rentalOrdersWithDuration = rentalOrders.map(item => {
      if (!item.rentalStartDate || !item.rentalEndDate) return null
      
      const start = new Date(item.rentalStartDate)
      const end = new Date(item.rentalEndDate)
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      
      return {
        id: item.id,
        orderId: item.orderId,
        orderStatus: item.order.status,
        customerName: item.order.customerName,
        customerPhone: item.order.phone,
        customerEmail: item.order.email,
        user: item.order.user,
        size: item.size,
        startDate: item.rentalStartDate.toISOString(),
        endDate: item.rentalEndDate.toISOString(),
        durationDays: days,
        price: item.price,
        orderCreatedAt: item.order.createdAt.toISOString()
      }
    }).filter(Boolean)

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

