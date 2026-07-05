import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { COMPLETED_SALE_ORDER_STATUSES, isSellerIncomeOrderStatus } from '@/lib/sold-products'
import {
  isSaleOrderItem,
  parseOrderItemProductSnapshot,
} from '@/lib/order-item-snapshot'
import { computeSellerSaleLineAmount } from '@/lib/seller-sale-amounts'

const VISIBLE_SALE_ORDER_STATUSES = [
  ...COMPLETED_SALE_ORDER_STATUSES,
  'CANCELED',
] as const

const sellerOrderInclude = {
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
          discount: true,
          discountDays: true,
          discountStartDate: true,
          images: {
            select: { url: true },
            take: 1,
            orderBy: { position: 'asc' as const },
          },
        },
      },
    },
  },
} satisfies Prisma.OrderInclude

type SellerOrderRecord = Prisma.OrderGetPayload<{
  include: typeof sellerOrderInclude
}>

/** Present after migration; optional until Prisma client is regenerated. */
type SellerOrderItemRecord = SellerOrderRecord['items'][number] & {
  sellerReportedDamaged?: boolean
  sellerReportedDamagedAt?: Date | null
  sellerCanceledItem?: boolean
  sellerCanceledAt?: Date | null
}

function readDamagedReport(item: SellerOrderItemRecord) {
  return {
    sellerReportedDamaged: item.sellerReportedDamaged ?? false,
    sellerReportedDamagedAt: item.sellerReportedDamagedAt ?? null,
  }
}

function mapSaleItem(item: SellerOrderItemRecord) {
  const damagedReport = readDamagedReport(item)
  const snapshot = parseOrderItemProductSnapshot(item.productSnapshot)
  const buyerUnitPrice = snapshot?.price ?? item.price
  const quantity = snapshot?.quantity ?? item.quantity
  const { sellerUnitPrice, sellerLineTotal } = computeSellerSaleLineAmount(
    buyerUnitPrice,
    quantity,
    item.product,
  )

  return {
    id: item.id,
    productName: snapshot?.name || item.productName,
    size: snapshot?.size || item.size,
    price: buyerUnitPrice,
    sellerUnitPrice,
    sellerLineTotal,
    quantity,
    image:
      snapshot?.image ||
      item.image ||
      item.product?.images?.[0]?.url ||
      null,
    snapshot,
    sellerReportedOutOfStock: item.sellerReportedOutOfStock,
    sellerReportedAt: item.sellerReportedAt,
    sellerReportedDamaged: damagedReport.sellerReportedDamaged,
    sellerReportedDamagedAt: damagedReport.sellerReportedDamagedAt,
    sellerMarkedTransferred: item.sellerMarkedTransferred,
    sellerMarkedTransferredAt: item.sellerMarkedTransferredAt,
    sellerCanceledItem: item.sellerCanceledItem ?? false,
    sellerCanceledAt: item.sellerCanceledAt ?? null,
  }
}

function mapSellerOrder(
  order: SellerOrderRecord,
  sellerUserId: string,
  transactionOrderIds: number[],
  transactionTotalByOrderId: Map<number, number>,
) {
  const items = order.items
    .filter((item) => isSaleOrderItem(item.isRental))
    .filter(
      (item) =>
        item.sellerUserId === sellerUserId ||
        (!item.sellerUserId && transactionOrderIds.includes(order.id)),
    )
    .map(mapSaleItem)

  const computedSellerTotal = items.reduce(
    (sum, item) => sum + item.sellerLineTotal,
    0,
  )
  const transactionTotal = transactionTotalByOrderId.get(order.id) ?? 0
  const sellerTotal =
    computedSellerTotal > 0 ? computedSellerTotal : transactionTotal

  return {
    ...order,
    buyer: order.user,
    sellerTotal,
    items,
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
      select: { orderId: true, total: true },
      orderBy: { createdAt: 'desc' },
    })

    const transactionOrderIds = saleTransactions
      .map((transaction) => transaction.orderId)
      .filter((id): id is number => typeof id === 'number')

    const transactionTotalByOrderId = new Map<number, number>()
    for (const transaction of saleTransactions) {
      if (typeof transaction.orderId !== 'number') continue
      transactionTotalByOrderId.set(
        transaction.orderId,
        (transactionTotalByOrderId.get(transaction.orderId) ?? 0) +
          transaction.total,
      )
    }

    const sellerItemOrders = await prisma.order.findMany({
      where: {
        status: { in: [...VISIBLE_SALE_ORDER_STATUSES] },
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
        totalSellerIncome: 0,
      })
    }

    const orders = await prisma.order.findMany({
      where: {
        id: { in: orderIds },
        status: { in: [...VISIBLE_SALE_ORDER_STATUSES] },
      },
      include: sellerOrderInclude,
      orderBy: {
        createdAt: 'desc',
      },
    })

    const mappedOrders = orders
      .map((order) =>
        mapSellerOrder(
          order,
          session.user.id,
          transactionOrderIds,
          transactionTotalByOrderId,
        ),
      )
      .filter((order) => (order.items?.length ?? 0) > 0)

    const totalSellerIncome = mappedOrders
      .filter((order) => isSellerIncomeOrderStatus(order.status))
      .reduce((sum, order) => sum + order.sellerTotal, 0)

    return NextResponse.json({
      success: true,
      totalSellerIncome,
      orders: mappedOrders,
    })
  } catch (error) {
    console.error('Error fetching sales:', error)
    return NextResponse.json(
      { success: false, error: 'Error fetching sales' },
      { status: 500 }
    )
  }
}
