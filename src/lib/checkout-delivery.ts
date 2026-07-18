import type { DeliverySpeedOption } from '@/lib/delivery'
import { fromPrismaDeliverySpeed, getDeliveryPriceForCity } from '@/lib/delivery'
import { prisma } from '@/lib/prisma'

export type ResolvedCheckoutDelivery = {
  deliveryType: 'pickup' | 'delivery'
  deliveryCityId: number | null
  deliverySpeed: DeliverySpeedOption | null
  deliveryPrice: number | null
  deliveryFee: number
  deliveryCityName: string | null
}

export async function resolveServerCheckoutDelivery(params: {
  userId: string
  productAllowsPickup: boolean
  requestedDeliveryType?: 'pickup' | 'delivery' | null
  requestedCityId?: number | null
  requestedSpeed?: DeliverySpeedOption | null
}): Promise<ResolvedCheckoutDelivery | { error: string }> {
  const cart = await prisma.cart.findUnique({
    where: { userId: params.userId },
    select: {
      deliveryType: true,
      deliveryCityId: true,
      deliverySpeed: true,
    },
  })

  let deliveryType =
    params.requestedDeliveryType ??
    (cart?.deliveryType as 'pickup' | 'delivery' | null) ??
    'pickup'

  if (!params.productAllowsPickup) {
    deliveryType = 'delivery'
  }

  if (deliveryType === 'pickup') {
    return {
      deliveryType: 'pickup',
      deliveryCityId: null,
      deliverySpeed: null,
      deliveryPrice: null,
      deliveryFee: 0,
      deliveryCityName: null,
    }
  }

  const cityId = params.requestedCityId ?? cart?.deliveryCityId ?? null
  const speed =
    params.requestedSpeed ??
    fromPrismaDeliverySpeed(cart?.deliverySpeed) ??
    'standard'

  if (!cityId) {
    return { error: 'აირჩიეთ მიტანის ქალაქი' }
  }

  const city = await prisma.deliveryCity.findUnique({
    where: { id: cityId },
    select: {
      id: true,
      name: true,
      extraPrice: true,
      standardPrice: true,
    },
  })

  if (!city) {
    return { error: 'მიტანის ქალაქი ვერ მოიძებნა' }
  }

  const catalogPrice = getDeliveryPriceForCity(city, speed)

  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { freeDelivery: true },
  })
  const deliveryPrice = user?.freeDelivery ? 0 : catalogPrice

  return {
    deliveryType: 'delivery',
    deliveryCityId: city.id,
    deliverySpeed: speed,
    deliveryPrice,
    deliveryFee: deliveryPrice,
    deliveryCityName: city.name,
  }
}
