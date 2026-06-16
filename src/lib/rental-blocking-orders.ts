/** Order statuses that block rental dates on the calendar (paid checkout only). */
export const RENTAL_BLOCKING_ORDER_STATUSES = ['PAID', 'SHIPPED'] as const

export type RentalBlockingOrderStatus =
  (typeof RENTAL_BLOCKING_ORDER_STATUSES)[number]
