import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
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
    rentalDays: z.number().optional(),
    deposit: z.number().optional()
  })).min(1, 'კალათა ცარიელია')
})

// POST - Create new order
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    const body = await request.json()
    
    // Validate the request body
    const validatedData = orderSchema.parse(body)
    
    console.log('Creating order with data:', validatedData)
    console.log('Session user ID:', session?.user?.id)
    
    // Validate rental dates don't conflict with existing rentals
    for (const item of validatedData.items) {
      if (item.isRental && item.rentalStartDate && item.rentalEndDate) {
        const start = new Date(item.rentalStartDate)
        const end = new Date(item.rentalEndDate)
        
        // Get variant by size
        const variant = await prisma.productVariant.findFirst({
          where: {
            productId: item.productId,
            size: item.size
          }
        })
        
        if (variant) {
          // Check existing rentals from rental table
          const existingRentals = await prisma.rental.findMany({
            where: {
              variantId: variant.id,
              status: {
                in: ['RESERVED', 'ACTIVE']
              }
            }
          })
          
          // Check existing order items with active rentals
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
                  isRental: true
                }
              }
            }
          })
          
          // Check for conflicts with maintenance buffer (1 day)
          for (const rental of existingRentals) {
            const rentalStart = new Date(rental.startDate)
            const rentalEnd = new Date(rental.endDate)
            const rentalLastBlockedDate = new Date(rentalEnd.getTime() + 24 * 60 * 60 * 1000)
            
            if (start < rentalLastBlockedDate && end >= rentalStart) {
              return NextResponse.json({
                success: false,
                message: `პროდუქტი ${item.productName} (${item.size}) არ არის ხელმისაწვდომი არჩეულ თარიღებზე`
              }, { status: 409 })
            }
          }
          
          // Check order items
          for (const order of existingOrders) {
            for (const orderItem of order.items) {
              if (orderItem.isRental && orderItem.rentalStartDate && orderItem.rentalEndDate && orderItem.size === item.size) {
                const itemStart = new Date(orderItem.rentalStartDate)
                const itemEnd = new Date(orderItem.rentalEndDate)
                const itemLastBlockedDate = new Date(itemEnd.getTime() + 24 * 60 * 60 * 1000)
                
                if (start < itemLastBlockedDate && end >= itemStart) {
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
            rentalDays: item.rentalDays || null,
            deposit: item.deposit || null
          }))
        }
      },
      include: {
        items: true
      }
    })
    
    console.log('Order created successfully:', newOrder)
    
    // Update product status to RENTED if the order contains rental items
    const hasRentalItems = newOrder.items.some(item => item.isRental)
    if (hasRentalItems) {
      const productIds = [...new Set(newOrder.items.filter(item => item.isRental && item.productId).map(item => item.productId))]
      
      console.log('Found rental items, updating product status:', productIds)
      
      for (const productId of productIds) {
        if (productId) {
          try {
            await prisma.product.update({
              where: { id: productId },
              data: { status: 'RENTED' }
            })
            console.log(`Successfully updated product ${productId} status to RENTED`)
          } catch (error) {
            console.error(`Error updating product ${productId}:`, error)
          }
        }
      }
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
    
    return NextResponse.json({
      success: false,
      message: 'შეცდომა შეკვეთის გაფორმებისას'
    }, { status: 500 })
  }
}

// GET - Fetch orders (for authenticated users)
export async function GET(request: NextRequest) {
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
    const filteredOrders = orders.map(order => ({
      ...order,
      items: order.items.filter(item => {
        // If product relationship exists and product status is AVAILABLE, exclude the item
        if (item.product && item.product.status === 'AVAILABLE') {
          return false
        }
        return true
      })
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
