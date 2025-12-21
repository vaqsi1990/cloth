"use client"
import React, { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, User, ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { Product } from "@/types/product"
import StarRating from "@/components/StarRating"

const AuthorPage = () => {
    const params = useParams()
    const router = useRouter()
    const authorId = params.id as string

    const [author, setAuthor] = useState<{ id: string; name?: string; image?: string } | null>(null)
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage] = useState(20)

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
        const fetchData = async () => {
            try {
                const response = await fetch(`/api/author/${authorId}/products`)
                const data = await response.json()

                if (data?.success) {
                    setProducts(data.products || [])
                    setAuthor(data.author || { id: authorId, name: "უცნობი ავტორი" })
                } else {
                    setAuthor({ id: authorId, name: "უცნობი ავტორი" })
                }
            } catch (e) {
                console.error('Error fetching author data:', e)
                setAuthor({ id: authorId, name: "უცნობი ავტორი" })
            } finally {
                setLoading(false)
            }
        }
        if (authorId) fetchData()
    }, [authorId])

    // Pagination calculations
    const totalPages = Math.ceil(products.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const currentProducts = products.slice(startIndex, endIndex)

    // Reset to page 1 when products change
    useEffect(() => {
        setCurrentPage(1)
    }, [products.length])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-black">იტვირთება...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen">
            {/* Header */}
            <header className=" top-0 z-30 ">
                <div className="max-w-[1200px] mx-auto px-4 py-4">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="flex md:text-[20px] text-[18px] items-center text-black hover:opacity-80"
                    >
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        უკან დაბრუნება
                    </button>
                </div>
            </header>

            <main className="max-w-[1200px] mx-auto px-4 py-10">
                {/* Author Info */}
                <div className="bg-white rounded-2xl p-8 shadow-sm mb-8">
                    <div className="flex items-center space-x-6">
                        <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gray-200">
                            {author?.image ? (
                                <Image
                                    src={author.image}
                                    alt={author.name || "ავტორი"}
                                    fill
                                    sizes="(max-width: 768px) 150px, 200px"
                                    className="object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-300 text-black font-semibold text-2xl">
                                    {author?.name ? author.name.charAt(0).toUpperCase() : "?"}
                                </div>
                            )}
                        </div>
                        <div>
                            <h1 className=" font-bold text-black md:text-[18px] text-[16px] mb-2">
                                {author?.name || "უცნობი ავტორი"}
                            </h1>
                            <p className="text-black">
                                {products.length} პროდუქტი
                            </p>
                           
                        </div>
                    </div>
                </div>

                {/* Products Grid */}
                {currentProducts.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 gap-y-16 mb-8">
                                {currentProducts.map((product, index) => (
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
                                                <div className="bg-[#1B3729]  w-full md:w-[220px] rounded-md text-[#FFFFFF] font-regular flex items-center">

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
                        ) : (
                            <div className="text-center py-16">
                                <h3 className="text-xl font-semibold text-black md:text-[20px] text-[16px] mb-2">
                                    პროდუქტები ვერ მოიძებნა
                                </h3>
                                <p className="text-black">
                                    სცადეთ სხვა ფილტრები
                                </p>
                            </div>
                        )}

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex flex-col items-center justify-center gap-4 mt-8">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className={`px-4 py-2 rounded-lg border transition-colors md:text-[18px] text-[16px] flex items-center gap-2 ${
                                            currentPage === 1
                                                ? 'bg-gray-100 text-black cursor-not-allowed border-gray-300'
                                                : 'bg-white text-black border-gray-300 hover:bg-gray-50 hover:border-black'
                                        }`}
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                        წინა
                                    </button>

                                    <div className="flex items-center gap-1">
                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                                            // Show first page, last page, current page, and pages around current
                                            if (
                                                page === 1 ||
                                                page === totalPages ||
                                                (page >= currentPage - 1 && page <= currentPage + 1)
                                            ) {
                                                return (
                                                    <button
                                                        key={page}
                                                        onClick={() => setCurrentPage(page)}
                                                        className={`px-4 py-2 rounded-lg border transition-colors md:text-[18px] text-[16px] ${
                                                            currentPage === page
                                                                ? 'bg-black text-white border-black'
                                                                : 'bg-white text-black border-gray-300 hover:bg-gray-50 hover:border-black'
                                                        }`}
                                                    >
                                                        {page}
                                                    </button>
                                                )
                                            } else if (
                                                page === currentPage - 2 ||
                                                page === currentPage + 2
                                            ) {
                                                return (
                                                    <span key={page} className="px-2 text-black">
                                                        ...
                                                    </span>
                                                )
                                            }
                                            return null
                                        })}
                                    </div>

                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages}
                                        className={`px-4 py-2 rounded-lg border transition-colors md:text-[18px] text-[16px] flex items-center gap-2 ${
                                            currentPage === totalPages
                                                ? 'bg-gray-100 text-black cursor-not-allowed border-gray-300'
                                                : 'bg-white text-black border-gray-300 hover:bg-gray-50 hover:border-black'
                                        }`}
                                    >
                                        შემდეგი
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>

                                <p className="text-black md:text-[16px] text-[14px]">
                                    გვერდი {currentPage} {totalPages}-დან
                                </p>
                            </div>
                        )}
            </main>
        </div>
    )
}

export default AuthorPage
