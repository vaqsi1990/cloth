"use client"
import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { Star, ShoppingCart, Heart, Filter, X, ChevronDown } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

const ShopPageClient = () => {
    const searchParams = useSearchParams()
    const categoryParam = searchParams.get('category') || 'women'
    
    const [activeCategory, setActiveCategory] = useState("ALL")
    const [sortBy, setSortBy] = useState("newest")
    const [isFilterOpen, setIsFilterOpen] = useState(false)
    const [priceRange, setPriceRange] = useState([0, 200])
    const [selectedSizes, setSelectedSizes] = useState<string[]>([])
    const [selectedColors, setSelectedColors] = useState<string[]>([])

    const categories = [
        { id: "ALL", label: "ყველა" },
        { id: "DRESSES", label: "კაბები" },
        { id: "TOPS", label: "ბლუზები" },
        { id: "BOTTOMS", label: "შარვლები" },
        { id: "OUTERWEAR", label: "ზედა ტანსაცმელი" },
        { id: "ACCESSORIES", label: "აქსესუარები" }
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

    // Dynamic product data based on category
    const getProductsByCategory = (category: string) => {
        switch (category) {
            case 'women':
                return [
                    {
                        id: 1,
                        name: "ქალის ელეგანტური კაბა",
                        category: "DRESSES",
                        currentPrice: 89.99,
                        originalPrice: 120.00,
                        rating: 5,
                        image: "/new/4.jpg",
                        hasSale: true,
                        isNew: true,
                        sizes: ["S", "M", "L"],
                        colors: ["black", "red", "blue"]
                    },
                    {
                        id: 2,
                        name: "ქალის ბლუზა ფრენჩული მანჟეტებით",
                        category: "TOPS",
                        currentPrice: 45.99,
                        originalPrice: 65.00,
                        rating: 4,
                        image: "/new/1.jpg",
                        hasSale: false,
                        isNew: true,
                        sizes: ["XS", "S", "M", "L"],
                        colors: ["white", "pink", "purple"]
                    },
                    {
                        id: 3,
                        name: "ქალის ზაფხულის კაბა",
                        category: "DRESSES",
                        currentPrice: 67.50,
                        originalPrice: 67.50,
                        rating: 5,
                        image: "/new/2.jpg",
                        hasSale: false,
                        isNew: false,
                        sizes: ["S", "M", "L", "XL"],
                        colors: ["green", "yellow", "blue"]
                    },
                    {
                        id: 4,
                        name: "ქალის ჯინსები მაღალი წელით",
                        category: "BOTTOMS",
                        currentPrice: 78.00,
                        originalPrice: 95.00,
                        rating: 4,
                        image: "/new/3.jpg",
                        hasSale: true,
                        isNew: false,
                        sizes: ["26", "28", "30", "32"],
                        colors: ["blue", "black"]
                    },
                    {
                        id: 5,
                        name: "ქალის ბლუზა ბოუტონებით",
                        category: "TOPS",
                        currentPrice: 52.99,
                        originalPrice: 52.99,
                        rating: 5,
                        image: "/new/5.jpg",
                        hasSale: false,
                        isNew: true,
                        sizes: ["S", "M", "L"],
                        colors: ["white", "black", "red"]
                    }
                ]
            
            case 'men':
                return [
                    {
                        id: 6,
                        name: "მამაკაცის კლასიკური შარვალი",
                        category: "BOTTOMS",
                        currentPrice: 75.99,
                        originalPrice: 95.00,
                        rating: 5,
                        image: "/new/1.jpg",
                        hasSale: true,
                        isNew: false,
                        sizes: ["30", "32", "34", "36"],
                        colors: ["black", "blue", "gray"]
                    },
                    {
                        id: 7,
                        name: "მამაკაცის ბლუზა",
                        category: "TOPS",
                        currentPrice: 55.50,
                        originalPrice: 70.00,
                        rating: 4,
                        image: "/new/2.jpg",
                        hasSale: true,
                        isNew: false,
                        sizes: ["S", "M", "L", "XL"],
                        colors: ["white", "blue", "green"]
                    },
                    {
                        id: 8,
                        name: "მამაკაცის ქურთუკი",
                        category: "OUTERWEAR",
                        currentPrice: 120.00,
                        originalPrice: 150.00,
                        rating: 5,
                        image: "/new/3.jpg",
                        hasSale: true,
                        isNew: false,
                        sizes: ["M", "L", "XL", "XXL"],
                        colors: ["black", "gray", "brown"]
                    },
                    {
                        id: 9,
                        name: "მამაკაცის ფეხსაცმელი",
                        category: "ACCESSORIES",
                        currentPrice: 89.99,
                        originalPrice: 110.00,
                        rating: 4,
                        image: "/new/4.jpg",
                        hasSale: true,
                        isNew: false,
                        sizes: ["7", "8", "9", "10", "11"],
                        colors: ["black", "brown", "white"]
                    },
                    {
                        id: 10,
                        name: "მამაკაცის ტანსაცმელი",
                        category: "TOPS",
                        currentPrice: 42.99,
                        originalPrice: 42.99,
                        rating: 5,
                        image: "/new/5.jpg",
                        hasSale: false,
                        isNew: true,
                        sizes: ["S", "M", "L"],
                        colors: ["white", "black", "gray"]
                    }
                ]
            
            case 'kids':
                return [
                    {
                        id: 11,
                        name: "ბავშვის ზაფხულის კაბა",
                        category: "DRESSES",
                        currentPrice: 35.99,
                        originalPrice: 45.00,
                        rating: 5,
                        image: "/new/6.jpg",
                        hasSale: true,
                        isNew: false,
                        sizes: ["2T", "3T", "4T", "5T"],
                        colors: ["pink", "yellow", "blue"]
                    },
                    {
                        id: 12,
                        name: "ბავშვის ბლუზა",
                        category: "TOPS",
                        currentPrice: 28.50,
                        originalPrice: 35.00,
                        rating: 4,
                        image: "/new/7.jpg",
                        hasSale: true,
                        isNew: false,
                        sizes: ["2T", "3T", "4T"],
                        colors: ["white", "red", "green"]
                    },
                    {
                        id: 13,
                        name: "ბავშვის შარვალი",
                        category: "BOTTOMS",
                        currentPrice: 32.99,
                        originalPrice: 40.00,
                        rating: 5,
                        image: "/new/1.jpg",
                        hasSale: true,
                        isNew: false,
                        sizes: ["2T", "3T", "4T", "5T"],
                        colors: ["blue", "black", "gray"]
                    },
                    {
                        id: 14,
                        name: "ბავშვის ქურთუკი",
                        category: "OUTERWEAR",
                        currentPrice: 65.00,
                        originalPrice: 80.00,
                        rating: 4,
                        image: "/new/2.jpg",
                        hasSale: true,
                        isNew: false,
                        sizes: ["2T", "3T", "4T"],
                        colors: ["red", "blue", "green"]
                    },
                    {
                        id: 15,
                        name: "ბავშვის ფეხსაცმელი",
                        category: "ACCESSORIES",
                        currentPrice: 45.99,
                        originalPrice: 55.00,
                        rating: 5,
                        image: "/new/3.jpg",
                        hasSale: true,
                        isNew: false,
                        sizes: ["8", "9", "10", "11", "12"],
                        colors: ["black", "white", "red"]
                    }
                ]
            
            default:
                return []
        }
    }

    const [products, setProducts] = useState(getProductsByCategory(categoryParam))

    // Update products when category changes
    useEffect(() => {
        setProducts(getProductsByCategory(categoryParam))
    }, [categoryParam])

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
                    title: "ქალის",
                    description: "აღმოაჩინეთ ულამაზესი ქალის ტანსაცმელი"
                }
        }
    }

    const categoryInfo = getCategoryInfo(categoryParam)

    // Filter products by all criteria
    const filteredProducts = products.filter(product => {
        // Category filter
        const categoryMatch = activeCategory === "ALL" || product.category === activeCategory
        
        // Price filter
        const priceMatch = product.currentPrice >= priceRange[0] && product.currentPrice <= priceRange[1]
        
        // Size filter
        const sizeMatch = selectedSizes.length === 0 || 
            product.sizes.some(size => selectedSizes.includes(size))
        
        // Color filter
        const colorMatch = selectedColors.length === 0 || 
            product.colors.some(color => selectedColors.includes(color))
        
        return categoryMatch && priceMatch && sizeMatch && colorMatch
    })

    // Sort products
    const sortedProducts = [...filteredProducts].sort((a, b) => {
        switch (sortBy) {
            case "price-low":
                return a.currentPrice - b.currentPrice
            case "price-high":
                return b.currentPrice - a.currentPrice
            case "rating":
                return b.rating - a.rating
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

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="container mx-auto px-4 py-6">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                        {categoryInfo.title} <span className="text-teal-600">ტანსაცმელი</span>
                    </h1>
                    <p className="text-gray-600 mt-2">{categoryInfo.description}</p>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8">
                {/* Mobile Filter Toggle */}
                <div className="lg:hidden mb-6">
                    <button
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className="flex items-center space-x-2 bg-white px-4 py-3 rounded-lg shadow-sm border w-full justify-between"
                    >
                        <div className="flex items-center space-x-2">
                            <Filter className="w-5 h-5 text-gray-600" />
                            <span className="font-medium text-gray-700">ფილტრები</span>
                        </div>
                        {isFilterOpen ? (
                            <X className="w-5 h-5 text-gray-600" />
                        ) : (
                            <ChevronDown className="w-5 h-5 text-gray-600" />
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
                                    className="text-sm text-teal-600 hover:text-teal-700 font-medium"
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
                                                    ? "bg-teal-100 text-teal-700"
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
                                                    ? "bg-teal-600 text-white border-teal-600"
                                                    : "bg-white text-gray-700 border-gray-300 hover:border-teal-500"
                                            }`}
                                        >
                                            {size.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Color Filter */}
                            <div className="mb-6">
                                <h4 className="font-medium text-gray-900 mb-3">ფერი</h4>
                                <div className="grid grid-cols-4 gap-2">
                                    {colors.map((color) => (
                                        <button
                                            key={color.id}
                                            onClick={() => toggleColor(color.id)}
                                            className={`w-10 h-10 rounded-full border-2 transition-all ${
                                                selectedColors.includes(color.id)
                                                    ? "border-teal-600 scale-110"
                                                    : "border-gray-300 hover:border-teal-500"
                                            }`}
                                            style={{ backgroundColor: color.color }}
                                            title={color.label}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Results Count */}
                            <div className="pt-4 border-t border-gray-200">
                                <p className="text-sm text-gray-600">
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
                                    <span className="text-sm text-gray-600">დალაგება:</span>
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value)}
                                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    >
                                        <option value="newest">ახალი</option>
                                        <option value="price-low">ფასი: დაბლიდან მაღლა</option>
                                        <option value="price-high">ფასი: მაღლიდან დაბლა</option>
                                        <option value="rating">რეიტინგი</option>
                                    </select>
                                </div>
                                
                                <div className="text-sm text-gray-600">
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
                                    <div className="relative aspect-square overflow-hidden rounded-t-lg">
                                        <Image
                                            src={product.image}
                                            alt={product.name}
                                            fill
                                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                                        />

                                        {/* Badges */}
                                        <div className="absolute top-3 left-3 flex flex-col space-y-2">
                                            {product.hasSale && (
                                                <div className="bg-red-500 text-white px-2 py-1 rounded text-xs font-semibold">
                                                    SALE
                                                </div>
                                            )}
                                            {product.isNew && (
                                                <div className="bg-teal-500 text-white px-2 py-1 rounded text-xs font-semibold">
                                                    NEW
                                                </div>
                                            )}
                                        </div>

                                        {/* Quick Actions */}
                                        <div className="absolute top-3 right-3 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                            <button className="bg-white p-2 rounded-full shadow-lg hover:bg-gray-50 transition-colors">
                                                <Heart className="w-4 h-4 text-gray-600" />
                                            </button>
                                            <button className="bg-white p-2 rounded-full shadow-lg hover:bg-gray-50 transition-colors">
                                                <ShoppingCart className="w-4 h-4 text-gray-600" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Product Info */}
                                    <div className="p-4">
                                        {/* Category */}
                                        <div className="mb-2">
                                            <span className="text-xs text-gray-500 uppercase tracking-wide">
                                                {categories.find(cat => cat.id === product.category)?.label}
                                            </span>
                                        </div>

                                        {/* Product Title */}
                                        <h3 className="text-sm font-medium text-gray-900 mb-2 leading-tight line-clamp-2">
                                            {product.name}
                                        </h3>

                                        {/* Rating */}
                                        <div className="flex items-center mb-3">
                                            <div className="flex items-center">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star
                                                        key={i}
                                                        className={`w-4 h-4 ${
                                                            i < product.rating ? "text-yellow-400 fill-current" : "text-gray-300"
                                                        }`}
                                                    />
                                                ))}
                                            </div>
                                            <span className="text-xs text-gray-500 ml-2">({product.rating})</span>
                                        </div>

                                        {/* Pricing */}
                                        <div className="flex items-center space-x-2">
                                            <span className="text-lg font-bold text-gray-900">
                                                ₾{product.currentPrice.toFixed(2)}
                                            </span>
                                            {product.originalPrice > product.currentPrice && (
                                                <span className="text-sm text-gray-400 line-through">
                                                    ₾{product.originalPrice.toFixed(2)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* No Results */}
                        {sortedProducts.length === 0 && (
                            <div className="text-center py-12">
                                <div className="text-gray-500 text-lg mb-2">პროდუქტი ვერ მოიძებნა</div>
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
