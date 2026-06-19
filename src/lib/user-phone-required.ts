import { isAdminOrSupport } from '@/lib/roles'
import { isValidPhone } from '@/lib/phone'

export function userHasRequiredPhone(params: {
  role?: string | null
  phone?: string | null
}): boolean {
  if (isAdminOrSupport(params.role)) {
    return true
  }

  return isValidPhone(params.phone ?? '')
}

export function userNeedsPhoneNumber(params: {
  role?: string | null
  phone?: string | null
}): boolean {
  return !userHasRequiredPhone(params)
}
