import { prisma } from '@/lib/prisma'
import { getCartItemPayablePrice } from '@/lib/cart-item-pricing'
import {
  cartProductPricingSelect,
  resolveCartItemBuyerListPrice,
} from '@/lib/resolve-cart-item-price'
import { processExpiredDiscount } from '@/utils/discountUtils'

export async function computeUserCartSubtotal(userId: string): Promise<number> {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    select: {
      items: {
        select: {
          price: true,
          quantity: true,
          isRental: true,
          rentalDays: true,
          product: {
            select: cartProductPricingSelect,
          },
        },
      },
    },
  })

  if (!cart) return 0

  return cart.items.reduce((sum, item) => {
    const product = item.product ? processExpiredDiscount(item.product) : null
    const productDiscount =
      product?.discount && product.discount > 0 ? product.discount : 0
    const buyerListPrice = resolveCartItemBuyerListPrice({
      storedPrice: item.price,
      isRental: item.isRental ?? false,
      rentalDays: item.rentalDays,
      product,
    })
    const finalPrice = getCartItemPayablePrice(buyerListPrice, productDiscount)
    return sum + finalPrice * item.quantity
  }, 0)
}
