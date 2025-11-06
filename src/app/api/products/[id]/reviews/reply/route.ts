import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const replySchema = z.object({
  reviewId: z.number(),
  comment: z.string().min(1, 'კომენტარი აუცილებელია'),
})

// POST - Admin reply to a review
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

    // Check if user is admin
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Permission denied. Admin access required.' },
        { status: 403 }
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
    const { reviewId, comment } = replySchema.parse(body)

    // Check if review exists and belongs to this product
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    })

    if (!review) {
      return NextResponse.json(
        { success: false, error: 'კომენტარი ვერ მოიძებნა' },
        { status: 404 }
      )
    }

    if (review.productId !== productId) {
      return NextResponse.json(
        { success: false, error: 'Invalid product ID' },
        { status: 400 }
      )
    }

    // Check if reply already exists
    const existingReply = await prisma.reviewReply.findUnique({
      where: { reviewId },
    })

    let reply
    if (existingReply) {
      // Update existing reply
      reply = await prisma.reviewReply.update({
        where: { id: existingReply.id },
        data: {
          comment,
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
      // Create new reply
      reply = await prisma.reviewReply.create({
        data: {
          reviewId,
          userId: session.user.id,
          comment,
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

    return NextResponse.json({
      success: true,
      reply,
      message: existingReply ? 'პასუხი განახლდა' : 'პასუხი დაემატა',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('Error creating/updating reply:', error)
    return NextResponse.json(
      { success: false, error: 'შეცდომა პასუხის დამატებისას' },
      { status: 500 }
    )
  }
}

// DELETE - Delete admin reply
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

    // Check if user is admin
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Permission denied. Admin access required.' },
        { status: 403 }
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

    // Check if reply exists
    const reply = await prisma.reviewReply.findUnique({
      where: { reviewId: parseInt(reviewId) },
      include: {
        review: {
          select: {
            productId: true,
          },
        },
      },
    })

    if (!reply) {
      return NextResponse.json(
        { success: false, error: 'პასუხი ვერ მოიძებნა' },
        { status: 404 }
      )
    }

    if (reply.review.productId !== productId) {
      return NextResponse.json(
        { success: false, error: 'Invalid product ID' },
        { status: 400 }
      )
    }

    // Delete reply
    await prisma.reviewReply.delete({
      where: { id: reply.id },
    })

    return NextResponse.json({
      success: true,
      message: 'პასუხი წარმატებით წაიშალა',
    })
  } catch (error) {
    console.error('Error deleting reply:', error)
    return NextResponse.json(
      { success: false, error: 'შეცდომა პასუხის წაშლისას' },
      { status: 500 }
    )
  }
}

