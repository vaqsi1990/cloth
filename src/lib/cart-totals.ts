import { prisma } from '@/lib/prisma'
import { processExpiredDiscount } from '@/utils/discountUtils'

export async function computeUserCartSubtotal(userId: string): Promise<number> {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    select: {
      items: {
        select: {
          price: true,
          quantity: true,
          product: {
            select: {
              discount: true,
              discountDays: true,
              discountStartDate: true,
            },
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
    const finalPrice = item.price - productDiscount
    return sum + finalPrice * item.quantity
  }, 0)
}
