import { prisma } from '@/lib/prisma'
import {
  cartPricesDiffer,
  resolveCartItemBuyerListPrice,
  type CartPricingProduct,
} from '@/lib/resolve-cart-item-price'

type CartItemForPricing = {
  id: number
  price: number
  isRental: boolean | null
  rentalDays: number | null
  product: CartPricingProduct | null
}

export function resolveCartItemsBuyerListPrices(
  items: CartItemForPricing[],
): Array<{ id: number; storedPrice: number; buyerListPrice: number }> {
  return items.map((item) => {
    const buyerListPrice = resolveCartItemBuyerListPrice({
      storedPrice: item.price,
      isRental: item.isRental ?? false,
      rentalDays: item.rentalDays,
      product: item.product,
    })

    return {
      id: item.id,
      storedPrice: item.price,
      buyerListPrice,
    }
  })
}

export async function syncCartItemBuyerListPrices(
  items: Array<{ id: number; storedPrice: number; buyerListPrice: number }>,
): Promise<void> {
  const stale = items.filter((item) =>
    cartPricesDiffer(item.storedPrice, item.buyerListPrice),
  )

  if (stale.length === 0) return

  await Promise.all(
    stale.map((item) =>
      prisma.cartItem.update({
        where: { id: item.id },
        data: { price: item.buyerListPrice },
      }),
    ),
  )
}
