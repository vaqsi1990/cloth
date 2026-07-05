import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSaleOrderItem } from '@/lib/order-item-snapshot'
import { REPORTABLE_SALE_ORDER_STATUSES } from '@/lib/order-out-of-stock'
import { isAdminOrSupport } from '@/lib/roles'
import type { COMPLETED_SALE_ORDER_STATUSES } from '@/lib/sold-products'

type OrderItemStatusContext = {
  id: number
  isRental: boolean | null
  sellerUserId: string | null
  sellerReportedOutOfStock: boolean
  order: { id: number; status: string; userId: string | null }
  product: { userId: string | null } | null
}

export async function requireOrderItemStatusAccess(itemId: number) {
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
      order: { select: { id: true, status: true, userId: true } },
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

  const ctx = orderItem as OrderItemStatusContext

  if (!isSaleOrderItem(ctx.isRental)) {
    return {
      ok: false as const,
      status: 400,
      message: 'მხოლოდ გაყიდვის პროდუქტზეა შესაძლებელი',
    }
  }

  const userId = session.user.id
  const isStaff = isAdminOrSupport(session.user.role)
  const isSeller =
    ctx.sellerUserId === userId || ctx.product?.userId === userId
  const isBuyer = ctx.order.userId === userId

  if (!isStaff && !isSeller && !isBuyer) {
    return {
      ok: false as const,
      status: 403,
      message: 'თქვენ არ გაქვთ ამ ნივთის სტატუსის შეცვლის უფლება',
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

  return {
    ok: true as const,
    orderItem: ctx,
    userId,
    isStaff,
    isSeller,
    isBuyer,
  }
}
