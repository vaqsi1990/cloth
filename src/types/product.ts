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
  price?: number
  sku?: string
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
  currentPrice: number
  originalPrice?: number
  sku?: string
  isNew: boolean
  hasSale: boolean
  rating?: number
  categoryId?: number
  category?: Category
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
