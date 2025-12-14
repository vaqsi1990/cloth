export interface ProductImage {
  id: number
  url: string
  alt?: string
  position: number
}

export interface ProductVariant {
  id: number
  size: string
  price: number  // required price for this variant
  sku?: string
  sizeSystem?: 'EU' | 'US' | 'UK' | 'CN'
  activeRentals?: RentalPeriod[]
  isAvailable?: boolean
}

export interface RentalPeriod {
  startDate: string
  endDate: string
  status: string
}

export interface RentalPriceTier {
  id: number
  minDays: number
  pricePerDay: number
  createdAt: string
}

export interface Category {
  id: number
  name: string
  slug: string
}

export interface User {
  id: string
  name?: string
  image?: string
}

export interface Product {
  id: number
  name: string
  slug: string
  brand?: string
  description?: string
  sku?: string
  gender: 'MEN' | 'WOMEN' | 'CHILDREN' | 'UNISEX'
  color?: string
  location?: string
  sizeSystem?: 'EU' | 'US' | 'UK' | 'CN'
  size?: string
  isNew: boolean
  discount?: number
  rating?: number
  categoryId?: number
  category?: Category
  userId?: string
  user?: User
  isRentable?: boolean
  pricePerDay?: number
  maxRentalDays?: number
  status?: 'AVAILABLE' | 'RENTED' | 'RESERVED' | 'MAINTENANCE'
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED'
  rejectionReason?: string | null
  approvedAt?: string | null
  images: ProductImage[]
  variants: ProductVariant[]
  rentalPriceTiers?: RentalPriceTier[]
  createdAt: string
  updatedAt: string
}

export interface CartItem {
  id: number
  name: string
  image: string
  price: number
  size: string
  quantity: number
  maxStock: number
  // Rental specific fields
  isRental?: boolean
  rentalStartDate?: string
  rentalEndDate?: string
  rentalDays?: number
}
