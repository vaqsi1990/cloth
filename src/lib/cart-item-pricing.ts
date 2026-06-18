import { getDiscountedPrice } from '@/lib/discount-helpers'
import {
  applyRentalDiscountToSellerTotal,
  type RentalPriceTierLike,
} from '@/lib/rental-inquiry'
import { getBuyerPrice, getSellerPriceFromBuyer } from '@/lib/platform-pricing'

export type RentalCartDiscountContext = {
  rentalDays: number
  rentalPriceTiers: RentalPriceTierLike[]
  pricePerDay?: number | null
}

export function getRentalCartDiscountContext(item: {
  isRental?: boolean | null
  rentalDays?: number | null
  product?: {
    rentalPriceTiers?: RentalPriceTierLike[] | null
    pricePerDay?: number | null
  } | null
}): RentalCartDiscountContext | null {
  if (!item.isRental || !item.rentalDays || item.rentalDays <= 0) {
    return null
  }

  return {
    rentalDays: item.rentalDays,
    rentalPriceTiers: item.product?.rentalPriceTiers ?? [],
    pricePerDay: item.product?.pricePerDay ?? null,
  }
}

/** Cart stores undiscounted buyer list price per item. */
export function getCartItemPayablePrice(
  storedBuyerListPrice: number,
  sellerDiscount: number,
  rentalContext?: RentalCartDiscountContext | null,
): number {
  const sellerPrice = getSellerPriceFromBuyer(storedBuyerListPrice)
  const sellerAfterDiscount =
    rentalContext && rentalContext.rentalDays > 0 && sellerDiscount > 0
      ? applyRentalDiscountToSellerTotal(
          sellerPrice,
          rentalContext.rentalDays,
          rentalContext.rentalPriceTiers,
          sellerDiscount,
          rentalContext.pricePerDay,
        )
      : getDiscountedPrice(sellerPrice, sellerDiscount)
  return getBuyerPrice(sellerAfterDiscount)
}

export function getCartItemBuyerSavings(
  storedBuyerListPrice: number,
  sellerDiscount: number,
  rentalContext?: RentalCartDiscountContext | null,
): number {
  const listPrice = storedBuyerListPrice
  const payable = getCartItemPayablePrice(
    storedBuyerListPrice,
    sellerDiscount,
    rentalContext,
  )
  return Math.max(0, roundMoney(listPrice - payable))
}

function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100
}
