/** Shared Prisma select for owner/author product listings. */
export const ownerProductListSelect = {
  id: true,
  name: true,
  slug: true,
  brand: true,
  description: true,
  sku: true,
  stock: true,
  gender: true,
  color: true,
  location: true,
  sizeSystem: true,
  size: true,
  isNew: true,
  isSecondHand: true,
  discount: true,
  discountDays: true,
  discountStartDate: true,
  rating: true,
  categoryId: true,
  purposeId: true,
  userId: true,
  isRentable: true,
  pricePerDay: true,
  maxRentalDays: true,
  status: true,
  approvalStatus: true,
  createdAt: true,
  updatedAt: true,
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  purpose: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  images: {
    select: {
      id: true,
      url: true,
      alt: true,
      position: true,
    },
    orderBy: { position: 'asc' as const },
  },
  variants: {
    select: {
      id: true,
      price: true,
    },
  },
  rentalPriceTiers: {
    select: {
      id: true,
      minDays: true,
      pricePerDay: true,
    },
    orderBy: { minDays: 'asc' as const },
  },
} as const

export function parseListPagination(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const limit = Math.min(
    Math.max(parseInt(searchParams.get('limit') || '50', 10) || 50, 1),
    100,
  )
  return { page, limit, skip: (page - 1) * limit }
}
