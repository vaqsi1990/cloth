export type RentalPeriod = {
  startDate: string
  endDate: string
  status: string
}

type BatchVariantStatus = {
  variantId: number
  activeRentals?: RentalPeriod[]
}

/** One API call for rental status instead of N per-product requests. */
export async function attachBatchRentalStatus<T extends { id: number; isRentable?: boolean }>(
  products: T[],
): Promise<Array<T & { rentalStatus?: Record<string, RentalPeriod[]> }>> {
  if (products.length === 0) return products

  const rentableIds = products
    .filter((p) => p.isRentable !== false)
    .map((p) => p.id)

  if (rentableIds.length === 0) return products

  try {
    const response = await fetch(
      `/api/products/rental-status?ids=${rentableIds.join(',')}`,
    )
    const data = await response.json()

    if (!data.success || !data.statuses) return products

    const statuses = data.statuses as Record<number, BatchVariantStatus[]>

    return products.map((product) => {
      const variantStatuses = statuses[product.id]
      if (!variantStatuses) return product

      const rentalStatus: Record<string, RentalPeriod[]> = {}
      for (const variant of variantStatuses) {
        rentalStatus[`variant_${variant.variantId}`] = variant.activeRentals || []
      }
      return { ...product, rentalStatus }
    })
  } catch (error) {
    console.error('Error fetching batch rental status:', error)
    return products
  }
}
