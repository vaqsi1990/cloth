import { DeliverySpeed } from '@prisma/client'

export type DeliveryType = 'pickup' | 'delivery'
export type DeliverySpeedOption = 'extra' | 'standard'

export const DELIVERY_SPEED_OPTIONS = [
  {
    value: 'extra' as const,
    prismaValue: DeliverySpeed.EXTRA,
    label: 'ექსტრა',
    days: 1,
    daysLabel: '1 დღის ვადაში',
  },
  {
    value: 'standard' as const,
    prismaValue: DeliverySpeed.STANDARD,
    label: 'სტანდარტული',
    days: 5,
    daysLabel: '5 დღის ვადაში',
  },
] as const

export function toPrismaDeliverySpeed(
  speed: DeliverySpeedOption | null | undefined,
): DeliverySpeed | null {
  if (!speed) return null
  return speed === 'extra' ? DeliverySpeed.EXTRA : DeliverySpeed.STANDARD
}

export function fromPrismaDeliverySpeed(
  speed: DeliverySpeed | null | undefined,
): DeliverySpeedOption | null {
  if (!speed) return null
  return speed === DeliverySpeed.EXTRA ? 'extra' : 'standard'
}

export function getDeliveryPriceForCity(
  city: { extraPrice: number; standardPrice: number },
  speed: DeliverySpeedOption,
): number {
  return speed === 'extra' ? city.extraPrice : city.standardPrice
}

export function getDeliverySpeedLabel(speed: DeliverySpeedOption): string {
  const option = DELIVERY_SPEED_OPTIONS.find((item) => item.value === speed)
  return option ? `${option.label} (${option.daysLabel})` : ''
}
