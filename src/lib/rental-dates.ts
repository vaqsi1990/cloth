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

/**
 * Minimum rental endDate (inclusive) to include when loading periods that still
 * block the calendar on the reference day (accounts for post-rental maintenance).
 */
export function minRentalEndDateStillBlocking(referenceDate: Date | string = new Date()): Date {
  return addDaysToDateOnly(referenceDate, -RENTAL_MAINTENANCE_DAYS_AFTER_END)
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

/** Self-serve calendar: only the next N calendar days (inclusive of today). */
export const RENTAL_CALENDAR_WINDOW_DAYS = 10

/** Max rental length when booking through the calendar. */
export const MAX_RENTAL_PERIOD_DAYS = 10

export const RENTAL_CALENDAR_LIMIT_MESSAGE =
  'კალენდრიდან ქირაობა მხოლოდ შემდეგ 10 დღეშია შესაძლებელი. გრძელი ვადისთვის დაუკავშირდით მიმწოდებელს ჩატში.'

export function rentalPeriodLimitMessage(maxDays = MAX_RENTAL_PERIOD_DAYS): string {
  return `ქირაობის პერიოდი კალენდრიდან მაქსიმუმ ${maxDays} დღეა. გრძელი ვადისთვის დაუკავშირდით მიმწოდებელს ჩატში.`
}

export function getRentalCalendarMinStartDate(from?: Date): Date {
  return normalizeDateOnly(from ?? new Date())
}

/** Last selectable calendar day in the self-serve booking window. */
export function getRentalCalendarMaxSelectableDate(from?: Date): Date {
  const base = getRentalCalendarMinStartDate(from)
  const max = new Date(base)
  max.setDate(max.getDate() + RENTAL_CALENDAR_WINDOW_DAYS - 1)
  return max
}

export function isDateInRentalCalendarWindow(
  date: Date | string,
  from?: Date,
): boolean {
  const d = normalizeDateOnly(date)
  const min = getRentalCalendarMinStartDate(from)
  const max = getRentalCalendarMaxSelectableDate(from)
  return d.getTime() >= min.getTime() && d.getTime() <= max.getTime()
}

export function getRentalCalendarMaxEndDate(
  startDate: Date | string,
  from?: Date,
): Date {
  const start = normalizeDateOnly(startDate)
  const windowEnd = getRentalCalendarMaxSelectableDate(from)
  const periodEnd = new Date(start)
  periodEnd.setDate(periodEnd.getDate() + MAX_RENTAL_PERIOD_DAYS - 1)
  return periodEnd.getTime() <= windowEnd.getTime() ? periodEnd : windowEnd
}

export function validateSelfServeRentalDates(
  startDate: Date | string,
  endDate: Date | string,
  from?: Date,
): { ok: true } | { ok: false; message: string } {
  const start = normalizeDateOnly(startDate)
  const end = normalizeDateOnly(endDate)
  const min = getRentalCalendarMinStartDate(from)

  if (start.getTime() < min.getTime()) {
    return { ok: false, message: 'დაწყების თარიღი ვერ იქნება წარსულში' }
  }
  if (!isDateInRentalCalendarWindow(start, from)) {
    return { ok: false, message: RENTAL_CALENDAR_LIMIT_MESSAGE }
  }
  if (isRentalEndBeforeStart(start, end)) {
    return {
      ok: false,
      message: 'დასრულების თარიღი არ შეიძლება იყოს დაწყების წინ',
    }
  }
  if (!isDateInRentalCalendarWindow(end, from)) {
    return { ok: false, message: RENTAL_CALENDAR_LIMIT_MESSAGE }
  }
  const days = calcRentalDays(start, end)
  if (days > MAX_RENTAL_PERIOD_DAYS) {
    return { ok: false, message: rentalPeriodLimitMessage() }
  }
  return { ok: true }
}
