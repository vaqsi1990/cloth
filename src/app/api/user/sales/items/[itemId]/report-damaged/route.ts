import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSaleOrderItem } from '@/lib/order-item-snapshot'
import { REPORTABLE_SALE_ORDER_STATUSES } from '@/lib/order-out-of-stock'
import { COMPLETED_SALE_ORDER_STATUSES } from '@/lib/sold-products'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> },
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'ავტორიზაცია საჭიროა' },
        { status: 401 },
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

    const orderItem = await prisma.orderItem.findUnique({
      where: { id: itemId },
      include: {
        order: { select: { id: true, status: true } },
        product: { select: { userId: true } },
      },
    })

    if (!orderItem) {
      return NextResponse.json(
        { success: false, message: 'შეკვეთის პროდუქტი ვერ მოიძებნა' },
        { status: 404 },
      )
    }

    if (!isSaleOrderItem(orderItem.isRental)) {
      return NextResponse.json(
        { success: false, message: 'მხოლოდ გაყიდვის პროდუქტზეა შესაძლებელი' },
        { status: 400 },
      )
    }

    const sellerId = session.user.id
    const ownsItem =
      orderItem.sellerUserId === sellerId ||
      orderItem.product?.userId === sellerId

    if (!ownsItem) {
      return NextResponse.json(
        { success: false, message: 'თქვენ არ ხართ ამ გაყიდვის მფლობელი' },
        { status: 403 },
      )
    }

    if (
      !REPORTABLE_SALE_ORDER_STATUSES.includes(
        orderItem.order.status as (typeof COMPLETED_SALE_ORDER_STATUSES)[number],
      )
    ) {
      return NextResponse.json(
        { success: false, message: 'შეკვეთა უკვე გაუქმებულია ან ჯერ არ არის გადახდილი' },
        { status: 400 },
      )
    }

    if (orderItem.sellerReportedDamaged) {
      return NextResponse.json({
        success: true,
        message: 'უკვე მითითებულია, რომ ნივთი დაზიანებულია',
        alreadyReported: true,
      })
    }

    const updated = await prisma.orderItem.update({
      where: { id: itemId },
      data: {
        sellerReportedDamaged: true,
        sellerReportedDamagedAt: new Date(),
      },
      select: {
        id: true,
        sellerReportedDamaged: true,
        sellerReportedDamagedAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'ადმინისტრატორს გადაეცემა ინფორმაცია, რომ ნივთი დაზიანებულია',
      item: updated,
    })
  } catch (error) {
    console.error('Error reporting damaged item:', error)
    return NextResponse.json(
      { success: false, message: 'შეცდომა მოხსენებისას' },
      { status: 500 },
    )
  }
}
