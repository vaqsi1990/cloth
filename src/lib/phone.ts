const GEORGIAN_MOBILE_REGEX = /^\+9955\d{8}$/

export function normalizePhone(input: string): string {
  const trimmed = input.trim()
  const digits = trimmed.replace(/\D/g, '')

  if (digits.startsWith('995') && digits.length === 12) {
    return `+${digits}`
  }

  if (digits.length === 9 && digits.startsWith('5')) {
    return `+995${digits}`
  }

  if (trimmed.startsWith('+') && digits.length > 0) {
    return `+${digits}`
  }

  return digits
}

export function isValidPhone(input: string): boolean {
  const normalized = normalizePhone(input)
  return GEORGIAN_MOBILE_REGEX.test(normalized)
}

export function phoneLookupVariants(input: string): string[] {
  const normalized = normalizePhone(input)
  const digits = normalized.replace(/\D/g, '')
  const local = digits.startsWith('995') ? digits.slice(3) : digits

  const variants = new Set<string>()
  if (normalized) variants.add(normalized)
  if (digits) variants.add(digits)
  if (local) variants.add(local)
  if (local.length === 9 && local.startsWith('5')) {
    variants.add(`+995${local}`)
    variants.add(`995${local}`)
  }

  return [...variants]
}
