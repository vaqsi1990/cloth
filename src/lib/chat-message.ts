import { z } from 'zod'

export type ChatMessagePayload = {
  content?: string
  imageUrl?: string
}

export const chatImageUrlSchema = z
  .string()
  .url('არასწორი სურათის URL')
  .max(2048)

export const sendChatMessageSchema = z
  .object({
    content: z.string().max(1000).optional().default(''),
    imageUrl: chatImageUrlSchema.optional(),
  })
  .refine(
    (data) => data.content.trim().length > 0 || Boolean(data.imageUrl),
    { message: 'შეტყობინება უნდა შეიცავდეს ტექსტს ან ფოტოს' },
  )

export const createChatRoomMessageSchema = z
  .object({
    guestName: z.string().optional(),
    guestEmail: z.string().email().optional(),
    message: z.string().max(1000).optional().default(''),
    imageUrl: chatImageUrlSchema.optional(),
  })
  .refine(
    (data) => data.message.trim().length > 0 || Boolean(data.imageUrl),
    { message: 'შეტყობინება უნდა შეიცავდეს ტექსტს ან ფოტოს' },
  )

/** Guest live-support room creation (email required server-side). */
export const createGuestChatRoomMessageSchema = z
  .object({
    guestName: z.string().trim().min(1).optional(),
    guestEmail: z.string().trim().email('გთხოვთ შეიყვანოთ სწორი ელ-ფოსტა'),
    message: z.string().max(1000).optional().default(''),
    imageUrl: chatImageUrlSchema.optional(),
  })
  .refine(
    (data) => data.message.trim().length > 0 || Boolean(data.imageUrl),
    { message: 'შეტყობინება უნდა შეიცავდეს ტექსტს ან ფოტოს' },
  )

export function normalizeGuestEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function normalizeChatMessageContent(content?: string): string {
  return (content ?? '').trim()
}

export function chatMessagePreview(
  content: string,
  imageUrl?: string | null,
): string {
  const text = content.trim()
  if (text) return text
  if (imageUrl) return '📷 ფოტო'
  return ''
}

export function canSendChatMessage(
  content: string,
  imageUrl?: string | null,
): boolean {
  return content.trim().length > 0 || Boolean(imageUrl)
}
