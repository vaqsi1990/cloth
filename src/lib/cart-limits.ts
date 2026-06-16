export const MAX_CART_ITEMS = 20
export const MAX_CART_ITEM_QUANTITY = 1
export const MAX_CHECKOUT_ITEMS = 1

export const CART_LIMIT_MESSAGE =
  `კალათაში მაქსიმუმ ${MAX_CART_ITEMS} ნივთის დამატებაა შესაძლებელი`

export const CHECKOUT_SINGLE_ITEM_MESSAGE =
  'ერთდროულად მხოლოდ ერთი ნივთის გადახდაა შესაძლებელი'

/** @deprecated use CART_LIMIT_MESSAGE */
export const CART_SINGLE_ITEM_MESSAGE = CART_LIMIT_MESSAGE
