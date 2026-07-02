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

function formatSellerPrice(amount: number): string {
  return `${amount.toFixed(2)}₾`
}

function buildOrderConfirmationSmsContent(
  items: Array<{
    productName: string
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
      `გაყიდულია ნივთი ნომრით: ${itemNumber}\nფასი: ${formatSellerPrice(sellerLineTotal)}`,
    )
  }

  if (saleLines.length === 0) {
    return null
  }

  return `${saleLines.join('\n\n')}\n\n${OUT_OF_STOCK_FOOTER}`
}

export async function sendOrderConfirmationSms(orderId: number) {
  if (!isSmsConfigured()) {
    console.warn('[sendOrderConfirmationSms] SMS is not configured, skipping')
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
            },
          },
        },
      },
      user: {
        select: { phone: true },
      },
    },
  })

  if (!order) {
    console.warn(`[sendOrderConfirmationSms] Order ${orderId} not found`)
    return { success: false, error: 'Order not found' }
  }

  const phone = order.phone?.trim() || order.user?.phone?.trim()
  if (!phone) {
    console.warn(`[sendOrderConfirmationSms] No phone for order ${orderId}`)
    return { success: false, skipped: true }
  }

  const content = buildOrderConfirmationSmsContent(order.items)
  if (!content) {
    return { success: false, skipped: true }
  }

  return sendSms({
    destination: phone,
    content,
    reference: `o${orderId}`,
    urgent: true,
  })
}
