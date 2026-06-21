/** Order statuses that block rental dates on the calendar (incl. unpaid checkout holds). */
export const RENTAL_BLOCKING_ORDER_STATUSES = ['PENDING', 'PAID', 'SHIPPED'] as const

export type RentalBlockingOrderStatus =
  (typeof RENTAL_BLOCKING_ORDER_STATUSES)[number]
