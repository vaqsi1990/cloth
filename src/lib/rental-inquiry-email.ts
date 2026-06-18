import { isEmailConfigured, sendHtmlEmail } from '@/lib/email'
import { getSiteUrl } from '@/lib/site-url'
import { formatDate } from '@/utils/dateUtils'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export type RentalInquiryEmailPayload = {
  inquiryId: number
  productId: number
  productName: string
  productSku: string | null
  startDate: Date
  endDate: Date
  size: string | null
  estimatedTotal: number
  buyerName: string | null
  buyerMessage: string | null
  sellerName: string | null
  sellerEmail: string
}

export function buildRentalInquirySellerEmailHtml(
  payload: RentalInquiryEmailPayload,
): string {
  const siteUrl = getSiteUrl()
  const confirmUrl = `${siteUrl}/account?tab=inquiries`
  const sellerGreeting = payload.sellerName?.trim() || 'ავტორო'

  const skuRow = payload.productSku
    ? `<tr>
        <td style="padding:8px 0;color:#555;">SKU</td>
        <td style="padding:8px 0;text-align:right;font-weight:600;">${escapeHtml(payload.productSku)}</td>
      </tr>`
    : ''

  const sizeRow = payload.size
    ? `<tr>
        <td style="padding:8px 0;color:#555;">ზომა</td>
        <td style="padding:8px 0;text-align:right;">${escapeHtml(payload.size)}</td>
      </tr>`
    : ''

  const buyerRow = payload.buyerName
    ? `<tr>
        <td style="padding:8px 0;color:#555;">მომხმარებელი</td>
        <td style="padding:8px 0;text-align:right;">${escapeHtml(payload.buyerName)}</td>
      </tr>`
    : ''

  const buyerMessageBlock = payload.buyerMessage?.trim()
    ? `<p style="margin:16px 0 0;padding:12px 16px;background:#f9fafb;border-radius:8px;color:#374151;">
        <strong>შენიშვნა:</strong> ${escapeHtml(payload.buyerMessage.trim())}
      </p>`
    : ''

  return `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#111;">
      <div style="background:#1B3729;color:#fff;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
        <h1 style="margin:0;font-size:24px;">ახალი ქირაობის მოთხოვნა</h1>
        <p style="margin:8px 0 0;opacity:0.9;">ელოდება თქვენს დადასტურებას</p>
      </div>

      <div style="background:#fff;border:1px solid #eee;border-top:none;padding:24px;border-radius:0 0 12px 12px;">
        <p style="margin-top:0;">გამარჯობა, <strong>${escapeHtml(sellerGreeting)}</strong>!</p>
        <p>
          კლიენტი აგზავნის ქირაობის მოთხოვნას თქვენს პროდუქტზე. გთხოვთ შეხვიდეთ საიტზე და დაადასტუროთ ან უარყოთ მოთხოვნა.
        </p>

        <h2 style="font-size:18px;margin:24px 0 12px;">პროდუქტის ინფორმაცია</h2>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;color:#555;">პროდუქტი</td>
            <td style="padding:8px 0;text-align:right;font-weight:600;">${escapeHtml(payload.productName)}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#555;">პროდუქტის ID</td>
            <td style="padding:8px 0;text-align:right;font-weight:600;">#${payload.productId}</td>
          </tr>
          ${skuRow}
          <tr>
            <td style="padding:8px 0;color:#555;">მოთხოვნის ID</td>
            <td style="padding:8px 0;text-align:right;font-weight:600;">#${payload.inquiryId}</td>
          </tr>
        </table>

        <h2 style="font-size:18px;margin:24px 0 12px;">ქირაობის დეტალები</h2>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;color:#555;">დაწყება</td>
            <td style="padding:8px 0;text-align:right;">${escapeHtml(formatDate(payload.startDate))}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#555;">დასრულება</td>
            <td style="padding:8px 0;text-align:right;">${escapeHtml(formatDate(payload.endDate))}</td>
          </tr>
          ${sizeRow}
          <tr>
            <td style="padding:8px 0;color:#555;">სავარაუდო ფასი</td>
            <td style="padding:8px 0;text-align:right;font-weight:600;">₾${payload.estimatedTotal.toFixed(2)}</td>
          </tr>
          ${buyerRow}
        </table>

        ${buyerMessageBlock}

        <div style="text-align:center;margin:28px 0 8px;">
          <a href="${confirmUrl}" style="display:inline-block;background:#1B3729;color:#fff;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:600;">
            მოთხოვნის გადახენა და დადასტურება
          </a>
        </div>

        <p style="color:#666;font-size:13px;text-align:center;margin-top:16px;">
          ან გადადით ამ ბმულზე: <a href="${confirmUrl}">${confirmUrl}</a>
        </p>

        <p style="color:#666;font-size:13px;text-align:center;margin-top:24px;">
          ეს არის ავტომატური შეტყობინება Dressla.ge-დან — გთხოვთ არ უპასუხოთ ამ მეილს.
        </p>
      </div>
    </div>
  `
}

export async function sendRentalInquirySellerEmail(
  payload: RentalInquiryEmailPayload,
) {
  if (!isEmailConfigured()) {
    console.warn('[sendRentalInquirySellerEmail] Email is not configured, skipping')
    return { success: false, skipped: true }
  }

  const recipient = payload.sellerEmail.trim()
  if (!recipient) {
    console.warn('[sendRentalInquirySellerEmail] No seller email')
    return { success: false, skipped: true }
  }

  const html = buildRentalInquirySellerEmailHtml(payload)

  return sendHtmlEmail({
    to: recipient,
    subject: `ახალი მოთხოვნა: ${payload.productName} (ID #${payload.productId}) — Dressla.ge`,
    html,
  })
}
