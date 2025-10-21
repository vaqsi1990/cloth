export interface ProductImage {
  id: number
  url: string
  alt?: string
  position: number
}

export interface ProductVariant {
  id: number
  size: string
  stock: number
  price: number  // required price for this variant
  sku?: string
  activeRentals?: RentalPeriod[]
  isAvailable?: boolean
}

export interface RentalPeriod {
  startDate: string
  endDate: string
  status: string
}

export interface Category {
  id: number
  name: string
  slug: string
}

export interface Product {
  id: number
  name: string
  slug: string
  description?: string
  sku?: string
  gender: 'MEN' | 'WOMEN' | 'CHILDREN' | 'UNISEX'
  isNew: boolean
  hasSale: boolean
  rating?: number
  categoryId?: number
  category?: Category
  isRentable?: boolean
  pricePerDay?: number
  maxRentalDays?: number
  deposit?: number
  images: ProductImage[]
  variants: ProductVariant[]
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
}
