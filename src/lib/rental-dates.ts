/** Client-safe rental date helpers (no Prisma / Node-only deps). */

/** Maintenance day(s) after rental end — blocked in calendar but not a rental day. */
export const RENTAL_MAINTENANCE_DAYS_AFTER_END = 1

/** Days after rental end before the next rental may start (return + maintenance). */
export const RENTAL_DAYS_BEFORE_NEXT_START = 2

export function normalizeDateOnly(date: Date | string): Date {
  if (typeof date === 'string') {
    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) {
      return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    }
  }
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

export function addDaysToDateOnly(date: Date | string, days: number): Date {
  const next = normalizeDateOnly(date)
  next.setDate(next.getDate() + days)
  return next
}

/** Last calendar day blocked after a rental (rental end + maintenance). */
export function getLastBlockedDayAfterRental(existingEnd: Date | string): Date {
  return addDaysToDateOnly(existingEnd, RENTAL_MAINTENANCE_DAYS_AFTER_END)
}

/** Maintenance period end shown in UI (day after rental end). */
export function getMaintenanceEndDate(existingEnd: Date | string): Date {
  return getLastBlockedDayAfterRental(existingEnd)
}

/** First calendar day a new rental may start after an existing period. */
export function firstAvailableRentalStartAfter(existingEnd: Date | string): Date {
  return addDaysToDateOnly(existingEnd, RENTAL_DAYS_BEFORE_NEXT_START)
}

/** Whether a new rental range overlaps an existing rental or its post-rental buffer. */
export function hasRentalPeriodConflict(
  startDate: Date | string,
  endDate: Date | string,
  existingStart: Date | string,
  existingEnd: Date | string,
): boolean {
  const start = normalizeDateOnly(startDate)
  const end = normalizeDateOnly(endDate)
  const periodStart = normalizeDateOnly(existingStart)
  const firstAvailable = firstAvailableRentalStartAfter(existingEnd)
  return start.getTime() < firstAvailable.getTime() && end.getTime() >= periodStart.getTime()
}

/** Whether a calendar day is unavailable (rental days + maintenance buffer). */
export function isDateOccupiedByRental(
  date: Date | string,
  existingStart: Date | string,
  existingEnd: Date | string,
): boolean {
  const d = normalizeDateOnly(date)
  const periodStart = normalizeDateOnly(existingStart)
  const lastBlocked = getLastBlockedDayAfterRental(existingEnd)
  return d.getTime() >= periodStart.getTime() && d.getTime() <= lastBlocked.getTime()
}

export type RentalPeriodLike = {
  startDate: Date | string
  endDate: Date | string
}

export function dedupeRentalPeriods<T extends RentalPeriodLike>(periods: T[]): T[] {
  const seen = new Set<string>()
  const unique: T[] = []
  for (const period of periods) {
    const key = `${normalizeDateOnly(period.startDate).getTime()}|${normalizeDateOnly(period.endDate).getTime()}`
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(period)
  }
  return unique
}

/** All calendar days that must be disabled for new bookings. */
export function getBlockedCalendarDates(periods: RentalPeriodLike[]): Date[] {
  const blocked: Date[] = []
  const seen = new Set<number>()

  for (const period of periods) {
    const start = normalizeDateOnly(period.startDate)
    const lastBlocked = getLastBlockedDayAfterRental(period.endDate)
    const current = new Date(start)

    while (current.getTime() <= lastBlocked.getTime()) {
      const time = current.getTime()
      if (!seen.has(time)) {
        seen.add(time)
        blocked.push(new Date(current))
      }
      current.setDate(current.getDate() + 1)
    }
  }

  return blocked
}

export function isDateBlockedByRentalPeriods(
  date: Date | string,
  periods: RentalPeriodLike[],
): boolean {
  return periods.some((period) =>
    isDateOccupiedByRental(date, period.startDate, period.endDate),
  )
}
