import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { removePurchasedProducts } from '@/utils/removePurchasedProducts'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Order validation schema
const orderSchema = z.object({
  customerName: z.string().min(1, 'სახელი აუცილებელია'),
  phone: z.string().min(1, 'ტელეფონი აუცილებელია'),
  email: z.string().email('არასწორი ელ. ფოსტა').optional(),
  address: z.string().min(1, 'მისამართი აუცილებელია'),
  city: z.string().min(1, 'ქალაქი აუცილებელია'),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  note: z.string().optional(),
  paymentMethod: z.string().min(1, 'გადახდის მეთოდი აუცილებელია'),
  items: z.array(z.object({
    productId: z.number(),
    productName: z.string(),
    image: z.string(),
    size: z.string(),
    price: z.number(),
    quantity: z.number().min(1),
    // Rental fields
    isRental: z.boolean().optional(),
    rentalStartDate: z.string().optional(),
    rentalEndDate: z.string().optional(),
    rentalDays: z.number().optional()
  })).min(1, 'კალათა ცარიელია')
})

// POST - Create new order
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const isAdmin = session?.user?.role === 'ADMIN'
    
    // Check if user has IBAN (required for purchases, except admins)
    if (session?.user?.id && !isAdmin) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { iban: true }
      })
      
      if (!user?.iban) {
        return NextResponse.json(
          { 
            success: false,
            message: 'გთხოვთ შეიყვანოთ ბანკის IBAN პროფილში. IBAN აუცილებელია ყიდვისთვის.',
            missingIban: true
          },
          { status: 403 }
        )
      }
    }
    
    const body = await request.json()
    
    // Validate the request body
    const validatedData = orderSchema.parse(body)
    
    // Validate products exist and are approved
    const uniqueProductIds = Array.from(new Set(validatedData.items.map(item => item.productId)))
    const products = await prisma.product.findMany({
      where: { id: { in: uniqueProductIds } },
      select: {
        id: true,
        approvalStatus: true,
        name: true
      }
    })
    const productMap = new Map(products.map(product => [product.id, product]))

    // Validate all products exist and are approved (unless admin)
    for (const item of validatedData.items) {
      const product = productMap.get(item.productId)
      if (!product) {
        return NextResponse.json({
          success: false,
          message: `პროდუქტი "${item.productName}" ვერ მოიძებნა`
        }, { status: 404 })
      }
      if (!isAdmin && product.approvalStatus !== 'APPROVED') {
        return NextResponse.json({
          success: false,
          message: `პროდუქტი "${item.productName}" ჯერ არ არის დამტკიცებული`
        }, { status: 403 })
      }
    }

    // Validate rental dates don't conflict with existing rentals
    // Helper function to check date conflicts with maintenance buffer (1 day)
    const hasDateConflict = (start: Date, end: Date, existingStart: Date, existingEnd: Date): boolean => {
      const existingLastBlockedDate = new Date(existingEnd.getTime() + 24 * 60 * 60 * 1000) // 1 day buffer
      return start < existingLastBlockedDate && end >= existingStart
    }

    for (const item of validatedData.items) {
      if (item.isRental && item.rentalStartDate && item.rentalEndDate) {
        const start = new Date(item.rentalStartDate)
        const end = new Date(item.rentalEndDate)
        
        // Validate date range
        if (start >= end) {
          return NextResponse.json({
            success: false,
            message: `არასწორი თარიღების დიაპაზონი პროდუქტისთვის ${item.productName}`
          }, { status: 400 })
        }

        // Check existing rentals from rental table (by product, not variant)
        const existingRentals = await prisma.rental.findMany({
          where: {
            productId: item.productId,
            status: {
              in: ['RESERVED', 'ACTIVE']
            }
          }
        })
        
        // Check existing order items with active rentals for this product
        const existingOrders = await prisma.order.findMany({
          where: {
            status: {
              in: ['PENDING', 'PAID', 'SHIPPED']
            },
            items: {
              some: {
                productId: item.productId,
                isRental: true,
                rentalEndDate: {
                  gte: new Date()
                }
              }
            }
          },
          include: {
            items: {
              where: {
                productId: item.productId,
                isRental: true,
                size: item.size // Match by size from order item (product size)
              }
            }
          }
        })
        
        // Check for conflicts with existing rentals
        for (const rental of existingRentals) {
          if (hasDateConflict(start, end, rental.startDate, rental.endDate)) {
            return NextResponse.json({
              success: false,
              message: `პროდუქტი ${item.productName} (${item.size}) არ არის ხელმისაწვდომი არჩეულ თარიღებზე`
            }, { status: 409 })
          }
        }
        
        // Check order items for conflicts
        for (const order of existingOrders) {
          for (const orderItem of order.items) {
            if (orderItem.isRental && orderItem.rentalStartDate && orderItem.rentalEndDate) {
              if (hasDateConflict(start, end, orderItem.rentalStartDate, orderItem.rentalEndDate)) {
                return NextResponse.json({
                  success: false,
                  message: `პროდუქტი ${item.productName} (${item.size}) არ არის ხელმისაწვდომი არჩეულ თარიღებზე`
                }, { status: 409 })
              }
            }
          }
        }
      }
    }
    
    // Calculate total
    const total = validatedData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    
    // Create order in database
    const newOrder = await prisma.order.create({
      data: {
        customerName: validatedData.customerName,
        phone: validatedData.phone,
        email: validatedData.email,
        address: validatedData.address,
        city: validatedData.city,
        postalCode: validatedData.postalCode,
        country: validatedData.country,
        note: validatedData.note,
        paymentMethod: validatedData.paymentMethod,
        total: total,
        status: 'PENDING',
        userId: session?.user?.id || null, // Set userId if user is logged in
        // Create order items
        items: {
          create: validatedData.items.map(item => ({
            productId: item.productId,
            productName: item.productName,
            image: item.image,
            size: item.size,
            price: item.price,
            quantity: item.quantity,
            // Include rental fields
            isRental: item.isRental || false,
            rentalStartDate: item.rentalStartDate ? new Date(item.rentalStartDate) : null,
            rentalEndDate: item.rentalEndDate ? new Date(item.rentalEndDate) : null,
            rentalDays: item.rentalDays || null
          }))
        }
      },
      include: {
        items: true
      }
    })
    
    
    // Update product status and handle sold products
    const rentalProductIds = [...new Set(
      newOrder.items
        .filter(item => item.isRental && item.productId)
        .map(item => item.productId as number)
    )]
    
    const soldProductIds = newOrder.items
      .filter(item => !item.isRental && typeof item.productId === 'number')
      .map(item => item.productId as number)

    // Update product status to RENTED for rental items
    if (rentalProductIds.length > 0) {
      await Promise.all(
        rentalProductIds.map(productId =>
          prisma.product.update({
            where: { id: productId },
            data: { status: 'RENTED' }
          }).catch(error => {
            console.error(`Error updating product ${productId} status:`, error)
            return null
          })
        )
      )
    }

    // Remove sold products from inventory
    if (soldProductIds.length > 0) {
      await removePurchasedProducts(soldProductIds, { orderId: newOrder.id })
    }
    
    return NextResponse.json({
      success: true,
      message: 'შეკვეთა წარმატებით გაფორმდა',
      order: {
        id: newOrder.id,
        total: newOrder.total,
        status: newOrder.status,
        customerName: newOrder.customerName,
        phone: newOrder.phone,
        items: newOrder.items
      }
    })
    
  } catch (error) {
    console.error('Error creating order:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: 'ვალიდაციის შეცდომა',
        errors: error.issues
      }, { status: 400 })
    }
    
    // Provide more detailed error information in development
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json({
      success: false,
      message: 'შეცდომა შეკვეთის გაფორმებისას',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    }, { status: 500 })
  }
}

// GET - Fetch orders (for authenticated users)
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Fetch orders by userId OR by email/phone if userId is null (for old orders)
    const orders = await prisma.order.findMany({
      where: {
        OR: [
          {
            userId: session.user.id
          },
          // Fallback: check by email or phone if userId is null
          {
            userId: null,
            OR: [
              { email: session.user.email || undefined },
              { phone: session.user.phone || undefined },
            ],
          },
        ],
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                status: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Filter items to exclude those with AVAILABLE product status
    // (Items with AVAILABLE status were likely re-added to inventory after being sold)
    const filteredOrders = orders.map(order => ({
      ...order,
      items: order.items.filter(item => 
        !item.product || item.product.status !== 'AVAILABLE'
      )
    }))

    return NextResponse.json({
      success: true,
      orders: filteredOrders
    })
    
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json({
      success: false,
      message: 'შეცდომა შეკვეთების მიღებისას'
    }, { status: 500 })
  }
}
