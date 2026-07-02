import { prisma } from '@/lib/prisma'
import { getDiscountedPrice } from '@/lib/discount-helpers'
import {
  isSaleOrderItem,
  parseOrderItemProductSnapshot,
} from '@/lib/order-item-snapshot'
import { getSellerPriceFromBuyer } from '@/lib/platform-pricing'
import { isSmsConfigured, sendSms } from '@/lib/sms'
import { processExpiredDiscount } from '@/utils/discountUtils'
import type { Prisma } from '@prisma/client'

const OUT_OF_STOCK_FOOTER =
  'ნივთის მარაგში ამოწურვის შემთხვევაში დაუყოვნებლივ დაგვიკავშირდით dressla.online@gmail.com +995599556395'

function formatMoney(amount: number): string {
  return `${amount.toFixed(2)}₾`
}

function buildBuyerOrderConfirmationSmsContent(
  orderId: number,
  total: number,
  items: Array<{
    productName: string
    quantity: number
  }>,
): string {
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const firstName = items[0]?.productName?.trim()
  const itemLabel =
    itemCount === 1 && firstName
      ? firstName
      : `${itemCount} ნივთი`

  return `შეკვეთა #${orderId} დადასტურებულია Dressla.ge-ზე. ${itemLabel}. თანხა: ${formatMoney(total)}`
}

function buildSellerSaleSmsContent(
  items: Array<{
    price: number
    quantity: number
    isRental: boolean | null
    productSnapshot: Prisma.JsonValue | null
    product: {
      discount: number | null
      discountDays: number | null
      discountStartDate: Date | null
    } | null
  }>,
): string | null {
  const saleLines: string[] = []

  for (const item of items) {
    if (!isSaleOrderItem(item.isRental)) continue

    const snapshot = parseOrderItemProductSnapshot(item.productSnapshot)
    const itemNumber = snapshot?.sku?.trim() || '—'

    const product = item.product ? processExpiredDiscount(item.product) : null
    const discount =
      product?.discount && product.discount > 0 ? product.discount : 0
    const sellerListPrice = getSellerPriceFromBuyer(item.price)
    const sellerUnitPrice = getDiscountedPrice(sellerListPrice, discount)
    const sellerLineTotal = sellerUnitPrice * item.quantity

    saleLines.push(
      `გაყიდულია ნივთი ნომრით: ${itemNumber}\nფასი: ${formatMoney(sellerLineTotal)}`,
    )
  }

  if (saleLines.length === 0) {
    return null
  }

  return `${saleLines.join('\n\n')}\n\n${OUT_OF_STOCK_FOOTER}`
}

export async function sendBuyerOrderConfirmationSms(orderId: number) {
  if (!isSmsConfigured()) {
    console.warn('[sendBuyerOrderConfirmationSms] SMS is not configured, skipping')
    return { success: false, skipped: true }
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        select: {
          productName: true,
          quantity: true,
        },
      },
      user: {
        select: { phone: true },
      },
    },
  })

  if (!order) {
    console.warn(`[sendBuyerOrderConfirmationSms] Order ${orderId} not found`)
    return { success: false, error: 'Order not found' }
  }

  const phone = order.phone?.trim() || order.user?.phone?.trim()
  if (!phone) {
    console.warn(`[sendBuyerOrderConfirmationSms] No phone for order ${orderId}`)
    return { success: false, skipped: true }
  }

  const content = buildBuyerOrderConfirmationSmsContent(
    order.id,
    order.total,
    order.items,
  )

  return sendSms({
    destination: phone,
    content,
    reference: `buyer-o${orderId}`,
    urgent: true,
  })
}

export async function sendSellerSaleSms(orderId: number) {
  if (!isSmsConfigured()) {
    return { success: false, skipped: true }
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: {
            select: {
              discount: true,
              discountDays: true,
              discountStartDate: true,
              user: {
                select: { phone: true },
              },
            },
          },
        },
      },
    },
  })

  if (!order) {
    return { success: false, error: 'Order not found' }
  }

  const sellers = new Map<string, typeof order.items>()

  for (const item of order.items) {
    if (!isSaleOrderItem(item.isRental)) continue
    const sellerPhone = item.product?.user?.phone?.trim()
    if (!sellerPhone) continue
    const bucket = sellers.get(sellerPhone) ?? []
    bucket.push(item)
    sellers.set(sellerPhone, bucket)
  }

  const results = []
  let index = 0

  for (const [phone, items] of sellers) {
    const content = buildSellerSaleSmsContent(items)
    if (!content) continue

    index += 1
    results.push(
      sendSms({
        destination: phone,
        content,
        reference: `seller-o${orderId}-${index}`,
        urgent: true,
      }),
    )
  }

  if (results.length === 0) {
    return { success: false, skipped: true }
  }

  const settled = await Promise.allSettled(results)
  const failed = settled.find((result) => result.status === 'rejected')
  if (failed?.status === 'rejected') {
    throw failed.reason
  }

  const smsResults = settled
    .filter((result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof sendSms>>> =>
      result.status === 'fulfilled',
    )
    .map((result) => result.value)

  const unsuccessful = smsResults.find((result) => !result.success)
  if (unsuccessful) {
    return unsuccessful
  }

  return { success: true }
}

/** @deprecated Use sendBuyerOrderConfirmationSms via sendPaidOrderNotificationsOnce */
export async function sendOrderConfirmationSms(orderId: number) {
  return sendBuyerOrderConfirmationSms(orderId)
}
