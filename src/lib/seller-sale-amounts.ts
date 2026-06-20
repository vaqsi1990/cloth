import { getDiscountedPrice } from '@/lib/discount-helpers'
import { getSellerPriceFromBuyer } from '@/lib/platform-pricing'
import { processExpiredDiscount } from '@/lib/discount-helpers'

type ProductDiscountFields = {
  discount?: number | null
  discountDays?: number | null
  discountStartDate?: Date | string | null
}

export function computeSellerSaleLineAmount(
  buyerUnitPrice: number,
  quantity: number,
  product?: ProductDiscountFields | null,
): { sellerUnitPrice: number; sellerLineTotal: number } {
  const qty = quantity > 0 ? quantity : 1
  const processed = product ? processExpiredDiscount(product) : null
  const sellerDiscount =
    processed?.discount && processed.discount > 0 ? processed.discount : 0
  const sellerUnitPrice = getDiscountedPrice(
    getSellerPriceFromBuyer(buyerUnitPrice || 0),
    sellerDiscount,
  )
  const sellerLineTotal = sellerUnitPrice * qty

  return { sellerUnitPrice, sellerLineTotal }
}
