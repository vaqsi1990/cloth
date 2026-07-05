import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cancelSaleOrder } from '@/lib/cancel-sale-order'
import { isSaleOrderItem } from '@/lib/order-item-snapshot'
import { requireOrderItemStatusAccess } from '@/lib/order-item-status-access'

type SaleItemStatus = {
  sellerCanceledItem: boolean
  sellerReportedOutOfStock: boolean
  sellerReportedDamaged: boolean
  sellerMarkedTransferred: boolean
}

function isNegativeTerminalItem(item: SaleItemStatus) {
  return (
    item.sellerCanceledItem ||
    item.sellerReportedOutOfStock ||
    item.sellerReportedDamaged
  )
}

function shouldCancelEntireOrder(items: SaleItemStatus[]) {
  const saleItems = items
  if (saleItems.length === 0) return false
  return saleItems.every(isNegativeTerminalItem)
}

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
        message: 'ნივთი უკვე მონიშნულია როგორც გაუქმებული',
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
      data: {
        sellerCanceledItem: true,
        sellerCanceledAt: new Date(),
      },
      select: {
        id: true,
        sellerCanceledItem: true,
        sellerCanceledAt: true,
      },
    })

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

    let orderCanceled = false
    if (shouldCancelEntireOrder(saleItems)) {
      const cancelResult = await cancelSaleOrder(orderItem.orderId)
      orderCanceled = cancelResult.ok
    }

    return NextResponse.json({
      success: true,
      message: orderCanceled
        ? 'ნივთი გაუქმდა და შეკვეთა დახურულია'
        : 'ნივთი მონიშნულია როგორც გაუქმებული',
      item: updated,
      orderCanceled,
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
