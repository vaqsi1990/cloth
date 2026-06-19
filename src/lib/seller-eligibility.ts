import { isAdminOrSupport } from '@/lib/roles'
import { isValidGeorgianIban } from '@/lib/iban'

export type VerificationState = 'PENDING' | 'APPROVED' | 'REJECTED' | null

type VerificationRecord = {
  identityStatus?: VerificationState
  status?: VerificationState
} | null | undefined

export function getIdentityStatus(
  verification?: VerificationRecord,
  sessionVerificationStatus?: string | null,
): VerificationState {
  return (
    verification?.identityStatus ??
    verification?.status ??
    (sessionVerificationStatus as VerificationState) ??
    null
  )
}

export function isIdentityApproved(
  verification?: VerificationRecord,
  sessionVerificationStatus?: string | null,
): boolean {
  return getIdentityStatus(verification, sessionVerificationStatus) === 'APPROVED'
}

export function canUserCreateProducts(params: {
  role: string | undefined | null
  iban: string | null | undefined
  verification?: VerificationRecord
  sessionVerificationStatus?: string | null
}): boolean {
  if (isAdminOrSupport(params.role)) {
    return true
  }

  return (
    isValidGeorgianIban(params.iban) &&
    isIdentityApproved(params.verification, params.sessionVerificationStatus)
  )
}

/** Same rules as product creation — approved IBAN verification required. */
export function canUserMakePurchases(params: {
  role: string | undefined | null
  iban: string | null | undefined
  verification?: VerificationRecord
  sessionVerificationStatus?: string | null
}): boolean {
  return canUserCreateProducts(params)
}

export function needsIbanIdentityReview(params: {
  iban?: string | null
  verification?: VerificationRecord
}): boolean {
  if (!params.iban || !isValidGeorgianIban(params.iban) || !params.verification) {
    return false
  }

  const status = getIdentityStatus(params.verification)
  return status === 'PENDING' || status === 'REJECTED'
}
