import { prisma } from '@/lib/prisma'
import { revalidateProductListCache } from '@/lib/product-list-query'
import { COMPLETED_SALE_ORDER_STATUSES } from '@/lib/sold-products'
import { finalizeCanceledSaleProducts } from '@/lib/finalize-canceled-sale-products'
import { restoreVoucherForOrder } from '@/lib/voucher'

type CancelSaleOrderOptions = {
  requirePaidOrShipped?: boolean
}

export async function cancelSaleOrder(
  orderId: number,
  options: CancelSaleOrderOptions = {},
) {
  const requirePaidOrShipped = options.requirePaidOrShipped ?? true

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true },
  })

  if (!order) {
    return {
      ok: false as const,
      status: 404,
      message: 'შეკვეთა ვერ მოიძებნა',
    }
  }

  if (order.status === 'CANCELED') {
    return {
      ok: true as const,
      status: 200,
      message: 'შეკვეთა უკვე გაუქმებულია',
      alreadyCanceled: true,
    }
  }

  if (
    requirePaidOrShipped &&
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

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: { status: 'CANCELED', updatedAt: new Date() },
    })
  })

  await restoreVoucherForOrder(orderId)
  await finalizeCanceledSaleProducts(orderId)

  try {
    revalidateProductListCache()
  } catch {
    // non-fatal
  }

  return {
    ok: true as const,
    status: 200,
    message: 'შეკვეთა გაუქმდა',
  }
}
