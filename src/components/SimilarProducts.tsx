"use client"
import React, { useEffect, useState } from "react"
import Image from "@/component/AppImage"
import Link from "next/link"
import { Plus } from "lucide-react"
import { Product } from "@/types/product"
import StarRating from "@/components/StarRating"
import ProductListPrice from '@/components/ProductListPrice'
import ProductListDiscountBadge from '@/components/ProductListDiscountBadge'
import ProductMasonryGrid from '@/components/ProductMasonryGrid'

interface SimilarProductsProps {
  productId: number
  categoryName?: string
}

const SimilarProducts: React.FC<SimilarProductsProps> = ({ productId, categoryName }) => {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSimilarProducts = async () => {
      try {
        const response = await fetch(`/api/products/${productId}/similar`)
        const data = await response.json()
        
        if (data.success) {
          setProducts(data.products)
        }
      } catch (error) {
        console.error("Error fetching similar products:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchSimilarProducts()
  }, [productId])

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">მსგავსი პროდუქტები</h2>
        <div className="flex items-start gap-4 lg:hidden">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            {[0, 2].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[2/3] bg-gray-200 rounded-xl mb-3"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            {[1, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[2/3] bg-gray-200 rounded-xl mb-3"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
        <div className="hidden gap-4 lg:grid lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
               <div className="aspect-[2/3] bg-gray-200 rounded-xl mb-3"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (products.length === 0) {
    return null
  }

  return (
    <div className="bg-white rounded-2xl p-6">
      <h2 className="md:text-[20px] text-[18px] font-bold text-bold text-center mb-6">
        მსგავსი პროდუქტები
   
      </h2>
      
      <ProductMasonryGrid
        items={products}
        getKey={(product) => product.id}
        renderItem={(product, index) => (
          <div className="group bg-white rounded-xl overflow-hidden transition-shadow flex flex-col lg:h-full">
            <div className="rounded-xl overflow-hidden">
              <div className="relative w-full h-[273px] bg-gray-100 overflow-hidden">
                <Image
                  src={product.images?.[0]?.url || "/placeholder.jpg"}
                  alt={product.name}
                  fill
                  className="object-cover transition-transform duration-300"
                  loading={index < 4 ? "eager" : "lazy"}
                  priority={index < 4}
                />
              </div>
            </div>
            <div className="mt-2 space-y-2 flex flex-col flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="font-regular text-black md:text-[18px] text-[16px] leading-snug line-clamp-2">
                  {product.name}
                </h3>
                <Link
                  href={`/product/${product.id}`}
                  className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center hover:bg-gray-800 transition"
                  aria-label="დეტალები"
                >
                  <Plus className="w-5 h-5" />
                </Link>
              </div>
              <div className="flex items-center justify-between gap-2">
                <ProductListPrice product={product} />
              </div>

              <ProductListDiscountBadge
                discount={product.discount ?? 0}
                discountDays={product.discountDays}
              />
              {product.stock !== undefined && (
                  <p className='text-black text-[16px] font-regular'>
                    მარაგში: {product.stock}
                  </p>
              )}

              <div className="flex items-center gap-2 lg:mt-auto">
                <StarRating
                  rating={product.rating && product.rating > 0 ? Math.round(product.rating) : 0}
                  readonly
                  size="sm"
                  color={product.rating && product.rating > 0 ? 'green' : 'silver'}
                />
                {product.rating && product.rating > 0 && (
                  <span className="text-black text-[14px] font-regular">
                    {product.rating.toFixed(1)}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      />
      
      {/* View more button */}
      {products.length >= 8 && (
        <div className="text-center mt-6">
          <Link
            href="/shop"
            className="inline-flex items-center px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors"
          >
            ყველა პროდუქტის ნახვა
          </Link>
        </div>
      )}
    </div>
  )
}

export default SimilarProducts
