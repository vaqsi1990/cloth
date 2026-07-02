import { prisma } from '@/lib/prisma'
import { sendOrderConfirmationEmail } from '@/lib/order-confirmation-email'
import {
  sendBuyerOrderConfirmationSms,
  sendSellerSaleSms,
} from '@/lib/order-confirmation-sms'

/** Send buyer/seller notifications once per paid order (idempotent). */
export async function sendPaidOrderNotificationsOnce(orderId: number): Promise<void> {
  const claimed = await prisma.order.updateMany({
    where: {
      id: orderId,
      paidNotificationsSentAt: null,
      status: { in: ['PAID', 'SHIPPED'] },
    },
    data: { paidNotificationsSentAt: new Date() },
  })

  if (claimed.count === 0) return

  const results = await Promise.allSettled([
    sendOrderConfirmationEmail(orderId),
    sendBuyerOrderConfirmationSms(orderId),
    sendSellerSaleSms(orderId),
  ])

  for (const result of results) {
    if (result.status === 'rejected') {
      console.error(
        `[order-paid-notifications] Notification failed for #${orderId}:`,
        result.reason,
      )
    }
  }
}
