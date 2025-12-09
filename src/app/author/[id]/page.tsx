"use client"
import React, { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, User, ChevronLeft, ChevronRight } from "lucide-react"
import { Product } from "@/types/product"

const AuthorPage = () => {
    const params = useParams()
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
                    console.log('API Response:', data)
                    console.log('Products count:', data.products?.length || 0)
                    setProducts(data.products || [])
                    setAuthor(data.author || { id: authorId, name: "უცნობი ავტორი" })
                } else {
                    console.log('API Error:', data)
                    setAuthor({ id: authorId, name: "უცნობი ავტორი" })
                }
            } catch (e) {
                console.error(e)
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
                    <Link href="/" className="flex md:text-[20px] text-[18px] items-center text-black hover:opacity-80">
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        უკან დაბრუნება
                    </Link>
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                                {currentProducts.map((product) => (
                                    <div
                                        key={product.id}

                                        className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                                    >
                                        <div className="relative aspect-[3/4] bg-gray-100">
                                            <Image
                                                src={product.images?.[0]?.url || "/placeholder.jpg"}
                                                alt={product.name}
                                                fill
                                                className="object-cover  transition-transform duration-300"
                                            />
                                            <div className="absolute top-4 left-4 flex gap-2">
                                                {product.discount && product.discount > 0 && (
                                                    <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                                                        -{product.discount}%
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="p-4">
                                            <h3 className="font-semibold text-black md:text-[20px] text-[16px] mb-2 line-clamp-2">
                                                {product.name}
                                            </h3>
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-black md:text-[18px] text-[16px]">
                                                    ₾{getDisplayPrice(product).toFixed(2)}
                                                </span>

                                            </div>
                                            <Link href={`/product/${product.id}`} className="block w-full md:w-[200px]  mt-3 bg-[#1B3729] md:text-[18px] text-[16px] text-white text-center py-2 rounded-lg font-bold transition-colors duration-300">დეტალები</Link>
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
