import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { checkCanUserReviewProduct } from '@/lib/review-eligibility'

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
    const isAdmin = session?.user?.role === 'ADMIN'
    const isSupport = session?.user?.role === 'SUPPORT'
    const isAdminOrSupportRole = isAdmin || isSupport

    const product = await prisma.product.findUnique({
      // @ts-ignore - cacheStrategy is available with Prisma Accelerate
      cacheStrategy: {
        swr: 60, // Stale-while-revalidating for 60 seconds
        ttl: 60, // Cache results for 60 seconds
      },
      where: { id: productId },
      select: { status: true, userId: true, approvalStatus: true },
    })

    const requesterId = session?.user?.id
    const isOwner = requesterId && product?.userId === requesterId

    if (!product || (!isAdminOrSupportRole && !isOwner && product.approvalStatus !== 'APPROVED')) {
      return NextResponse.json(
        { success: false, error: 'პროდუქტი ვერ მოიძებნა' },
        { status: 404 }
      )
    }

    let canReview = false

    if (session?.user?.id) {
      canReview = await checkCanUserReviewProduct({
        productId,
        productUserId: product.userId,
        productStatus: product.status,
        userId: session.user.id,
        userEmail: session.user.email,
        userPhone: session.user.phone,
      })
    }

    const reviews = await prisma.review.findMany({
      // @ts-ignore - cacheStrategy is available with Prisma Accelerate
      cacheStrategy: {
        swr: 60, // Stale-while-revalidating for 60 seconds
        ttl: 60, // Cache results for 60 seconds
      },
      where: { productId },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        userId: true,
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        reply: {
          select: {
            id: true,
            comment: true,
            createdAt: true,
            userId: true,
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100, // Limit to 100 most recent reviews to prevent excessive rows
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
      // @ts-ignore - cacheStrategy is available with Prisma Accelerate
      cacheStrategy: {
        swr: 60, // Stale-while-revalidating for 60 seconds
        ttl: 60, // Cache results for 60 seconds
      },
      where: { id: productId },
      select: { status: true, userId: true },
    })

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'პროდუქტი ვერ მოიძებნა' },
        { status: 404 }
      )
    }

    const canReview = await checkCanUserReviewProduct({
      productId,
      productUserId: product.userId,
      productStatus: product.status,
      userId: session.user.id,
      userEmail: session.user.email,
      userPhone: session.user.phone,
    })

    if (!canReview) {
      return NextResponse.json(
        {
          success: false,
          error: 'კომენტარის დაწერა შეგიძლიათ მხოლოდ იმ პროდუქტებზე, რომლებიც იქირავეთ',
        },
        { status: 403 },
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
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          userId: true,
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
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          userId: true,
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

// PUT/PATCH - Update a review
export async function PUT(
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

    const body = await request.json()
    const { reviewId, rating, comment } = body

    if (!reviewId) {
      return NextResponse.json(
        { success: false, error: 'Review ID is required' },
        { status: 400 }
      )
    }

    // Check if review exists and belongs to user
    const existingReview = await prisma.review.findUnique({
      where: { id: reviewId },
    })

    if (!existingReview) {
      return NextResponse.json(
        { success: false, error: 'კომენტარი ვერ მოიძებნა' },
        { status: 404 }
      )
    }

    if (existingReview.userId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      )
    }

    if (existingReview.productId !== productId) {
      return NextResponse.json(
        { success: false, error: 'Invalid product ID' },
        { status: 400 }
      )
    }

    // Validate rating
    const validatedData = reviewSchema.parse({ rating, comment })

    // Update review
    const updatedReview = await prisma.review.update({
      where: { id: reviewId },
      data: {
        rating: validatedData.rating,
        comment: validatedData.comment || null,
      },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        userId: true,
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    })

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
      review: updatedReview,
      message: 'კომენტარი განახლდა',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('Error updating review:', error)
    return NextResponse.json(
      { success: false, error: 'შეცდომა კომენტარის განახლებისას' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a review
export async function DELETE(
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

    const { searchParams } = new URL(request.url)
    const reviewId = searchParams.get('reviewId')

    if (!reviewId) {
      return NextResponse.json(
        { success: false, error: 'Review ID is required' },
        { status: 400 }
      )
    }

    // Check if review exists and belongs to user
    const existingReview = await prisma.review.findUnique({
      where: { id: parseInt(reviewId) },
    })

    if (!existingReview) {
      return NextResponse.json(
        { success: false, error: 'კომენტარი ვერ მოიძებნა' },
        { status: 404 }
      )
    }

    // Allow admin/support to delete any review, or user to delete their own review
    const isAdminOrSupportRole = session.user.role === 'ADMIN' || session.user.role === 'SUPPORT'
    if (!isAdminOrSupportRole && existingReview.userId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      )
    }

    if (existingReview.productId !== productId) {
      return NextResponse.json(
        { success: false, error: 'Invalid product ID' },
        { status: 400 }
      )
    }

    // Delete review
    await prisma.review.delete({
      where: { id: parseInt(reviewId) },
    })

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
      message: 'კომენტარი წარმატებით წაიშალა',
    })
  } catch (error) {
    console.error('Error deleting review:', error)
    return NextResponse.json(
      { success: false, error: 'შეცდომა კომენტარის წაშლისას' },
      { status: 500 }
    )
  }
}

