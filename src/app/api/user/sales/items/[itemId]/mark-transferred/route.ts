import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireOrderItemStatusAccess } from '@/lib/order-item-status-access'
import {
  buildOrderItemFulfillmentUpdate,
  ORDER_ITEM_RETURNED_STATUS_LABEL,
} from '@/lib/order-item-fulfillment-status'

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

    const access = await requireOrderItemStatusAccess(itemId)
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
          message: 'მარაგში არ მაქვს-ის მონიშვნის შემდეგ გაცემა ვერ მოხდება',
        },
        { status: 400 },
      )
    }

    const currentItem = await prisma.orderItem.findUnique({
      where: { id: itemId },
      select: {
        sellerCanceledItem: true,
        sellerReportedDamaged: true,
      },
    })

    if (body.transferred && currentItem?.sellerCanceledItem) {
      return NextResponse.json(
        {
          success: false,
          message: `${ORDER_ITEM_RETURNED_STATUS_LABEL}-ის შემდეგ გაცემა ვერ მოხდება`,
        },
        { status: 400 },
      )
    }

    if (body.transferred && currentItem?.sellerReportedDamaged) {
      return NextResponse.json(
        {
          success: false,
          message: 'დაზიანებული ნივთის გაცემა ვერ მოხდება',
        },
        { status: 400 },
      )
    }

    const updated = await prisma.orderItem.update({
      where: { id: itemId },
      data: buildOrderItemFulfillmentUpdate(
        body.transferred ? 'TRANSFERRED' : 'PENDING',
      ),
      select: {
        id: true,
        sellerMarkedTransferred: true,
        sellerMarkedTransferredAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: body.transferred
        ? 'ნივთი მონიშნულია როგორც გაცემული'
        : 'გაცემის მონიშვნა მოხსნილია',
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
