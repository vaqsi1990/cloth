import { z } from 'zod'
import { isValidPersonAddress, PERSON_ADDRESS_FIELD_ERROR } from '@/lib/personal-text'

export const PRODUCT_PICKUP_ADDRESS_REQUIRED =
  'ადგილიდან გატანისთვის ზუსტი მისამართი აუცილებელია'

export const productPickupAddressField = z.preprocess(
  (val) => (val === '' || val === null ? undefined : val),
  z.string().optional(),
)

export function refineProductPickupAddress(
  data: { allowsPickup: boolean; pickupAddress?: string },
  ctx: z.RefinementCtx,
) {
  if (!data.allowsPickup) {
    return
  }

  const address = data.pickupAddress?.trim()
  if (!address || address.length < 2) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: PRODUCT_PICKUP_ADDRESS_REQUIRED,
      path: ['pickupAddress'],
    })
    return
  }

  if (!isValidPersonAddress(address)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: PERSON_ADDRESS_FIELD_ERROR,
      path: ['pickupAddress'],
    })
  }
}

export function resolveCartPickupAddress(
  addresses: Array<string | null | undefined>,
): string {
  const unique = [
    ...new Set(
      addresses
        .map((address) => address?.trim())
        .filter((address): address is string => Boolean(address)),
    ),
  ]

  if (unique.length === 0) {
    return ''
  }

  return unique.length === 1 ? unique[0] : unique.join('; ')
}
