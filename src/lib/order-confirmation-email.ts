import { prisma } from '@/lib/prisma'
import { getCartItemPayablePrice } from '@/lib/cart-item-pricing'
import {
  fromPrismaDeliverySpeed,
  getDeliverySpeedLabel,
} from '@/lib/delivery'
import { isEmailConfigured, sendHtmlEmail } from '@/lib/email'
import { getSiteUrl } from '@/lib/site-url'
import { formatDate } from '@/utils/dateUtils'
import { processExpiredDiscount } from '@/utils/discountUtils'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatMoney(amount: number): string {
  return `₾${amount.toFixed(2)}`
}

function buildOrderConfirmationHtml(order: {
  id: number
  createdAt: Date
  customerName: string
  phone: string
  email: string | null
  address: string
  city: string | null
  total: number
  paymentMethod: string | null
  deliveryPrice: number | null
  deliverySpeed: import('@prisma/client').DeliverySpeed | null
  deliveryCityId: number | null
  voucherCode: string | null
  voucherDiscount: number | null
  deliveryCity: { name: string } | null
  items: Array<{
    productName: string
    image: string | null
    size: string | null
    price: number
    quantity: number
    isRental: boolean | null
    rentalStartDate: Date | null
    rentalEndDate: Date | null
    rentalDays: number | null
    product: {
      discount: number | null
      discountDays: number | null
      discountStartDate: Date | null
    } | null
  }>
}): string {
  const siteUrl = getSiteUrl()
  const orderUrl = `${siteUrl}/order-confirmation?orderId=${order.id}`
  const isDelivery = Boolean(order.deliveryCityId)
  const deliverySpeed = fromPrismaDeliverySpeed(order.deliverySpeed)

  const itemRows = order.items.map((item) => {
    const product = item.product ? processExpiredDiscount(item.product) : null
    const discount =
      product?.discount && product.discount > 0 ? product.discount : 0
    const unitPrice = getCartItemPayablePrice(item.price, discount)
    const lineTotal = unitPrice * item.quantity

    const rentalInfo =
      item.isRental && item.rentalStartDate && item.rentalEndDate
        ? `<div style="color:#2563eb;font-size:13px;margin-top:4px;">
            ქირაობა: ${escapeHtml(formatDate(item.rentalStartDate))} – ${escapeHtml(formatDate(item.rentalEndDate))}
            ${item.rentalDays ? ` (${item.rentalDays} დღე)` : ''}
          </div>`
        : ''

    const imageCell = item.image
      ? `<img src="${escapeHtml(item.image)}" alt="" width="56" height="56" style="object-fit:cover;border-radius:8px;display:block;" />`
      : `<div style="width:56px;height:56px;background:#f3f4f6;border-radius:8px;"></div>`

    return `
      <tr>
        <td style="padding:12px 8px;border-bottom:1px solid #eee;vertical-align:top;">${imageCell}</td>
        <td style="padding:12px 8px;border-bottom:1px solid #eee;vertical-align:top;">
          <div style="font-weight:600;color:#111;">${escapeHtml(item.productName)}</div>
          ${item.size ? `<div style="color:#555;font-size:13px;margin-top:4px;">ზომა: ${escapeHtml(item.size)}</div>` : ''}
          ${rentalInfo}
          <div style="color:#555;font-size:13px;margin-top:4px;">რაოდენობა: ${item.quantity}</div>
        </td>
        <td style="padding:12px 8px;border-bottom:1px solid #eee;vertical-align:top;text-align:right;white-space:nowrap;">
          ${formatMoney(lineTotal)}
        </td>
      </tr>
    `
  })

  const itemsSubtotal = order.items.reduce((sum, item) => {
    const product = item.product ? processExpiredDiscount(item.product) : null
    const discount =
      product?.discount && product.discount > 0 ? product.discount : 0
    return sum + getCartItemPayablePrice(item.price, discount) * item.quantity
  }, 0)

  const voucherRow =
    order.voucherDiscount && order.voucherDiscount > 0
      ? `<tr>
          <td colspan="2" style="padding:8px 0;color:#555;">ვაუჩერი${order.voucherCode ? ` (${escapeHtml(order.voucherCode)})` : ''}</td>
          <td style="padding:8px 0;text-align:right;color:#dc2626;">-${formatMoney(order.voucherDiscount)}</td>
        </tr>`
      : ''

  const deliveryRow =
    isDelivery && order.deliveryPrice && order.deliveryPrice > 0
      ? `<tr>
          <td colspan="2" style="padding:8px 0;color:#555;">მიტანა${deliverySpeed ? ` (${escapeHtml(getDeliverySpeedLabel(deliverySpeed))})` : ''}</td>
          <td style="padding:8px 0;text-align:right;">${formatMoney(order.deliveryPrice)}</td>
        </tr>`
      : ''

  return `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#111;">
      <div style="background:#1B3729;color:#fff;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
        <h1 style="margin:0;font-size:24px;">შეკვეთა დადასტურებულია</h1>
        <p style="margin:8px 0 0;opacity:0.9;">გმადლობთ შეძენისთვის!</p>
      </div>

      <div style="background:#fff;border:1px solid #eee;border-top:none;padding:24px;border-radius:0 0 12px 12px;">
        <p style="margin-top:0;">გამარჯობა, <strong>${escapeHtml(order.customerName)}</strong>!</p>
        <p>თქვენი შეკვეთა <strong>#${order.id}</strong> წარმატებით გადახდილია.</p>

        <table style="width:100%;border-collapse:collapse;margin:20px 0;">
          <tr>
            <td style="padding:8px 0;color:#555;">შეკვეთის ნომერი</td>
            <td style="padding:8px 0;text-align:right;font-weight:600;">#${order.id}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#555;">თარიღი</td>
            <td style="padding:8px 0;text-align:right;">${escapeHtml(formatDate(order.createdAt))}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#555;">გადახდის მეთოდი</td>
            <td style="padding:8px 0;text-align:right;">${escapeHtml(order.paymentMethod || 'ბარათი')}</td>
          </tr>
        </table>

        <h2 style="font-size:18px;margin:24px 0 12px;">შეძენილი ნივთები</h2>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr>
              <th style="text-align:left;padding:8px;color:#555;font-size:13px;"></th>
              <th style="text-align:left;padding:8px;color:#555;font-size:13px;">პროდუქტი</th>
              <th style="text-align:right;padding:8px;color:#555;font-size:13px;">ფასი</th>
            </tr>
          </thead>
          <tbody>${itemRows.join('')}</tbody>
        </table>

        <table style="width:100%;border-collapse:collapse;margin-top:16px;">
          <tr>
            <td colspan="2" style="padding:8px 0;color:#555;">პროდუქტების ჯამი</td>
            <td style="padding:8px 0;text-align:right;">${formatMoney(itemsSubtotal)}</td>
          </tr>
          ${voucherRow}
          ${deliveryRow}
          <tr>
            <td colspan="2" style="padding:12px 0;font-size:18px;font-weight:700;border-top:2px solid #111;">სულ გადახდილი</td>
            <td style="padding:12px 0;text-align:right;font-size:18px;font-weight:700;border-top:2px solid #111;">${formatMoney(order.total)}</td>
          </tr>
        </table>

        <h2 style="font-size:18px;margin:24px 0 12px;">მიწოდების ინფორმაცია</h2>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;color:#555;">ტიპი</td>
            <td style="padding:6px 0;text-align:right;">${isDelivery ? 'მიტანა' : 'თვით მიღება'}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#555;">ტელეფონი</td>
            <td style="padding:6px 0;text-align:right;">${escapeHtml(order.phone)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#555;">მისამართი</td>
            <td style="padding:6px 0;text-align:right;">${escapeHtml(order.address)}</td>
          </tr>
          ${
            order.city
              ? `<tr>
                  <td style="padding:6px 0;color:#555;">ქალაქი</td>
                  <td style="padding:6px 0;text-align:right;">${escapeHtml(order.city)}</td>
                </tr>`
              : ''
          }
          ${
            isDelivery && deliverySpeed
              ? `<tr>
                  <td style="padding:6px 0;color:#555;">მიტანის სიჩქარე</td>
                  <td style="padding:6px 0;text-align:right;">${escapeHtml(getDeliverySpeedLabel(deliverySpeed))}</td>
                </tr>`
              : ''
          }
        </table>

        <div style="text-align:center;margin:28px 0 8px;">
          <a href="${orderUrl}" style="display:inline-block;background:#1B3729;color:#fff;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:600;">
            შეკვეთის ნახვა
          </a>
        </div>

        <p style="color:#666;font-size:13px;text-align:center;margin-top:24px;">
          კითხვების შემთხვევაში დაგვიკავშირდით. ეს არის ავტომატური შეტყობინება — გთხოვთ არ უპასუხოთ ამ მეილს.
        </p>
      </div>
    </div>
  `
}

export async function sendOrderConfirmationEmail(orderId: number) {
  if (!isEmailConfigured()) {
    console.warn('[sendOrderConfirmationEmail] Email is not configured, skipping')
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
      deliveryCity: {
        select: { name: true },
      },
      user: {
        select: { email: true, name: true },
      },
    },
  })

  if (!order) {
    console.warn(`[sendOrderConfirmationEmail] Order ${orderId} not found`)
    return { success: false, error: 'Order not found' }
  }

  const recipient = order.email?.trim() || order.user?.email?.trim()
  if (!recipient) {
    console.warn(`[sendOrderConfirmationEmail] No email for order ${orderId}`)
    return { success: false, skipped: true }
  }

  const html = buildOrderConfirmationHtml(order)

  return sendHtmlEmail({
    to: recipient,
    subject: `შეკვეთა #${order.id} დადასტურებულია — Dressla.ge`,
    html,
  })
}
