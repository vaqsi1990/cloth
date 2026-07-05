import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireOrderItemStatusAccess } from '@/lib/order-item-status-access'
import { updateOrderItemFulfillmentStatus } from '@/lib/update-order-item-fulfillment-status'
import type { OrderItemFulfillmentStatus } from '@/lib/order-item-fulfillment-status'

const bodySchema = z.object({
  status: z.enum(['PENDING', 'TRANSFERRED', 'CANCELED']),
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

    if (!access.isStaff && !access.isSeller) {
      return NextResponse.json(
        { success: false, message: 'მხოლოდ გამყიდველს შეუძლია სტატუსის შეცვლა' },
        { status: 403 },
      )
    }

    const { status } = bodySchema.parse(await request.json())
    const result = await updateOrderItemFulfillmentStatus(
      itemId,
      status as OrderItemFulfillmentStatus,
    )

    if (!result.ok) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: result.status },
      )
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      status: result.status,
      item: result.item,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: error.issues[0]?.message ?? 'არასწორი მოთხოვნა' },
        { status: 400 },
      )
    }

    console.error('Error updating seller order item fulfillment status:', error)
    return NextResponse.json(
      { success: false, message: 'შეცდომა სტატუსის განახლებისას' },
      { status: 500 },
    )
  }
}
