/**
 * Role utility functions
 */

export type UserRole = 'USER' | 'ADMIN' | 'SUPPORT'

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

