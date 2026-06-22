import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSaleOrderItem } from '@/lib/order-item-snapshot'
import { REPORTABLE_SALE_ORDER_STATUSES } from '@/lib/order-out-of-stock'
import type { COMPLETED_SALE_ORDER_STATUSES } from '@/lib/sold-products'

type SellerOrderItemContext = {
  id: number
  isRental: boolean | null
  sellerUserId: string | null
  sellerReportedOutOfStock: boolean
  order: { status: string }
  product: { userId: string | null } | null
}

export async function requireSellerOrderItemAccess(itemId: number) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return {
      ok: false as const,
      status: 401,
      message: 'ავტორიზაცია საჭიროა',
    }
  }

  const orderItem = await prisma.orderItem.findUnique({
    where: { id: itemId },
    include: {
      order: { select: { id: true, status: true } },
      product: { select: { userId: true } },
    },
  })

  if (!orderItem) {
    return {
      ok: false as const,
      status: 404,
      message: 'შეკვეთის პროდუქტი ვერ მოიძებნა',
    }
  }

  const ctx = orderItem as SellerOrderItemContext

  if (!isSaleOrderItem(ctx.isRental)) {
    return {
      ok: false as const,
      status: 400,
      message: 'მხოლოდ გაყიდვის პროდუქტზეა შესაძლებელი',
    }
  }

  const sellerId = session.user.id
  const ownsItem =
    ctx.sellerUserId === sellerId || ctx.product?.userId === sellerId

  if (!ownsItem) {
    return {
      ok: false as const,
      status: 403,
      message: 'თქვენ არ ხართ ამ გაყიდვის მფლობელი',
    }
  }

  if (
    !REPORTABLE_SALE_ORDER_STATUSES.includes(
      ctx.order.status as (typeof COMPLETED_SALE_ORDER_STATUSES)[number],
    )
  ) {
    return {
      ok: false as const,
      status: 400,
      message: 'შეკვეთა უკვე გაუქმებულია ან ჯერ არ არის გადახდილი',
    }
  }

  return { ok: true as const, orderItem: ctx, sellerId }
}
