import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdmin } from '@/lib/roles'
import { revalidateProductCaches } from '@/lib/product-cache-revalidation'

const transferSchema = z.object({
  sourceUserId: z.string().min(1),
  targetUserId: z.string().min(1),
  productIds: z.array(z.number().int().positive()).min(1),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !isAdmin(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'ადმინისტრატორის წვდომა საჭიროა' },
        { status: 403 },
      )
    }

    const body = await request.json()
    const parsed = transferSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'არასწორი მონაცემები' },
        { status: 400 },
      )
    }

    const { sourceUserId, targetUserId, productIds } = parsed.data

    if (sourceUserId === targetUserId) {
      return NextResponse.json(
        { success: false, error: 'წყარო და სამიზნე მომხმარებელი ერთი და იგივეა' },
        { status: 400 },
      )
    }

    const [sourceUser, targetUser] = await Promise.all([
      prisma.user.findUnique({ where: { id: sourceUserId }, select: { id: true, name: true } }),
      prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true, name: true } }),
    ])

    if (!sourceUser) {
      return NextResponse.json(
        { success: false, error: 'წყარო მომხმარებელი ვერ მოიძებნა' },
        { status: 404 },
      )
    }

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'სამიზნე მომხმარებელი ვერ მოიძებნა' },
        { status: 404 },
      )
    }

    const uniqueProductIds = [...new Set(productIds)]
    const products = await prisma.product.findMany({
      where: {
        id: { in: uniqueProductIds },
        userId: sourceUserId,
      },
      select: { id: true },
    })

    if (products.length !== uniqueProductIds.length) {
      return NextResponse.json(
        {
          success: false,
          error: 'ზოგიერთი პროდუქტი ვერ მოიძებნა ან არ ეკუთვნის წყარო მომხმარებელს',
        },
        { status: 400 },
      )
    }

    const blockingOrderItem = await prisma.orderItem.findFirst({
      where: {
        productId: { in: uniqueProductIds },
        OR: [
          { order: { status: 'PENDING' } },
          { order: { paymentHoldStatus: 'BLOCKED' } },
        ],
      },
      select: {
        productId: true,
        order: { select: { id: true, status: true, paymentHoldStatus: true } },
      },
    })

    if (blockingOrderItem) {
      return NextResponse.json(
        {
          success: false,
          error: `პროდუქტი #${blockingOrderItem.productId} აქტიურ შეკვეთაშია (#${blockingOrderItem.order.id}) და ვერ გადაიტანება`,
        },
        { status: 409 },
      )
    }

    const result = await prisma.product.updateMany({
      where: {
        id: { in: uniqueProductIds },
        userId: sourceUserId,
      },
      data: { userId: targetUserId },
    })

    for (const productId of uniqueProductIds) {
      revalidateProductCaches(productId, {
        authorId: sourceUserId,
      })
      revalidateProductCaches(productId, {
        authorId: targetUserId,
      })
    }

    return NextResponse.json({
      success: true,
      transferredCount: result.count,
      message: `${result.count} პროდუქტი წარმატებით გადაეცა ${targetUser.name || 'ახალ ავტორს'}`,
    })
  } catch (error) {
    console.error('Error transferring products:', error)
    return NextResponse.json(
      { success: false, error: 'პროდუქტების გადატანისას მოხდა შეცდომა' },
      { status: 500 },
    )
  }
}
