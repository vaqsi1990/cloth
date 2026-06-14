import { getDiscountedPrice } from '@/lib/discount-helpers'
import { getBuyerPrice, getSellerPriceFromBuyer } from '@/lib/platform-pricing'

/** Cart stores undiscounted buyer list price per item. */
export function getCartItemPayablePrice(
  storedBuyerListPrice: number,
  sellerDiscount: number,
): number {
  const sellerPrice = getSellerPriceFromBuyer(storedBuyerListPrice)
  const sellerAfterDiscount = getDiscountedPrice(sellerPrice, sellerDiscount)
  return getBuyerPrice(sellerAfterDiscount)
}

export function getCartItemBuyerSavings(
  storedBuyerListPrice: number,
  sellerDiscount: number,
): number {
  const listPrice = storedBuyerListPrice
  const payable = getCartItemPayablePrice(storedBuyerListPrice, sellerDiscount)
  return Math.max(0, roundMoney(listPrice - payable))
}

function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100
}
