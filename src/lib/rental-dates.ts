/** Client-safe rental date helpers (no Prisma / Node-only deps). */

export function normalizeDateOnly(date: Date | string): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function calcRentalDays(startDate: Date | string, endDate: Date | string): number {
  const start = normalizeDateOnly(startDate)
  const end = normalizeDateOnly(endDate)
  const diff = end.getTime() - start.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24)) + 1
  return Math.max(1, days)
}

/** Same calendar day is valid (1-day rental). Only end before start is rejected. */
export function isRentalEndBeforeStart(
  startDate: Date | string,
  endDate: Date | string,
): boolean {
  const start = normalizeDateOnly(startDate)
  const end = normalizeDateOnly(endDate)
  return end.getTime() < start.getTime()
}

export function datesMatch(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return (
    normalizeDateOnly(aStart).getTime() === normalizeDateOnly(bStart).getTime() &&
    normalizeDateOnly(aEnd).getTime() === normalizeDateOnly(bEnd).getTime()
  )
}
