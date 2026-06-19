export type AdminDashboardSection = 'users' | 'products' | 'orders' | 'salesInfo'

const STORAGE_KEYS: Record<AdminDashboardSection, string> = {
  users: 'admin-dashboard-seen-users-at',
  products: 'admin-dashboard-seen-products-at',
  orders: 'admin-dashboard-seen-orders-at',
  salesInfo: 'admin-dashboard-seen-sales-info-at',
}

export function getAdminSectionLastSeenAt(section: AdminDashboardSection): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(STORAGE_KEYS[section])
}

export function markAdminSectionSeen(section: AdminDashboardSection, date = new Date()) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEYS[section], date.toISOString())
}

export function buildAdminAlertsQuery(sections: AdminDashboardSection[]): string {
  const params = new URLSearchParams()
  for (const section of sections) {
    const seenAt = getAdminSectionLastSeenAt(section)
    if (seenAt) {
      params.set(section, seenAt)
    }
  }
  return params.toString()
}
