"use client"
import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Star, ShoppingCart, Heart, Filter, X, ChevronDown } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Product } from '@/types/product'

const ShopPageClient = () => {
    const searchParams = useSearchParams()
    const categoryParam = searchParams.get('category')
    
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [activeCategory, setActiveCategory] = useState("ALL")
    const [sortBy, setSortBy] = useState("newest")
    const [isFilterOpen, setIsFilterOpen] = useState(false)
    const [priceRange, setPriceRange] = useState([0, 200])
    const [selectedSizes, setSelectedSizes] = useState<string[]>([])
    const [selectedColors, setSelectedColors] = useState<string[]>([])

    const categories = [
        { id: "ALL", label: "ყველა" },
        { id: "კაბები", label: "კაბები" },
        { id: "ბლუზები", label: "ბლუზები" },
        { id: "შარვლები", label: "შარვლები" },
        { id: "ზედა ტანსაცმელი", label: "ზედა ტანსაცმელი" },
        { id: "აქსესუარები", label: "აქსესუარები" }
    ]

    const sizes = [
        { id: "XS", label: "XS" },
        { id: "S", label: "S" },
        { id: "M", label: "M" },
        { id: "L", label: "L" },
        { id: "XL", label: "XL" },
        { id: "XXL", label: "XXL" }
    ]

    const colors = [
        { id: "black", label: "შავი", color: "#000000" },
        { id: "white", label: "თეთრი", color: "#FFFFFF" },
        { id: "red", label: "წითელი", color: "#FF0000" },
        { id: "blue", label: "ლურჯი", color: "#0000FF" },
        { id: "green", label: "მწვანე", color: "#008000" },
        { id: "yellow", label: "ყვითელი", color: "#FFFF00" },
        { id: "pink", label: "ვარდისფერი", color: "#FFC0CB" },
        { id: "purple", label: "იისფერი", color: "#800080" }
    ]

    // Fetch products from API
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await fetch('/api/products')
                const data = await response.json()
                if (data.success) {
                    setProducts(data.products)
                }
            } catch (error) {
                console.error('Error fetching products:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchProducts()
    }, [])

    // Get category title and description
    const getCategoryInfo = (category: string) => {
        switch (category) {
            case 'women':
                return {
                    title: "ქალის",
                    description: "აღმოაჩინეთ ულამაზესი ქალის ტანსაცმელი"
                }
            case 'men':
                return {
                    title: "მამაკაცის",
                    description: "აღმოაჩინეთ მამაკაცის ტანსაცმელი"
                }
            case 'kids':
                return {
                    title: "ბავშვის",
                    description: "აღმოაჩინეთ ბავშვის ტანსაცმელი"
                }
            default:
                return {
                    title: "მაღაზია",
                    description: ""
                }
        }
    }

    // Map URL category to database category names
    const getCategoryFilter = (categoryParam: string | null) => {
        if (!categoryParam) return null
        
        switch (categoryParam) {
            case 'women':
                // Women's categories: dresses, tops, bottoms, outerwear, accessories
                return ['კაბები', 'ბლუზები', 'შარვლები', 'ზედა ტანსაცმელი', 'აქსესუარები']
            case 'men':
                // Men's categories: tops, bottoms, outerwear, accessories (no dresses)
                return ['ბლუზები', 'შარვლები', 'ზედა ტანსაცმელი', 'აქსესუარები']
            case 'kids':
                // Kids' categories: all categories
                return ['კაბები', 'ბლუზები', 'შარვლები', 'ზედა ტანსაცმელი', 'აქსესუარები']
            default:
                return null
        }
    }

    const categoryInfo = getCategoryInfo(categoryParam || '')

    // Filter products by all criteria
    const filteredProducts = products.filter(product => {
        // URL Category filter (from ?category=women/men/kids)
        const categoryFilter = getCategoryFilter(categoryParam)
        const urlCategoryMatch = !categoryFilter || categoryFilter.includes(product.category?.name || '')
        
        // Debug logging (only for first few products to avoid spam)
        if (categoryParam && products.indexOf(product) < 3) {
            console.log('Product:', product.name, 'Category:', product.category?.name, 'Match:', urlCategoryMatch)
        }
        
        // Active Category filter (from sidebar)
        const activeCategoryMatch = activeCategory === "ALL" || product.category?.name === activeCategory
        
        // Price filter
        const priceMatch = product.currentPrice >= priceRange[0] && product.currentPrice <= priceRange[1]
        
        // Size filter
        const sizeMatch = selectedSizes.length === 0 || 
            product.variants.some(variant => selectedSizes.includes(variant.size))
        
        // Color filter (skip for now as we don't have colors in database)
        const colorMatch = selectedColors.length === 0
        
        return urlCategoryMatch && activeCategoryMatch && priceMatch && sizeMatch && colorMatch
    })

    // Debug: Log filtering results
    console.log('Total products:', products.length)
    console.log('Filtered products:', filteredProducts.length)
    console.log('Category param:', categoryParam)

    // Sort products
    const sortedProducts = [...filteredProducts].sort((a, b) => {
        switch (sortBy) {
            case "price-low":
                return a.currentPrice - b.currentPrice
            case "price-high":
                return b.currentPrice - a.currentPrice
            case "rating":
                return (b.rating || 0) - (a.rating || 0)
            case "newest":
            default:
                return b.isNew ? 1 : -1
        }
    })

    // Handle size selection
    const toggleSize = (size: string) => {
        setSelectedSizes(prev => 
            prev.includes(size) 
                ? prev.filter(s => s !== size)
                : [...prev, size]
        )
    }

    // Handle color selection
    const toggleColor = (color: string) => {
        setSelectedColors(prev => 
            prev.includes(color) 
                ? prev.filter(c => c !== color)
                : [...prev, color]
        )
    }

    // Clear all filters
    const clearFilters = () => {
        setActiveCategory("ALL")
        setPriceRange([0, 200])
        setSelectedSizes([])
        setSelectedColors([])
    }

    // Get main product image
    const getMainImage = (product: Product) => {
        if (product.images && product.images.length > 0) {
            return product.images[0].url
        }
        return '/placeholder.jpg'
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-black mb-4">იტვირთება...</h1>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50">
            {/* Header */}
            {categoryParam && (
                <div className="bg-white shadow-sm border-b">
                    <div className="container mx-auto px-4 py-6">
                        <h1 className="md:text-[18px] text-[16px] font-bold text-black">
                            {categoryInfo.title} <span className="text-black">ტანსაცმელი</span>
                        </h1>
                        {categoryInfo.description && (
                            <p className="md:text-[18px] text-[16px] text-black mt-2">{categoryInfo.description}</p>
                        )}
                    </div>
                </div>
            )}

            <div className="container mx-auto px-4 py-8">
                {/* Mobile Filter Toggle */}
                <div className="lg:hidden mb-6">
                    <button
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className="flex items-center space-x-2 bg-white px-4 py-3 rounded-lg shadow-sm border w-full justify-between"
                    >
                        <div className="flex items-center space-x-2">
                            <Filter className="w-5 h-5 text-black" />
                            <span className="font-medium text-black">ფილტრები</span>
                        </div>
                        {isFilterOpen ? (
                            <X className="w-5 h-5 text-black" />
                        ) : (
                            <ChevronDown className="w-5 h-5 text-black" />
                        )}
                    </button>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Sidebar Filters */}
                    <div className={`lg:w-80 ${isFilterOpen ? 'block' : 'hidden lg:block'}`}>
                        <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24">
                            {/* Filter Header */}
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-semibold text-gray-900">ფილტრები</h3>
                                <button
                                    onClick={clearFilters}
                                    className="text-sm text-black hover:text-black font-medium"
                                >
                                    გაწმენდა
                                </button>
                            </div>

                            {/* Category Filters */}
                            <div className="mb-6">
                                <h4 className="font-medium text-gray-900 mb-3">კატეგორია</h4>
                                <div className="space-y-2">
                                    {categories.map((category) => (
                                        <button
                                            key={category.id}
                                            onClick={() => setActiveCategory(category.id)}
                                            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                                                activeCategory === category.id
                                                    ? "bg-black text-white"
                                                    : "text-gray-600 hover:bg-gray-100"
                                            }`}
                                        >
                                            {category.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Price Range */}
                            <div className="mb-6">
                                <h4 className="font-medium text-gray-900 mb-3">ფასის დიაპაზონი</h4>
                                <div className="space-y-3">
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="range"
                                            min="0"
                                            max="200"
                                            value={priceRange[1]}
                                            onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between text-sm text-gray-600">
                                        <span>₾{priceRange[0]}</span>
                                        <span>₾{priceRange[1]}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Size Filter */}
                            <div className="mb-6">
                                <h4 className="font-medium text-gray-900 mb-3">ზომა</h4>
                                <div className="grid grid-cols-3 gap-2">
                                    {sizes.map((size) => (
                                        <button
                                            key={size.id}
                                            onClick={() => toggleSize(size.id)}
                                            className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                                                selectedSizes.includes(size.id)
                                                    ? "bg-black text-white border-black"
                                                    : "bg-white text-gray-700 border-gray-300 hover:border-black"
                                            }`}
                                        >
                                            {size.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                          
                            {/* Results Count */}
                            <div className="pt-4 border-t border-gray-200">
                                <p className="md:text-[18px] text-[16px] text-black">
                                    ნაპოვნია {sortedProducts.length} პროდუქტი
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1">
                        {/* Top Bar with Sorting */}
                        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
                                <div className="flex items-center space-x-2">
                                    <span className="md:text-[18px] text-[16px] text-black">დალაგება:</span>
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value)}
                                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
                                    >
                                        <option value="newest">ახალი</option>
                                        <option value="price-low">ფასი: დაბლიდან მაღლა</option>
                                        <option value="price-high">ფასი: მაღლიდან დაბლა</option>
                                        <option value="rating">რეიტინგი</option>
                                    </select>
                                </div>
                                
                                <div className="md:text-[18px] text-[16px] text-black">
                                    ნაპოვნია {sortedProducts.length} პროდუქტი
                                </div>
                            </div>
                        </div>

                        {/* Products Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {sortedProducts.map((product) => (
                                <div
                                    key={product.id}
                                    className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 group"
                                >
                                    {/* Product Image */}
                                    <div className="relative aspect-square overflow-hidden rounded-t-lg bg-white">
                                        <Image
                                            src={getMainImage(product)}
                                            alt={product.name}
                                            fill
                                            className="object-cover group-hover:scale-110 transition-transform duration-500"
                                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                        />

                                        {/* Badges */}
                                        <div className="absolute top-3 left-3 flex flex-col space-y-2">
                                            {product.hasSale && (
                                                <div className="bg-black text-white px-2 py-1 rounded md:text-[18px] text-[16px] font-semibold">
                                                   ფასდაკლება
                                                </div>
                                            )}
                                            {product.isNew && (
                                                <div className="bg-black text-white px-2 py-1 rounded md:text-[18px] text-[16px] font-semibold">
                                                   ახალი
                                                </div>
                                            )}
                                        </div>

                                        {/* Quick Actions */}
                                        <div className="absolute top-3 right-3 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                            <button className="bg-white p-2 rounded-full shadow-lg hover:bg-gray-50 transition-colors">
                                                <Heart className="w-4 h-4 text-black" />
                                            </button>
                                            <button className="bg-white p-2 rounded-full shadow-lg hover:bg-gray-50 transition-colors">
                                                <ShoppingCart className="w-4 h-4 text-black" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Product Info */}
                                    <div className="p-4">
                                        {/* Category */}
                                        <div className="mb-2">
                                            <span className="md:text-[18px] text-[16px] text-black uppercase tracking-wide">
                                                {product.category?.name || 'უცნობი'}
                                            </span>
                                        </div>

                                        {/* Product Title */}
                                        <h3 className="md:text-[18px] text-[16px] font-medium text-black mb-2 leading-tight line-clamp-2">
                                            {product.name}
                                        </h3>

                                        {/* Rating */}
                                        <div className="flex items-center mb-3">
                                            <div className="flex items-center">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star
                                                        key={i}
                                                        className={`w-4 h-4 ${
                                                            i < (product.rating || 0) ? "text-yellow-400 fill-current" : "text-gray-300"
                                                        }`}
                                                    />
                                                ))}
                                            </div>
                                            <span className="md:text-[18px] text-[16px] text-black ml-2">({product.rating || 0})</span>
                                        </div>

                                        {/* Pricing */}
                                        <div className="flex items-center space-x-2 mb-4">
                                            <span className="md:text-[18px] text-[16px] font-bold text-black">
                                                ₾{product.currentPrice.toFixed(2)}
                                            </span>
                                            {product.originalPrice && product.originalPrice > product.currentPrice && (
                                                <span className="md:text-[18px] text-[16px] text-black line-through">
                                                    ₾{product.originalPrice.toFixed(2)}
                                                </span>
                                            )}
                                        </div>

                                        {/* Action Button */}
                                        <Link
                                            href={`/product/${product.id}`}
                                            className="gi-btn-1 rounded-md mt-4 transition-all duration-[0.3s] ease-in-out overflow-hidden text-center relative py-[10px] max-[767px]:py-[6px] px-[15px] max-[767px]:px-[10px] bg-[#4b5966] text-[#fff] border-[0] text-[15px] max-[767px]:text-[13px] tracking-[0] font-medium inline-flex items-center hover:text-[#fff]"
                                        >
                                            დეტალები
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* No Results */}
                        {sortedProducts.length === 0 && (
                            <div className="text-center py-12">
                                <div className="md:text-[18px] text-[16px] text-black mb-2">პროდუქტი ვერ მოიძებნა</div>
                                <p className="text-gray-400">სცადეთ სხვა ფილტრები</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ShopPageClient
