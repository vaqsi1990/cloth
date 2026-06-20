export type RawChatMessage = {
  id: number
  content: string
  imageUrl?: string | null
  createdAt: string
  isFromAdmin: boolean
  user_name?: string
  user_email?: string
  admin_name?: string
  admin_email?: string
  admin_role?: string
}

export type UiChatMessage = {
  id: number
  content: string
  imageUrl: string | null
  createdAt: string
  isFromAdmin: boolean
  user?: { name: string; email: string }
  admin?: { name: string; email: string; role?: string }
}

export function mapApiChatMessages(messages: RawChatMessage[]): UiChatMessage[] {
  const unique = messages.filter(
    (message, index, self) =>
      index === self.findIndex((entry) => entry.id === message.id),
  )

  return unique
    .map((msg) => ({
      id: msg.id,
      content: msg.content ?? '',
      imageUrl: msg.imageUrl ?? null,
      createdAt: msg.createdAt,
      isFromAdmin: msg.isFromAdmin,
      user: msg.user_name
        ? { name: msg.user_name, email: msg.user_email ?? '' }
        : undefined,
      admin: msg.admin_name
        ? {
            name: msg.admin_name,
            email: msg.admin_email ?? '',
            role: msg.admin_role,
          }
        : undefined,
    }))
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )
}
