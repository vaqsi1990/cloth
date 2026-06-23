import { prisma } from '@/lib/prisma'
import { isSaleOrderItem } from '@/lib/order-item-snapshot'
import { COMPLETED_SALE_ORDER_STATUSES } from '@/lib/sold-products'

function sellerOwnsSaleItem(
  item: {
    sellerUserId: string | null
    product: { userId: string | null } | null
  },
  sellerId: string,
) {
  return item.sellerUserId === sellerId || item.product?.userId === sellerId
}

export async function requireSellerOrderCancelAccess(
  orderId: number,
  sellerId: string,
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: { select: { userId: true } },
        },
      },
    },
  })

  if (!order) {
    return {
      ok: false as const,
      status: 404,
      message: 'შეკვეთა ვერ მოიძებნა',
    }
  }

  if (
    !COMPLETED_SALE_ORDER_STATUSES.includes(
      order.status as (typeof COMPLETED_SALE_ORDER_STATUSES)[number],
    )
  ) {
    return {
      ok: false as const,
      status: 400,
      message:
        'გაუქმება შესაძლებელია მხოლოდ გადახდილი ან გაგზავნილი შეკვეთისთვის',
    }
  }

  const saleItems = order.items.filter((item) => isSaleOrderItem(item.isRental))

  if (saleItems.length === 0) {
    return {
      ok: false as const,
      status: 400,
      message: 'შეკვეთაში გაყიდვის ნივთი ვერ მოიძებნა',
    }
  }

  const sellerItems = saleItems.filter((item) =>
    sellerOwnsSaleItem(item, sellerId),
  )

  if (sellerItems.length === 0) {
    return {
      ok: false as const,
      status: 403,
      message: 'თქვენ არ ხართ ამ გაყიდვის მფლობელი',
    }
  }

  const allSaleItemsBelongToSeller = saleItems.every((item) =>
    sellerOwnsSaleItem(item, sellerId),
  )

  if (!allSaleItemsBelongToSeller) {
    return {
      ok: false as const,
      status: 400,
      message:
        'შეკვეთაში სხვა გამყიდველის ნივთებიცაა — გაუქმება შეუძლია მხოლოდ ადმინისტრატორს',
    }
  }

  return { ok: true as const, order }
}
