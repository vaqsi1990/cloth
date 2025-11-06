import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

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
        sku: sku,
        userId: session.user.id // Only user's own products
      },
      include: {
        category: true,
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
        message: 'პროდუქტი ამ SKU-ით ვერ მოიძებნა ან არ გაქვთ წვდომა'
      }, { status: 404 })
    }

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
        deposit: item.deposit,
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
        ...product,
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString()
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

