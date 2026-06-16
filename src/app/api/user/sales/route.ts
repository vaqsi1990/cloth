import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { COMPLETED_SALE_ORDER_STATUSES } from '@/lib/sold-products'
import {
  isSaleOrderItem,
  parseOrderItemProductSnapshot,
} from '@/lib/order-item-snapshot'

function mapSaleItem(item: {
  productName: string
  size: string | null
  price: number
  quantity: number
  image: string | null
  productSnapshot: Prisma.JsonValue | null
  product: {
    id: number
    images: Array<{ url: string }>
  } | null
}) {
  const snapshot = parseOrderItemProductSnapshot(item.productSnapshot)

  return {
    productName: snapshot?.name || item.productName,
    size: snapshot?.size || item.size,
    price: snapshot?.price ?? item.price,
    quantity: snapshot?.quantity ?? item.quantity,
    image:
      snapshot?.image ||
      item.image ||
      item.product?.images?.[0]?.url ||
      null,
    snapshot,
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const saleTransactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        type: 'SALE',
        orderId: { not: null },
      },
      select: { orderId: true },
      orderBy: { createdAt: 'desc' },
    })

    const transactionOrderIds = saleTransactions
      .map((transaction) => transaction.orderId)
      .filter((id): id is number => typeof id === 'number')

    const sellerItemOrders = await prisma.order.findMany({
      where: {
        status: { in: [...COMPLETED_SALE_ORDER_STATUSES] },
        items: {
          some: {
            sellerUserId: session.user.id,
            isRental: { not: true },
          },
        },
      },
      select: { id: true },
    })

    const orderIds = [
      ...new Set([
        ...transactionOrderIds,
        ...sellerItemOrders.map((order) => order.id),
      ]),
    ]

    if (orderIds.length === 0) {
      return NextResponse.json({
        success: true,
        orders: [],
      })
    }

    const orders = await prisma.order.findMany({
      where: {
        id: { in: orderIds },
        status: { in: [...COMPLETED_SALE_ORDER_STATUSES] },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                images: {
                  select: { url: true },
                  take: 1,
                  orderBy: { position: 'asc' },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({
      success: true,
      orders: orders
        .map((order) => ({
          ...order,
          buyer: order.user,
          items: order.items
            .filter((item) => isSaleOrderItem(item.isRental))
            .filter(
              (item) =>
                item.sellerUserId === session.user.id ||
                (!item.sellerUserId && transactionOrderIds.includes(order.id)),
            )
            .map(mapSaleItem),
        }))
        .filter((order) => (order.items?.length ?? 0) > 0),
    })
  } catch (error) {
    console.error('Error fetching sales:', error)
    return NextResponse.json(
      { success: false, error: 'Error fetching sales' },
      { status: 500 }
    )
  }
}
