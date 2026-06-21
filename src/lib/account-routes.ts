export const ACCOUNT_SECTIONS = [
  'profile',
  'vouchers',
  'orders',
  'sales',
  'chats',
  'inquiries',
  'contact',
  'products',
  'settings',
] as const

export type AccountSection = (typeof ACCOUNT_SECTIONS)[number]

export const DEFAULT_ACCOUNT_SECTION: AccountSection = 'profile'

export function accountSectionPath(section: AccountSection | string): string {
  return `/account/${section}`
}

/** Map legacy ?tab= values to new routes. */
export function legacyTabToSection(tab: string | null): AccountSection | null {
  if (!tab) return null

  const normalized = tab === 'Contact' ? 'contact' : tab.toLowerCase()
  if ((ACCOUNT_SECTIONS as readonly string[]).includes(normalized)) {
    return normalized as AccountSection
  }

  return null
}

export function buildAccountChatsPath(chatRoomId?: number | null): string {
  if (chatRoomId == null) return accountSectionPath('chats')
  return `${accountSectionPath('chats')}?chat=${chatRoomId}`
}
