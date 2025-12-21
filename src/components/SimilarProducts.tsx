"use client"
import React, { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Plus } from "lucide-react"
import { Product } from "@/types/product"
import StarRating from "@/components/StarRating"

interface SimilarProductsProps {
  productId: number
  categoryName?: string
}

const SimilarProducts: React.FC<SimilarProductsProps> = ({ productId, categoryName }) => {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  // Helper to get rental price from tier[0] (first tier with minimum days)
  const getRentalPrice = (product: Product): number => {
    if (!product.isRentable || !product.rentalPriceTiers || product.rentalPriceTiers.length === 0) {
      return 0
    }
    // Sort tiers by minDays to get the first tier (lowest minDays)
    const sortedTiers = [...product.rentalPriceTiers].sort((a, b) => a.minDays - b.minDays)
    const tier0 = sortedTiers[0]
    return tier0.pricePerDay * tier0.minDays
  }

  // Get display price (buy price or rental price if buy price is 0)
  const getDisplayPrice = (product: Product): number => {
    // First check if product has variants with prices
    if (product.variants && product.variants.length > 0) {
      const prices = product.variants.map(v => v.price).filter(p => p > 0)
      // If all prices are 0 or no positive prices, check rental
      if (prices.length === 0) {
        return getRentalPrice(product)
      }
      const minBuyPrice = Math.min(...prices)
      // If min buy price is 0, show rental price instead
      if (minBuyPrice === 0) {
        const rentalPrice = getRentalPrice(product)
        return rentalPrice > 0 ? rentalPrice : 0
      }
      return minBuyPrice
    }
    // If no variants, check if it's rentable
    return getRentalPrice(product)
  }

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
      
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 gap-y-16">
        {products.map((product, index) => (
          <div
            key={product.id}
            className="group bg-white rounded-xl overflow-hidden transition-shadow"
          >
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
            <div className="mt-2 space-y-2">
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
                {product.discount && product.discount > 0 ? (
                  <div className="flex items-center gap-2">
                    <span className="font-regular text-black md:text-[18px] text-[16px]">
                      ₾{(() => {
                        const originalPrice = getDisplayPrice(product)
                        const discountedPrice = originalPrice - (product.discount || 0)
                        return Math.max(0, discountedPrice).toFixed(2)
                      })()}
                    </span>
                    <span className="font-regular text-black md:text-[18px] text-[16px] line-through decoration-black" style={{ textDecorationThickness: '1px' }}>
                      ₾{getDisplayPrice(product).toFixed(2)}
                    </span>
                  </div>
                ) : (
                  <span className="font-regular text-black md:text-[18px] text-[16px]">
                    ₾{getDisplayPrice(product).toFixed(2)}
                  </span>
                )}
              </div>

              {product.discount && product.discount > 0 && (
                <div className="bg-[#1B3729] w-full md:w-[220px] rounded-md text-[#FFFFFF] font-regular flex items-center">
                  <div className='px-2 py-1 w-full md:w-[220px] text-[15px] flex flex-col md:flex-row items-center gap-2 flex-1'>
                    <span className='whitespace-nowrap'>დანაზოგი: ₾{product.discount.toFixed(2)}</span>
                    {product.discountDays && (
                      <span className="bg-white text-black px-3 py-1 rounded whitespace-nowrap">{product.discountDays} დღე</span>
                    )}
                  </div>
                </div>
              )}
              {product.stock !== undefined && (
                <p className='text-black text-[16px] font-regular'>
                  მარაგში: {product.stock}
                </p>
              )}

              <div className="flex items-center gap-2">
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
        ))}
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
