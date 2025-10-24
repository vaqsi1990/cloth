"use client"
import React, { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Product } from "@/types/product"

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {products.map((product) => {
          const firstImage = product.images?.[0]?.url || "/placeholder.jpg"
          const firstVariant = product.variants?.[0]
          const price = firstVariant?.price || 0
          
          return (
            <Link
              key={product.id}
              href={`/product/${product.id}`}
              className="group block"
            >
               <div className="relative aspect-[2/3] bg-gray-100 rounded-xl overflow-hidden mb-3">
                <Image
                  src={firstImage}
                  alt={product.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                
                {/* Badges */}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  {product.hasSale && (
                    <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
                      ფასდაკლება
                    </span>
                  )}
                  {product.isNew && (
                    <span className="bg-black text-white px-2 py-1 rounded-full text-xs font-semibold">
                      ახალი
                    </span>
                  )}
                </div>
              </div>
              
              <div className="space-y-1">
                <h3 className="font-semibold text-gray-900 group-hover:text-gray-700 transition-colors line-clamp-2">
                  {product.name}
                </h3>
                
                {/* Author */}
                {product.user && (
                  <p className="text-sm text-gray-600">
                    {product.user.name}
                  </p>
                )}
                
                {/* Price */}
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900">
                    ₾{price.toFixed(2)}
                  </span>
                  {product.isRentable && (
                    <span className="text-xs text-emerald-600 bg-emerald-100 px-2 py-1 rounded">
                      ქირაობა
                    </span>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
      
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
