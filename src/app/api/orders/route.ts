import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { findRentalDateConflict } from '@/lib/rental-date-conflicts'
import { canUserMakePurchases } from '@/lib/seller-eligibility'
import { MAX_CHECKOUT_ITEMS, MAX_CART_ITEM_QUANTITY, CHECKOUT_SINGLE_ITEM_MESSAGE } from '@/lib/cart-limits'

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
    quantity: z.number().min(1).max(MAX_CART_ITEM_QUANTITY),
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
    
    // Verified identity + IBAN required for purchases (except admins)
    if (session?.user?.id && !isAdmin) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          iban: true,
          verification: {
            select: {
              identityStatus: true,
              status: true,
            },
          },
        },
      })

      if (
        !canUserMakePurchases({
          role: session.user.role,
          iban: user?.iban,
          verification: user?.verification,
          sessionVerificationStatus: session.user.verificationStatus,
        })
      ) {
        if (!user?.iban) {
          return NextResponse.json(
            {
              success: false,
              message: 'გთხოვთ შეიყვანოთ ბანკის IBAN პროფილში. IBAN აუცილებელია ყიდვისთვის.',
              missingIban: true,
            },
            { status: 403 },
          )
        }

        return NextResponse.json(
          {
            success: false,
            message: 'გთხოვთ შეიყვანოთ ბანკის IBAN პროფილში, რომ შეძლოთ ყიდვა ან ქირაობა.',
            requiresVerification: true,
          },
          { status: 403 },
        )
      }
    }
    
    const body = await request.json()
    
    // Validate the request body
    const validatedData = orderSchema.parse(body)

    if (
      validatedData.items.length > MAX_CHECKOUT_ITEMS ||
      validatedData.items.some((item) => item.quantity > MAX_CART_ITEM_QUANTITY)
    ) {
      return NextResponse.json({
        success: false,
        message: CHECKOUT_SINGLE_ITEM_MESSAGE
      }, { status: 400 })
    }
    
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

    // Validate rental dates don't conflict with existing rentals (batched)
    const rentalItems = validatedData.items
      .filter((item) => item.isRental && item.rentalStartDate && item.rentalEndDate)
      .map((item) => ({
        productId: item.productId,
        productName: item.productName,
        size: item.size,
        rentalStartDate: item.rentalStartDate!,
        rentalEndDate: item.rentalEndDate!,
      }))

    const rentalConflict = await findRentalDateConflict(rentalItems)
    if (rentalConflict) {
      return NextResponse.json(
        { success: false, message: rentalConflict },
        { status: rentalConflict.includes('არასწორი') ? 400 : 409 },
      )
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
    
    // Rental holds (product RENTED, inquiry BOOKED) are applied only after successful payment.
    
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
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10) || 50, 1), 100)
    const skip = (page - 1) * limit

    const where = {
      OR: [
        { userId: session.user.id },
        {
          userId: null,
          OR: [
            { email: session.user.email || undefined },
            { phone: session.user.phone || undefined },
          ],
        },
      ],
    }

    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              product: {
                select: { status: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ])

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
      orders: filteredOrders,
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    })
    
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json({
      success: false,
      message: 'შეცდომა შეკვეთების მიღებისას'
    }, { status: 500 })
  }
}
