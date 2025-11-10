"use client"
import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Filter, X, ChevronDown, Calendar, Star } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Product } from '@/types/product'
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import AnimatedDotsLoader from '@/component/AnimatedDotsLoader'

const ShopPageClient = () => {
    const searchParams = useSearchParams()
    const genderParam = searchParams.get('gender')

    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [activeCategory, setActiveCategory] = useState("ALL")
    const [sortBy, setSortBy] = useState("newest")
    const [isFilterOpen, setIsFilterOpen] = useState(false)
    const [priceRange, setPriceRange] = useState([0, 0])
    const [maxPrice, setMaxPrice] = useState(0)
    const [selectedSizes, setSelectedSizes] = useState<string[]>([])
    const [selectedColors, setSelectedColors] = useState<string[]>([])
    const [selectedLocations, setSelectedLocations] = useState<string[]>([])
    const [selectedRatings, setSelectedRatings] = useState<number[]>([])
    const [rentalStartDate, setRentalStartDate] = useState<Date | null>(null)
    const [rentalEndDate, setRentalEndDate] = useState<Date | null>(null)
    const [productRentalStatus, setProductRentalStatus] = useState<Record<number, {
        variantId: number;
        size: string;
        stock: number;
        activeRentals: Array<{ startDate: string; endDate: string; status: string }>;
        isAvailable: boolean;
    }[]>>({})
    const [isCategoryOpen, setIsCategoryOpen] = useState(true)

    const categories = [
        { id: "ALL", label: "ყველა", slug: "all" },

        // ძირითადი
        { id: "კაბები", label: "კაბები", slug: "dresses" },
        { id: "ბლუზები", label: "ბლუზები", slug: "tops" },
        { id: "შარვლები", label: "შარვლები", slug: "pants" },
        { id: "ქვედაბოლოები", label: "ქვედაბოლოები", slug: "skirts" },
        { id: "ზედა ტანსაცმელი", label: "ზედა ტანსაცმელი", slug: "outerwear" },
        { id: "პალტოები და მოსასხამი", label: "პალტოები და მოსასხამი", slug: "coats" },

        // საქორწინო და სადღესასწაულო
        { id: "საქორწინო კაბები", label: "საქორწინო კაბები", slug: "wedding-dresses" },
        { id: "საღამოს ტანსაცმელი", label: "საღამოს ტანსაცმელი", slug: "evening-wear" },

        // სპორტული და სათხილამურო
        { id: "სათხილამურო ქურთუკი", label: "სათხილამურო ქურთუკი", slug: "ski-jacket" },
        { id: "თერმო ტანსაცმელი", label: "თერმო ტანსაცმელი", slug: "thermal-wear" },
        { id: "სათვალე", label: "სათვალე", slug: "goggles" },
        { id: "ჩაფხუტი", label: "ჩაფხუტი", slug: "helmet" },

        // კულტურული და თემატური
        { id: "ტრადიციული ტანსაცმელი", label: "ტრადიციული ტანსაცმელი", slug: "traditional" },
        { id: "ქოსფლეის კოსტუმები", label: "ქოსფლეის კოსტუმები", slug: "cosplay" },

        // მამაკაცების
        { id: "შარვალ კოსტუმი", label: "შარვალ კოსტუმი", slug: "suit" },
        { id: "პიჯაკი", label: "პიჯაკი", slug: "blazer" },

        // აქსესუარები
        { id: "აქსესუარები", label: "აქსესუარები", slug: "accessories" },

        // ბავშვები
        { id: "ბავშვთა კაბები", label: "ბავშვთა კაბები", slug: "kids-dresses" },
        { id: "ბავშვთა ტრადიციული ტანსაცმელი", label: "ბავშვთა ტრადიციული ტანსაცმელი", slug: "kids-traditional" },
        { id: "ბავშვთა სათხილამურო ტანსაცმელი", label: "ბავშვთა სათხილამურო ტანსაცმელი", slug: "kids-ski" },

        // სხვა
        { id: "ყოველდღიური ტანსაცმელი", label: "ყოველდღიური ტანსაცმელი", slug: "everyday" },
        { id: "სპორტული ტანსაცმელი", label: "სპორტული ტანსაცმელი", slug: "sportwear" },
        { id: "სადღესასწაულო ტანსაცმელი", label: "სადღესასწაულო ტანსაცმელი", slug: "festive" },
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
        { id: "purple", label: "იისფერი", color: "#800080" },
        { id: "gray", label: "ნაცრისფერი", color: "#A52A2A" },
        { id: "beige", label: "ბეჟი", color: "#8B4513" }
    ]

    const locations = [
        { id: "თბილისი", label: "თბილისი" },
        { id: "ქუთაისი", label: "ქუთაისი" },
        { id: "რუსთავი", label: "რუსთავი" },
        { id: "ბათუმი", label: "ბათუმი" }
    ]

    // Fetch products from API
    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true)
            try {
                // Build query parameters
                const params = new URLSearchParams()
                if (genderParam) {
                    params.append('gender', genderParam)
                }

                const response = await fetch(`/api/products?${params.toString()}`)
                const data = await response.json()
                if (data.success) {
                    setProducts(data.products)

                    // Calculate maximum price from products
                    const allPrices = data.products.flatMap((product: Product) =>
                        product.variants?.map(variant => variant.price) || []
                    )
                    const calculatedMaxPrice = allPrices.length > 0 ? Math.max.apply(null, allPrices) : 200
                    setMaxPrice(calculatedMaxPrice)

                    // Update price range if current max is higher than calculated max
                    if (calculatedMaxPrice > priceRange[1]) {
                        setPriceRange([0, calculatedMaxPrice])
                    }
                }
            } catch (error) {
                console.error('Error fetching products:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchProducts()
    }, [genderParam])

    // Fetch rental status for rentable products
    useEffect(() => {
        const fetchRentalStatus = async () => {
            const rentableProducts = products.filter(p => p.isRentable)

            for (const product of rentableProducts) {
                try {
                    const response = await fetch(`/api/products/${product.id}/rental-status`)
                    const data = await response.json()
                    if (data.success) {
                        setProductRentalStatus(prev => ({
                            ...prev,
                            [product.id]: data.variants
                        }))
                    }
                } catch (error) {
                    console.error(`Error fetching rental status for product ${product.id}:`, error)
                }
            }
        }

        if (products.length > 0) {
            fetchRentalStatus()
        }
    }, [products])

    // Get minimum price from variants
    const getMinPrice = (product: Product) => {
        if (!product.variants || product.variants.length === 0) return 0
        return Math.min(...product.variants.map(v => v.price))
    }

    // Get maximum price from variants
    const getMaxPrice = (product: Product) => {
        if (!product.variants || product.variants.length === 0) return 0
        return Math.max(...product.variants.map(v => v.price))
    }

    // Check if product is available during selected dates
    const isProductAvailable = (product: Product): boolean => {
        if (!rentalStartDate || !rentalEndDate || !product.isRentable) return true

        const variants = productRentalStatus[product.id]
        if (!variants || variants.length === 0) return true

        const start = new Date(rentalStartDate)
        const end = new Date(rentalEndDate)

        // Check if any variant has availability for the selected dates
        return variants.some((variant: {
            variantId: number;
            size: string;
            stock: number;
            activeRentals: Array<{ startDate: string; endDate: string; status: string }>;
            isAvailable: boolean;
        }) => {
            const activeRentals = variant.activeRentals || []

            // Check if there are any conflicts
            const hasConflict = activeRentals.some((period: { startDate: string; endDate: string; status: string }) => {
                const periodStart = new Date(period.startDate)
                const periodEnd = new Date(period.endDate)
                const periodLastBlockedDate = new Date(periodEnd.getTime() + 24 * 60 * 60 * 1000)

                return start < periodLastBlockedDate && end >= periodStart
            })

            return !hasConflict
        })
    }

    // Filter products by all criteria (excluding gender since it's handled by API)
    const filteredProducts = products.filter(product => {
        // Active Category filter (from sidebar)
        const activeCategoryMatch = activeCategory === "ALL" || product.category?.name === activeCategory

        // Price filter
        const minPrice = getMinPrice(product)
        const maxPrice = getMaxPrice(product)
        const priceMatch = (minPrice >= priceRange[0] && minPrice <= priceRange[1]) ||
            (maxPrice >= priceRange[0] && maxPrice <= priceRange[1]) ||
            (minPrice <= priceRange[0] && maxPrice >= priceRange[1])

        // Size filter
        const sizeMatch = selectedSizes.length === 0 ||
            product.variants.some(variant => selectedSizes.includes(variant.size))

        // Color filter
        const colorMatch = selectedColors.length === 0 ||
            selectedColors.some(selectedColor => {
                const colorMapping: Record<string, string[]> = {
                    'black': ['შავი', 'black'],
                    'white': ['თეთრი', 'white'],
                    'red': ['წითელი', 'red'],
                    'blue': ['ლურჯი', 'blue'],
                    'green': ['მწვანე', 'green'],
                    'yellow': ['ყვითელი', 'yellow'],
                    'pink': ['ვარდისფერი', 'pink'],
                    'purple': ['იისფერი', 'purple']
                };

                const colorVariations = colorMapping[selectedColor] || [selectedColor];
                return colorVariations.some(color =>
                    product.color?.toLowerCase().includes(color.toLowerCase())
                );
            })

        // Location filter
        const locationMatch = selectedLocations.length === 0 ||
            selectedLocations.includes(product.location || '')

        // Rating filter
        const ratingMatch = selectedRatings.length === 0 ||
            selectedRatings.some(rating => Math.floor(product.rating || 0) === rating)

        // Rental availability filter
        const rentalAvailabilityMatch = isProductAvailable(product)

        return activeCategoryMatch && priceMatch && sizeMatch && colorMatch && locationMatch && ratingMatch && rentalAvailabilityMatch
    })



    // Sort products
    const sortedProducts = [...filteredProducts].sort((a, b) => {
        switch (sortBy) {
            case "price-low":
                return getMinPrice(a) - getMinPrice(b)
            case "price-high":
                return getMaxPrice(b) - getMaxPrice(a)
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

    // Handle location selection
    const toggleLocation = (location: string) => {
        setSelectedLocations(prev =>
            prev.includes(location)
                ? prev.filter(l => l !== location)
                : [...prev, location]
        )
    }

    // Handle rating selection
    const toggleRating = (rating: number) => {
        setSelectedRatings(prev =>
            prev.includes(rating)
                ? prev.filter(r => r !== rating)
                : [...prev, rating]
        )
    }

    // Clear all filters
    const clearFilters = () => {
        setActiveCategory("ALL")
        setPriceRange([0, maxPrice])
        setSelectedSizes([])
        setSelectedColors([])
        setSelectedLocations([])
        setSelectedRatings([])
        setRentalStartDate(null)
        setRentalEndDate(null)
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
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center px-4">
                <AnimatedDotsLoader />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50">


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
                                    className="text-[16px] cursor-pointer text-black hover:text-black font-medium"
                                >
                                    გაწმენდა
                                </button>
                            </div>

                            {/* Category Filters */}
                            <div className="mb-6">
                                <button
                                    type="button"
                                    onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                                    className="w-full flex items-center justify-between mb-3"
                                >
                                    <h4 className="font-medium text-gray-900">კატეგორია</h4>
                                    <ChevronDown className={`w-5 h-5 text-gray-700 transition-transform ${isCategoryOpen ? "rotate-180" : "rotate-0"}`} />
                                </button>
                                {isCategoryOpen && (
                                    <div className="space-y-2">
                                        {categories.map((category) => {
                                            const categoryCount = products.filter(product =>
                                                category.id === "ALL" || product.category?.name === category.label
                                            ).length;

                                            return (
                                                <button
                                                    key={category.id}
                                                    onClick={() => setActiveCategory(category.id)}
                                                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex justify-between items-center ${activeCategory === category.id
                                                        ? "bg-black text-white"
                                                        : "text-gray-600 hover:bg-gray-100"
                                                        }`}
                                                >
                                                    <span>{category.label}</span>
                                                    {category.id !== "ALL" && (
                                                        <span className={`text-xs px-2 py-1 rounded-full ${activeCategory === category.id
                                                            ? "bg-gray-600 text-white"
                                                            : "bg-gray-200 text-gray-600"
                                                            }`}>
                                                            {categoryCount}
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Price Range */}
                            <div className="mb-6">
                                <h4 className="font-medium text-gray-900 mb-3">ფასის დიაპაზონი</h4>
                                <div className="space-y-3">
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="range"
                                            min="0"
                                            max={maxPrice}
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
                                            className={`px-3 py-2 text-sm rounded-md border transition-colors ${selectedSizes.includes(size.id)
                                                ? "bg-black text-white border-black"
                                                : "bg-white text-gray-700 border-gray-300 hover:border-black"
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
                                <select
                                    value={selectedColors.length > 0 ? selectedColors[0] : ''}
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            setSelectedColors([e.target.value])
                                        } else {
                                            setSelectedColors([])
                                        }
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
                                >
                                    <option value="">ყველა ფერი</option>
                                    {colors.map((color) => (
                                        <option key={color.id} value={color.id}>
                                            {color.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Location Filter */}
                            <div className="mb-6">
                                <h4 className="font-medium text-gray-900 mb-3">მდებარეობა</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    {locations.map((location) => (
                                        <button
                                            key={location.id}
                                            onClick={() => toggleLocation(location.id)}
                                            className={`px-3 py-2 text-sm rounded-md border transition-colors ${selectedLocations.includes(location.id)
                                                ? "bg-black text-white border-black"
                                                : "bg-white text-gray-700 border-gray-300 hover:border-black"
                                                }`}
                                        >
                                            {location.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Rating Filter */}
                            <div className="mb-6">
                                <h4 className="font-medium text-gray-900 mb-3">რეიტინგი</h4>
                                <div className="space-y-2">
                                    {[5, 4, 3, 2, 1].map((rating) => {
                                        const count = products.filter(
                                            (product) => Math.floor(product.rating || 0) === rating
                                        ).length;

                                        return (
                                            <button
                                                key={rating}
                                                onClick={() => toggleRating(rating)}
                                                className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-md border transition-colors ${selectedRatings.includes(rating)
                                                        ? "bg-[#1B3729] text-white border-[#1B3729]"
                                                        : "bg-white text-gray-700 border-gray-300 hover:border-black"
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center">
                                                        {[1, 2, 3, 4, 5].map((star) => (
                                                            <Star
                                                                key={star}
                                                                className={`w-4 h-4 ${star <= rating
                                                                        ? "fill-amber-500 text-amber-500"
                                                                        : "fill-gray-200 text-gray-300"
                                                                    }`}
                                                            />
                                                        ))}
                                                    </div>
                                                    <span className="ml-1">{rating} ★</span>
                                                </div>

                                                <span
                                                    className={`text-xs px-2 py-1 rounded-full ${selectedRatings.includes(rating)
                                                            ? "bg-gray-600 text-white"
                                                            : "bg-gray-200 text-gray-600"
                                                        }`}
                                                >
                                                    {count}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>


                            {/* Rental Date Filter */}
                            <div className="mb-6">
                                <div className="flex items-center gap-2 mb-3">
                                    <Calendar className="w-5 h-5 text-gray-700" />
                                    <h4 className="font-medium text-gray-900">გაქირავების თარიღი</h4>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm text-gray-600 mb-1">დაწყება</label>
                                        <DatePicker
                                            selected={rentalStartDate}
                                            onChange={(date: Date | null) => setRentalStartDate(date)}
                                            minDate={new Date()}
                                            placeholderText="აირჩიე თარიღი"
                                            dateFormat="dd/MM/yyyy"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-600 mb-1">დასრულება</label>
                                        <DatePicker
                                            selected={rentalEndDate}
                                            onChange={(date: Date | null) => setRentalEndDate(date)}
                                            minDate={rentalStartDate || new Date()}
                                            placeholderText="აირჩიე თარიღი"
                                            dateFormat="dd/MM/yyyy"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
                                        />
                                    </div>

                                </div>
                            </div>

                            {/* Results Count */}
                            
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1">
                        {/* Top Bar with Sorting */}
                        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
                               <h3 className="md:text-[20px] font-bold text-[18px] text-black">ყიდვა / გაქირავება</h3>
                                <div className="flex flex-col md:flex-row gap-2 items-center space-x-2">
                                    <span className="md:text-[18px] text-[16px] text-black">დალაგება:</span>
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value)}
                                        className="px-3 py-2 text-[16px] md:text-[18px} border border-gray-300 rounded-lg  focus:outline-none focus:ring-2 focus:ring-black"
                                    >
                                        <option className='text-[16px] md:text-[18px} text-black' value="newest">ახალი</option>
                                        <option className='text-[16px] md:text-[18px} text-black' value="price-low">ფასი: დაბლიდან მაღლა</option>
                                        <option className='text-[16px] md:text-[18px} text-black' value="price-high">ფასი: მაღლიდან დაბლა</option>
                                        <option className='text-[16px] md:text-[18px} text-black' value="rating">რეიტინგი</option>
                                    </select>
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
                                    <div className="relative aspect-[3/4] bg-gray-100">
                                        <Image
                                            src={product.images?.[0]?.url || "/placeholder.jpg"}
                                            alt={product.name}
                                            fill
                                            className="object-cover  transition-transform duration-300"
                                        />

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


                                        {/* Pricing */}
                                        <div className="flex items-center space-x-2 mb-4">
                                            <span className="md:text-[18px] text-[16px] font-bold text-black">
                                                ₾{getMinPrice(product).toFixed(2)}
                                                {getMinPrice(product) !== getMaxPrice(product) && (
                                                    <span className="text-sm"> - ₾{getMaxPrice(product).toFixed(2)}</span>
                                                )}
                                            </span>
                                        </div>

                                        {/* Action Button */}
                                        <Link
                                            href={`/product/${product.id}`}
                                            className="block w-full md:w-[200px]  mt-3 bg-[#1B3729] md:text-[18px] text-[16px] text-white text-center py-2 rounded-lg font-bold transition-colors duration-300"
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
