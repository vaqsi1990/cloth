/**
 * Role utility functions
 */

export type UserRole = 'USER' | 'ADMIN' | 'SUPPORT' | 'COURIER'

/**
 * Check if user has admin privileges (ADMIN or SUPPORT)
 */
export function isAdminOrSupport(role: string | undefined | null): boolean {
  return role === 'ADMIN' || role === 'SUPPORT'
}

/**
 * Check if user is admin (only ADMIN, not SUPPORT)
 */
export function isAdmin(role: string | undefined | null): boolean {
  return role === 'ADMIN'
}

/**
 * Check if user is support (only SUPPORT)
 */
export function isSupport(role: string | undefined | null): boolean {
  return role === 'SUPPORT'
}

/**
 * Check if user is courier (only COURIER)
 */
export function isCourier(role: string | undefined | null): boolean {
  return role === 'COURIER'
}

/**
 * Staff roles that skip phone requirement during onboarding
 */
export function isStaffRole(role: string | undefined | null): boolean {
  return isAdminOrSupport(role) || isCourier(role)
}
