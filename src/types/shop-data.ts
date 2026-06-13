import type { ProductColorFacet } from '@/lib/product-colors'
import type { BatchRentalStatusMap } from '@/lib/product-rental-status-batch'
import type { Product } from '@/types/product'

export type ShopFacets = {
  colors: ProductColorFacet[]
  categoryCounts: Record<string, number>
  sizes: string[]
  vipCount: number
  discountCount: number
}

export type ShopPriceRange = {
  min: number
  max: number
}

export type ShopDataResponse = {
  success: boolean
  products: Product[]
  hasMore: boolean
  page: number
  limit: number
  totalCount: number | null
  totalPages: number | null
  facets: ShopFacets
  rentalStatus: BatchRentalStatusMap
  priceRange: ShopPriceRange
  timings?: {
    requestMs: number
    listMs: number | null
    cacheSource: string | null
    bundled: boolean
  }
  message?: string
}
