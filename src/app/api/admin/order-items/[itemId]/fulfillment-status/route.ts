import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSaleOrderItem } from '@/lib/order-item-snapshot'
import { restoreSaleItemStock } from '@/lib/order-out-of-stock'
import { REPORTABLE_SALE_ORDER_STATUSES } from '@/lib/order-out-of-stock'
import { isAdminOrSupport } from '@/lib/roles'
import type { COMPLETED_SALE_ORDER_STATUSES } from '@/lib/sold-products'
import type { OrderItemFulfillmentStatus } from '@/lib/order-item-fulfillment-status'
import { buildOrderItemFulfillmentUpdate } from '@/lib/order-item-fulfillment-status'

const bodySchema = z.object({
  status: z.enum(['PENDING', 'TRANSFERRED', 'CANCELED']),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> },
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !isAdminOrSupport(session.user.role)) {
      return NextResponse.json(
        { success: false, message: 'Admin or Support access required' },
        { status: 403 },
      )
    }

    const resolvedParams = await params
    const itemId = parseInt(resolvedParams.itemId, 10)
    if (!Number.isFinite(itemId)) {
      return NextResponse.json(
        { success: false, message: 'არასწორი პროდუქტის ID' },
        { status: 400 },
      )
    }

    const { status } = bodySchema.parse(await request.json())

    const orderItem = await prisma.orderItem.findUnique({
      where: { id: itemId },
      include: {
        order: { select: { id: true, status: true } },
      },
    })

    if (!orderItem) {
      return NextResponse.json(
        { success: false, message: 'შეკვეთის პროდუქტი ვერ მოიძებნა' },
        { status: 404 },
      )
    }

    if (
      !REPORTABLE_SALE_ORDER_STATUSES.includes(
        orderItem.order.status as (typeof COMPLETED_SALE_ORDER_STATUSES)[number],
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'შეკვეთა უკვე გაუქმებულია ან ჯერ არ არის გადახდილი',
        },
        { status: 400 },
      )
    }

    const wasCanceled = orderItem.sellerCanceledItem
    const nextStatus = status as OrderItemFulfillmentStatus

    const updated = await prisma.orderItem.update({
      where: { id: itemId },
      data: buildOrderItemFulfillmentUpdate(nextStatus),
      select: {
        id: true,
        sellerMarkedTransferred: true,
        sellerMarkedTransferredAt: true,
        sellerCanceledItem: true,
        sellerCanceledAt: true,
      },
    })

    if (
      nextStatus === 'CANCELED' &&
      !wasCanceled &&
      isSaleOrderItem(orderItem.isRental) &&
      orderItem.productId != null
    ) {
      await restoreSaleItemStock({
        productId: orderItem.productId,
        variantId: orderItem.variantId,
        quantity: orderItem.quantity ?? 1,
        color: orderItem.color,
        size: orderItem.size,
      })
    }

    const messages: Record<OrderItemFulfillmentStatus, string> = {
      PENDING: 'სტატუსი შეიცვალა: მოლოდინში',
      TRANSFERRED: 'სტატუსი შეიცვალა: გაცემული',
      CANCELED: 'სტატუსი შეიცვალა: გაუქმებული',
    }

    return NextResponse.json({
      success: true,
      message: messages[nextStatus],
      status: nextStatus,
      item: updated,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: error.issues[0]?.message ?? 'არასწორი მოთხოვნა' },
        { status: 400 },
      )
    }

    console.error('Error updating admin order item fulfillment status:', error)
    return NextResponse.json(
      { success: false, message: 'შეცდომა სტატუსის განახლებისას' },
      { status: 500 },
    )
  }
}
