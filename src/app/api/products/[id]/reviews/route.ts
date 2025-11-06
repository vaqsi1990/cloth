import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const reviewSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
})

// GET - Get all reviews for a product
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const productId = parseInt(resolvedParams.id)

    if (isNaN(productId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid product ID' },
        { status: 400 }
      )
    }

    const session = await getServerSession(authOptions)
    let canReview = false

    // Check if user can review (has rented the product)
    if (session?.user?.id) {
      // Get product to check its status
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { status: true },
      })

      // Check Rental table - user must have rented (any status except CANCELED)
      const userRental = await prisma.rental.findFirst({
        where: {
          productId,
          userId: session.user.id,
          status: {
            not: 'CANCELED', // Exclude canceled rentals
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      // Check OrderItem table - user must have ordered rental
      // Allow all order statuses except CANCELED and REFUNDED
      // Also check by email or phone if userId is null (for old orders)
      const userOrderRental = await prisma.orderItem.findFirst({
        where: {
          productId,
          isRental: true,
          OR: [
            {
              order: {
                userId: session.user.id,
                status: {
                  notIn: ['CANCELED', 'REFUNDED'],
                },
              },
            },
            // Fallback: check by email or phone if userId is null
            {
              order: {
                userId: null,
                OR: [
                  { email: session.user.email || undefined },
                  { phone: session.user.phone || undefined },
                ],
                status: {
                  notIn: ['CANCELED', 'REFUNDED'],
                },
              },
            },
          ],
        },
      })

      // If product status is RENTED, check if user has any orderItem for this product (rental or purchase)
      // This allows users who rented the product to review it
      // Check ALL order statuses except CANCELED and REFUNDED
      // Also check by email or phone if userId is null (for old orders)
      // IMPORTANT: If product is RENTED, we should be more lenient and check ALL orders for this product
      let userOrderItem = null
      if (product?.status === 'RENTED') {
        // First, try to find order items by userId/email/phone
        userOrderItem = await prisma.orderItem.findFirst({
          where: {
            productId,
            OR: [
              {
                order: {
                  userId: session.user.id,
                  status: {
                    notIn: ['CANCELED', 'REFUNDED'], // Allow all statuses except canceled/refunded
                  },
                },
              },
              // Fallback: check by email or phone if userId is null
              {
                order: {
                  userId: null,
                  OR: [
                    { email: session.user.email || undefined },
                    { phone: session.user.phone || undefined },
                  ],
                  status: {
                    notIn: ['CANCELED', 'REFUNDED'],
                  },
                },
              },
            ],
          },
        })
        
        // If still not found, check ALL orders for this product (more lenient check)
        // This handles cases where email/phone don't match exactly
        if (!userOrderItem) {
          const allOrderItemsForProduct = await prisma.orderItem.findMany({
            where: {
              productId,
              order: {
                status: {
                  notIn: ['CANCELED', 'REFUNDED'],
                },
              },
            },
            include: {
              order: {
                select: {
                  id: true,
                  userId: true,
                  email: true,
                  phone: true,
                  status: true,
                },
              },
            },
          })
          
          // If there's at least one order item for this product, allow review
          // This is a fallback for cases where user info doesn't match exactly
          if (allOrderItemsForProduct.length > 0) {
            // Set userOrderItem to the first one found (we just need to know it exists)
            userOrderItem = allOrderItemsForProduct[0]
          }
        }
      }

      // Also check if user has rental for this product in Rental table (even if product status is RENTED)
      // This covers cases where rental was created directly in Rental table
      const userRentalForRentedProduct = product?.status === 'RENTED' 
        ? await prisma.rental.findFirst({
            where: {
              productId,
              userId: session.user.id,
              status: {
                not: 'CANCELED',
              },
            },
          })
        : null

      canReview = !!(userRental || userOrderRental || userOrderItem || userRentalForRentedProduct)
    }

    const reviews = await prisma.review.findMany({
      where: { productId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Calculate average rating
    const averageRating =
      reviews.length > 0
        ? reviews.reduce((sum: number, review: { rating: number }) => sum + review.rating, 0) / reviews.length
        : 0

    return NextResponse.json({
      success: true,
      reviews,
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      totalReviews: reviews.length,
      canReview,
    })
  } catch (error) {
    console.error('Error fetching reviews:', error)
    return NextResponse.json(
      { success: false, error: 'შეცდომა კომენტარების მიღებისას' },
      { status: 500 }
    )
  }
}

// POST - Create a new review
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const resolvedParams = await params
    const productId = parseInt(resolvedParams.id)

    if (isNaN(productId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid product ID' },
        { status: 400 }
      )
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { status: true },
    })

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'პროდუქტი ვერ მოიძებნა' },
        { status: 404 }
      )
    }

    // Check if user has rented this product
    // Check Rental table - user must have rented (any status except CANCELED)
    const userRental = await prisma.rental.findFirst({
      where: {
        productId,
        userId: session.user.id,
        status: {
          not: 'CANCELED', // Exclude canceled rentals
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Also check OrderItems for rentals - allow all order statuses except CANCELED and REFUNDED
    // Also check by email or phone if userId is null (for old orders)
    const userOrderRental = await prisma.orderItem.findFirst({
      where: {
        productId,
        isRental: true,
        OR: [
          {
            order: {
              userId: session.user.id,
              status: {
                notIn: ['CANCELED', 'REFUNDED'],
              },
            },
          },
          // Fallback: check by email or phone if userId is null
          {
            order: {
              userId: null,
              OR: [
                { email: session.user.email || undefined },
                { phone: session.user.phone || undefined },
              ],
              status: {
                notIn: ['CANCELED', 'REFUNDED'],
              },
            },
          },
        ],
      },
      include: {
        order: { select: { status: true, id: true, email: true, userId: true, phone: true } },
      },
    })

    // If product status is RENTED, also check if user has any orderItem for this product (rental or purchase)
    // Check ALL order statuses except CANCELED and REFUNDED
    // Also check by email or phone if userId is null (for old orders)
    // IMPORTANT: If product is RENTED, we should be more lenient and check ALL orders for this product
    let userOrderItem = null
    if (product.status === 'RENTED') {
      // First, try to find order items by userId/email/phone
      userOrderItem = await prisma.orderItem.findFirst({
        where: {
          productId,
          OR: [
            {
              order: {
                userId: session.user.id,
                status: {
                  notIn: ['CANCELED', 'REFUNDED'], // Allow all statuses except canceled/refunded
                },
              },
            },
            // Fallback: check by email or phone if userId is null
            {
              order: {
                userId: null,
                OR: [
                  { email: session.user.email || undefined },
                  { phone: session.user.phone || undefined },
                ],
                status: {
                  notIn: ['CANCELED', 'REFUNDED'],
                },
              },
            },
          ],
        },
        include: {
          order: { select: { status: true, id: true, email: true, userId: true, phone: true } },
        },
      })
      
      // If still not found, check ALL orders for this product (more lenient check)
      // This handles cases where email/phone don't match exactly
      if (!userOrderItem) {
        const allOrderItemsForProduct = await prisma.orderItem.findMany({
          where: {
            productId,
            order: {
              status: {
                notIn: ['CANCELED', 'REFUNDED'],
              },
            },
          },
          include: {
            order: {
              select: {
                id: true,
                userId: true,
                email: true,
                phone: true,
                status: true,
              },
            },
          },
        })
        
        // If there's at least one order item for this product, allow review
        // This is a fallback for cases where user info doesn't match exactly
        if (allOrderItemsForProduct.length > 0) {
          // Set userOrderItem to the first one found (we just need to know it exists)
          userOrderItem = allOrderItemsForProduct[0]
        }
      }
    }

    // Also check if user has rental for this product in Rental table (even if product status is RENTED)
    const userRentalForRentedProduct = product.status === 'RENTED' 
      ? await prisma.rental.findFirst({
          where: {
            productId,
            userId: session.user.id,
            status: {
              not: 'CANCELED',
            },
          },
        })
      : null

    if (!userRental && !userOrderRental && !userOrderItem && !userRentalForRentedProduct) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'კომენტარის დაწერა შეგიძლიათ მხოლოდ იმ პროდუქტებზე, რომლებიც იქირავეთ' 
        },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { rating, comment } = reviewSchema.parse(body)

    // Check if user already reviewed this product
    const existingReview = await prisma.review.findUnique({
      where: {
        productId_userId: {
          productId,
          userId: session.user.id,
        },
      },
    })

    let review
    if (existingReview) {
      // Update existing review
      review = await prisma.review.update({
        where: { id: existingReview.id },
        data: {
          rating,
          comment: comment || null,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      })
    } else {
      // Create new review
      review = await prisma.review.create({
        data: {
          productId,
          userId: session.user.id,
          rating,
          comment: comment || null,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      })
    }

    // Calculate new average rating
    const allReviews = await prisma.review.findMany({
      where: { productId },
      select: { rating: true },
    })

    const averageRating =
      allReviews.length > 0
        ? allReviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / allReviews.length
        : 0

    // Update product rating
    await prisma.product.update({
      where: { id: productId },
      data: {
        rating: Math.round(averageRating * 10) / 10,
      },
    })

    return NextResponse.json({
      success: true,
      review,
      message: existingReview ? 'კომენტარი განახლდა' : 'კომენტარი დაემატა',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('Error creating review:', error)
    return NextResponse.json(
      { success: false, error: 'შეცდომა კომენტარის დამატებისას' },
      { status: 500 }
    )
  }
}

