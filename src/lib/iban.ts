const GEORGIAN_IBAN_REGEX = /^GE\d{2}[0-9A-Z]{16,}$/

export function normalizeGeorgianIban(value: string): string {
  return value.replace(/\s+/g, '').toUpperCase()
}

export function isValidGeorgianIban(value: string | null | undefined): boolean {
  if (!value) return false
  const normalized = normalizeGeorgianIban(value)
  return normalized.length >= 22 && normalized.length <= 34 && GEORGIAN_IBAN_REGEX.test(normalized)
}
