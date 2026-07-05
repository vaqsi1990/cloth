import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isSaleOrderItem } from '@/lib/order-item-snapshot'
import { restoreSaleItemStock } from '@/lib/order-out-of-stock'
import { requireOrderItemStatusAccess } from '@/lib/order-item-status-access'
import {
  buildOrderItemFulfillmentUpdate,
  ORDER_ITEM_RETURNED_STATUS_LABEL,
} from '@/lib/order-item-fulfillment-status'

export async function POST(
  _request: NextRequest,
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

    const orderItem = await prisma.orderItem.findUnique({
      where: { id: itemId },
      select: {
        id: true,
        orderId: true,
        productId: true,
        variantId: true,
        quantity: true,
        color: true,
        size: true,
        isRental: true,
        sellerCanceledItem: true,
        sellerMarkedTransferred: true,
        sellerReportedOutOfStock: true,
        sellerReportedDamaged: true,
      },
    })

    if (!orderItem) {
      return NextResponse.json(
        { success: false, message: 'შეკვეთის პროდუქტი ვერ მოიძებნა' },
        { status: 404 },
      )
    }

    if (orderItem.sellerCanceledItem) {
      return NextResponse.json({
        success: true,
        message: `ნივთი უკვე მონიშნულია როგორც ${ORDER_ITEM_RETURNED_STATUS_LABEL}`,
        alreadyCanceled: true,
        item: {
          id: orderItem.id,
          sellerCanceledItem: true,
        },
      })
    }

    if (orderItem.sellerMarkedTransferred) {
      return NextResponse.json(
        {
          success: false,
          message: 'გაცემული ნივთის გაუქმება ვერ მოხდება',
        },
        { status: 400 },
      )
    }

    if (orderItem.sellerReportedOutOfStock || orderItem.sellerReportedDamaged) {
      return NextResponse.json(
        {
          success: false,
          message: 'ამ ნივთზე უკვე გაგზავნილია სხვა სტატუსი',
        },
        { status: 400 },
      )
    }

    const updated = await prisma.orderItem.update({
      where: { id: itemId },
      data: buildOrderItemFulfillmentUpdate('CANCELED'),
      select: {
        id: true,
        sellerCanceledItem: true,
        sellerCanceledAt: true,
      },
    })

    if (
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

    const orderSaleItems = await prisma.orderItem.findMany({
      where: { orderId: orderItem.orderId },
      select: {
        isRental: true,
        sellerCanceledItem: true,
        sellerReportedOutOfStock: true,
        sellerReportedDamaged: true,
        sellerMarkedTransferred: true,
      },
    })

    const saleItems = orderSaleItems.filter((item) => isSaleOrderItem(item.isRental))
    const pendingItems = saleItems.filter(
      (item) =>
        !item.sellerMarkedTransferred &&
        !item.sellerCanceledItem &&
        !item.sellerReportedOutOfStock &&
        !item.sellerReportedDamaged,
    )

    return NextResponse.json({
      success: true,
      message:
        pendingItems.length > 0
          ? 'ნივთი გაუქმდა. შეკვეთის სხვა პროდუქტები უცვლელია.'
          : `ნივთი მონიშნულია როგორც ${ORDER_ITEM_RETURNED_STATUS_LABEL}`,
      item: updated,
      orderCanceled: false,
      orderId: orderItem.orderId,
    })
  } catch (error) {
    console.error('Error canceling sale order item:', error)
    return NextResponse.json(
      { success: false, message: 'შეცდომა ნივთის გაუქმებისას' },
      { status: 500 },
    )
  }
}
