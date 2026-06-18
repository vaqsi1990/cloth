import { prisma } from '@/lib/prisma'
import { getCartItemPayablePrice, type RentalCartDiscountContext } from '@/lib/cart-item-pricing'
import {
  cartProductPricingSelect,
  resolveCartItemBuyerListPrice,
} from '@/lib/resolve-cart-item-price'
import { processExpiredDiscount } from '@/utils/discountUtils'

function sumCartLineItems(
  items: Array<{
    price: number
    quantity: number
    isRental: boolean | null
    rentalDays: number | null
    product: {
      discount: number | null
      discountDays: number | null
      discountStartDate: Date | null
      pricePerDay: number | null
      variants: Array<{ price: number }>
      rentalPriceTiers: Array<{ minDays: number; pricePerDay: number }>
    } | null
  }>,
): number {
  return items.reduce((sum, item) => {
    const product = item.product ? processExpiredDiscount(item.product) : null
    const productDiscount =
      product?.discount && product.discount > 0 ? product.discount : 0
    const buyerListPrice = resolveCartItemBuyerListPrice({
      storedPrice: item.price,
      isRental: item.isRental ?? false,
      rentalDays: item.rentalDays,
      product,
    })
    const rentalContext: RentalCartDiscountContext | null =
      item.isRental && item.rentalDays && item.rentalDays > 0
        ? {
            rentalDays: item.rentalDays,
            rentalPriceTiers: product?.rentalPriceTiers ?? [],
            pricePerDay: product?.pricePerDay ?? null,
          }
        : null
    const finalPrice = getCartItemPayablePrice(
      buyerListPrice,
      productDiscount,
      rentalContext,
    )
    return sum + finalPrice * item.quantity
  }, 0)
}

const cartSubtotalSelect = {
  items: {
    select: {
      id: true,
      price: true,
      quantity: true,
      isRental: true,
      rentalDays: true,
      product: {
        select: cartProductPricingSelect,
      },
    },
  },
} as const

export async function computeUserCartSubtotal(userId: string): Promise<number> {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    select: cartSubtotalSelect,
  })

  if (!cart) return 0

  return sumCartLineItems(cart.items)
}

export async function computeCartItemSubtotal(
  userId: string,
  cartItemId: number,
): Promise<number> {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    select: cartSubtotalSelect,
  })

  if (!cart) return 0

  const item = cart.items.find((entry) => entry.id === cartItemId)
  if (!item) return 0

  return sumCartLineItems([item])
}
