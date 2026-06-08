import { isAdminOrSupport } from '@/lib/roles'

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

  return isIdentityApproved(params.verification, params.sessionVerificationStatus) && Boolean(params.iban)
}
