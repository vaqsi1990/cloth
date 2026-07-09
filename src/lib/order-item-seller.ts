export function resolveOrderItemSellerId(input: {
  sellerUserId: string | null
  product?: { userId: string | null } | null
}): string | null {
  return input.sellerUserId ?? input.product?.userId ?? null
}

export function isOrderItemSeller(
  sellerId: string,
  input: {
    sellerUserId: string | null
    product?: { userId: string | null } | null
  },
): boolean {
  const ownerId = resolveOrderItemSellerId(input)
  return ownerId === sellerId
}
