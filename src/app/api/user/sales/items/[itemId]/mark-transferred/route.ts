import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSellerOrderItemAccess } from '@/lib/seller-order-item-access'

const bodySchema = z.object({
  transferred: z.boolean(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> },
) {
  try {
    const resolvedParams = await params
    const itemId = parseInt(resolvedParams.itemId, 10)
    if (!Number.isFinite(itemId)) {
      return NextResponse.json(
        { success: false, message: 'არასწორი პროდუქტის ID' },
        { status: 400 },
      )
    }

    const access = await requireSellerOrderItemAccess(itemId)
    if (!access.ok) {
      return NextResponse.json(
        { success: false, message: access.message },
        { status: access.status },
      )
    }

    const body = bodySchema.parse(await request.json())

    if (body.transferred && access.orderItem.sellerReportedOutOfStock) {
      return NextResponse.json(
        {
          success: false,
          message: 'მარაგში არ მაქვს-ის მონიშვნის შემდეგ გადაცემა ვერ მოხდება',
        },
        { status: 400 },
      )
    }

    const updated = await prisma.orderItem.update({
      where: { id: itemId },
      data: {
        sellerMarkedTransferred: body.transferred,
        sellerMarkedTransferredAt: body.transferred ? new Date() : null,
      },
      select: {
        id: true,
        sellerMarkedTransferred: true,
        sellerMarkedTransferredAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: body.transferred
        ? 'შეკვეთა მონიშნულია როგორც გადაცემული'
        : 'გადაცემის მონიშვნა მოხსნილია',
      item: updated,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: error.issues[0]?.message ?? 'არასწორი მოთხოვნა' },
        { status: 400 },
      )
    }

    console.error('Error marking order item transferred:', error)
    return NextResponse.json(
      { success: false, message: 'შეცდომა გადაცემის მონიშვნისას' },
      { status: 500 },
    )
  }
}
