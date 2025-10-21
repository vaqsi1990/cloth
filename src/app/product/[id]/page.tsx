"use client"
import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { Truck, Shield, RotateCcw, ArrowLeft, Eye, MessageCircle, CheckCircle, CreditCard, CalendarDays } from 'lucide-react'
import Link from 'next/link'
import { useCart } from '@/context/CartContext'
import { Product, RentalPeriod } from '@/types/product'

const ProductPage = () => {
    const params = useParams()
    const productId = params.id as string
    const { addToCart } = useCart()

    const [product, setProduct] = useState<Product | null>(null)
    const [loading, setLoading] = useState(true)
    const [selectedSize, setSelectedSize] = useState<string>('')
    const [quantity, setQuantity] = useState(1)
    const [activeImage, setActiveImage] = useState(0)
    const [activeTab, setActiveTab] = useState('description')
    const [isWishlisted, setIsWishlisted] = useState(false)
    const [rentalStatus, setRentalStatus] = useState<{ [size: string]: RentalPeriod[] }>({})
    const [purchaseMode, setPurchaseMode] = useState<'buy' | 'rent'>('buy')
    const [rentalStartDate, setRentalStartDate] = useState('')
    const [rentalEndDate, setRentalEndDate] = useState('')
    const [isAdding, setIsAdding] = useState(false)

    // Fetch product from API
    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const response = await fetch(`/api/products/${productId}`)
                const data = await response.json()
                if (data.success) {
                    setProduct(data.product)
                }
            } catch (error) {
                console.error('Error fetching product:', error)
            } finally {
                setLoading(false)
            }
        }

        const fetchRentalStatus = async () => {
            try {
                const response = await fetch(`/api/products/${productId}/rental-status`)
                const data = await response.json()
                if (data.success) {
                    const statusMap: { [size: string]: RentalPeriod[] } = {}
                    data.variants.forEach((variant: { size: string; activeRentals?: RentalPeriod[] }) => {
                        statusMap[variant.size] = variant.activeRentals || []
                    })
                    setRentalStatus(statusMap)
                }
            } catch (error) {
                console.error('Error fetching rental status:', error)
            }
        }

        if (productId) {
            fetchProduct()
            fetchRentalStatus()
        }
    }, [productId])

    // Handle size selection
    const handleSizeSelect = (size: string) => {
        setSelectedSize(size)
    }

    // Handle quantity change
    const handleQuantityChange = (newQuantity: number) => {
        if (newQuantity >= 1 && newQuantity <= (getMaxStock() || 0)) {
            setQuantity(newQuantity)
        }
    }

    // Get price for selected size
    const getSelectedPrice = () => {
        if (!product || !product.variants) return 0
        const selectedVariant = product.variants.find((v) => v.size === selectedSize)
        return selectedVariant?.price || 0
    }

    // Get max stock from variants
    const getMaxStock = () => {
        if (!product || !product.variants) return 0
        const selectedVariant = product.variants.find((v) => v.size === selectedSize)
        if (!selectedVariant) return 0

        return selectedVariant.stock || 0
    }

    // Check if size is available for rental
    const isSizeAvailableForRental = (size: string) => {
        return !hasActiveRentals(size)
    }

    // Get available sizes from variants
    const getAvailableSizes = () => {
        if (!product || !product.variants) return []
        return product.variants.map((v) => v.size)
    }

    // Check if a size has active rentals
    const hasActiveRentals = (size: string) => {
        return rentalStatus[size] && rentalStatus[size].length > 0
    }

    // Get rental periods for a specific size
    const getRentalPeriods = (size: string) => {
        return rentalStatus[size] || []
    }

    // Format date for display
    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('ka-GE', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
    }
    // Get main product image
    const getMainImage = () => {
        if (!product || !product.images || product.images.length === 0) return '/placeholder.jpg'
        return product.images[activeImage]?.url || product.images[0]?.url
    }

    const handleAddToCart = () => {
        console.log('handleAddToCart called at:', Date.now())

        if (!product) return
        if (!selectedSize) {
            alert('გთხოვთ აირჩიოთ ზომა')
            return
        }

        if (isAdding) {
            console.log('Already adding, skipping duplicate call')
            return 
        }

        console.log('Setting isAdding to true')
        setIsAdding(true)

        const cartItem = {
            id: product.id,
            name: product.name,
            image: getMainImage(),
            price: getSelectedPrice(),
            size: selectedSize,
            quantity,
            maxStock: getMaxStock(),
        }

        console.log('Calling addToCart with:', cartItem)
        addToCart(cartItem)
        setQuantity(1)

        setTimeout(() => {
            console.log('Setting isAdding to false')
            setIsAdding(false)
        }, 400)
    }


    // Toggle wishlist
    const toggleWishlist = () => {
        setIsWishlisted(!isWishlisted)
        alert(isWishlisted ? 'პროდუქტი წაიშალა ფავორიტებიდან' : 'პროდუქტი დაემატა ფავორიტებში')
    }

    // Share product
    const shareProduct = () => {
        if (navigator.share) {
            navigator.share({
                title: product?.name,
                url: window.location.href
            })
        } else {
            navigator.clipboard.writeText(window.location.href)
            alert('ბმული დაკოპირებულია!')
        }
    }

    // Handle rental
    const handleRental = () => {
        if (!product) return
        if (!selectedSize) {
            alert('გთხოვთ აირჩიოთ ზომა')
            return
        }
        if (!rentalStartDate || !rentalEndDate) {
            alert('გთხოვთ აირჩიოთ გაქირავების თარიღები')
            return
        }

        // Calculate rental price
        const startDate = new Date(rentalStartDate)
        const endDate = new Date(rentalEndDate)
        const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        const pricePerDay = product.pricePerDay || getSelectedPrice() * 0.1
        const totalPrice = daysDiff * pricePerDay

        alert(`გაქირავება: ${daysDiff} დღე, ჯამური ფასი: ₾${totalPrice.toFixed(2)}`)
    }

    // Calculate rental price
    const calculateRentalPrice = () => {
        if (!product || !rentalStartDate || !rentalEndDate) return 0
        const startDate = new Date(rentalStartDate)
        const endDate = new Date(rentalEndDate)
        const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        const pricePerDay = product.pricePerDay || getSelectedPrice() * 0.1
        return daysDiff * pricePerDay
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

    if (!product) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-black mb-4">პროდუქტი ვერ მოიძებნა</h1>
                    <Link href="/shop" className="text-black hover:text-black">
                        დაბრუნდი მაღაზიაში
                    </Link>
                </div>
            </div>
        )
    }


    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-md border-b border-gray-200">
                <div className="container mx-auto max-w-[1320px] flex items-center justify-between px-4 py-5">
                    <Link
                        href="/"
                        className="flex items-center text-black font-medium hover:opacity-80 transition"
                    >
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        უკან დაბრუნება
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto max-w-[1320px] px-4 py-12">
                <div className="grid xl:grid-cols-2 gap-12">
                    {/* Product Images */}
                    <section className="space-y-6">
                        <div className="relative aspect-square bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100">
                            <Image
                                src={getMainImage()}
                                alt={product.name}
                                fill
                                className="object-cover transition-transform duration-700 hover:scale-105"
                                priority
                            />

                            {/* Badges */}
                            <div className="absolute top-4 left-4 flex flex-col gap-2">
                                {product.hasSale && (
                                    <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold shadow">
                                        ფასდაკლება
                                    </span>
                                )}
                                {product.isNew && (
                                    <span className="bg-black text-white px-3 py-1 rounded-full text-sm font-semibold shadow">
                                        ახალი
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Thumbnails */}
                        <div className="grid grid-cols-4 gap-3">
                            {product.images?.map((img, i) => (
                                <button
                                    key={i}
                                    onClick={() => setActiveImage(i)}
                                    className={`relative w-full h-20 rounded-lg overflow-hidden border-2 transition ${activeImage === i
                                            ? "border-black shadow-lg ring-2 ring-black"
                                            : "border-gray-200 hover:border-black hover:shadow-md"
                                        }`}
                                >
                                    <Image
                                        src={img.url}
                                        alt={`${product.name} ${i + 1}`}
                                        fill
                                        className="object-cover"
                                    />
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Product Info */}
                    <section className="space-y-8">
                        {/* Title & Price */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm">
                            <h1 className="text-3xl font-bold text-gray-900 mb-4">{product.name}</h1>
                            <div className="flex items-center gap-3 mb-4">
                                <span className="text-3xl font-bold text-black">
                                    ₾{getSelectedPrice().toFixed(2)}
                                </span>
                            </div>
                            <p className="text-gray-700 leading-relaxed">{product.description}</p>
                        </div>

                        {/* Size & Quantity */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-6">
                            <h3 className="text-lg font-semibold text-black">ზომა</h3>
                            <div className="grid grid-cols-4 gap-3">
                                {getAvailableSizes().map((size) => {
                                    const variant = product.variants.find(v => v.size === size)
                                    const variantPrice = variant?.price || 0
                                    return (
                                        <button
                                            key={size}
                                            onClick={() => handleSizeSelect(size)}
                                            className={`py-3 rounded-xl border-2 text-sm font-medium transition ${selectedSize === size
                                                    ? "border-black bg-black text-white"
                                                    : "border-gray-300 hover:border-black"
                                                }`}
                                        >
                                            <div>{size}</div>
                                            <div className="text-xs opacity-75">₾{variantPrice.toFixed(2)}</div>
                                        </button>
                                    )
                                })}
                            </div>

                            <div className="flex items-center gap-4 mt-4">
                                <button
                                    onClick={() => handleQuantityChange(quantity - 1)}
                                    className="w-10 h-10 border border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-50"
                                >
                                    −
                                </button>
                                <span className="text-xl font-medium w-10 text-center">{quantity}</span>
                                <button
                                    onClick={() => handleQuantityChange(quantity + 1)}
                                    className="w-10 h-10 border border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-50"
                                >
                                    +
                                </button>
                                <span className="text-sm text-gray-600">
                                    {purchaseMode === 'buy' ? (
                                        <>
                                            ხელმისაწვდომია: <span className="font-medium">{getMaxStock()}</span>
                                        </>
                                    ) : (
                                        <>
                                            {isSizeAvailableForRental(selectedSize) ? (
                                                <>
                                                    ხელმისაწვდომია გაქირავებისთვის
                                                </>
                                            ) : (
                                                <span className="text-red-500 font-medium">გაქირავებული</span>
                                            )}
                                        </>
                                    )}
                                </span>
                            </div>
                        </div>

                        {/* Buy / Rent Section */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                            <h3 className="text-lg font-semibold text-black">შეძენის ტიპი</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setPurchaseMode("buy")}
                                    className={`p-4 rounded-xl border-2 ${purchaseMode === "buy"
                                            ? "border-green-500 bg-green-50 text-green-700"
                                            : "border-gray-300 hover:border-green-400"
                                        }`}
                                >
                                    <CreditCard className="w-6 h-6 mx-auto mb-1" />
                                    გაყიდვა
                                </button>
                                {product.isRentable && (
                                    <button
                                        onClick={() => setPurchaseMode("rent")}
                                        className={`p-4 rounded-xl border-2 ${purchaseMode === "rent"
                                                ? "border-blue-500 bg-blue-50 text-blue-700"
                                                : "border-gray-300 hover:border-blue-400"
                                            }`}
                                    >
                                        <CalendarDays className="w-6 h-6 mx-auto mb-1" />
                                        გაქირავება
                                    </button>
                                )}
                            </div>

                            {/* Rental Date Selection */}
                            {purchaseMode === 'rent' && product.isRentable && (
                                <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                    <h4 className="font-semibold text-blue-800">გაქირავების თარიღები</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-blue-700 mb-2">დაწყების თარიღი</label>
                                            <input
                                                type="date"
                                                value={rentalStartDate}
                                                onChange={(e) => setRentalStartDate(e.target.value)}
                                                min={new Date().toISOString().split('T')[0]}
                                                className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-blue-700 mb-2">დასრულების თარიღი</label>
                                            <input
                                                type="date"
                                                value={rentalEndDate}
                                                onChange={(e) => setRentalEndDate(e.target.value)}
                                                min={rentalStartDate || new Date().toISOString().split('T')[0]}
                                                className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>
                                    {calculateRentalPrice() > 0 && (
                                        <div className="text-center p-3 bg-white rounded-lg border border-blue-300">
                                            <div className="text-lg font-bold text-blue-800">
                                                ჯამური ფასი: ₾{calculateRentalPrice().toFixed(2)}
                                            </div>
                                            {product.deposit && (
                                                <div className="text-sm text-blue-600">
                                                    + გირაო: ₾{product.deposit.toFixed(2)}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Add to Cart / Rent */}
                        <button
                            onClick={
                                purchaseMode === "buy" ? handleAddToCart : handleRental
                            }
                            disabled={!selectedSize || (purchaseMode === "rent" && (!rentalStartDate || !rentalEndDate || !isSizeAvailableForRental(selectedSize)))}
                            className={`w-full py-5 text-white font-semibold rounded-xl shadow-md transition disabled:bg-gray-400 disabled:cursor-not-allowed ${purchaseMode === "buy"
                                    ? "bg-green-600 hover:bg-green-700"
                                    : "bg-blue-600 hover:bg-blue-700"
                                }`}
                        >
                            {purchaseMode === "buy" ? "კალათაში დამატება" : "გაქირავება"}
                        </button>

                        {/* Benefits */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-3">
                            {[
                                { icon: Truck, title: "უფასო მიწოდება", desc: "50₾-ზე მეტი შეკვეთისთვის" },
                                { icon: Shield, title: "უსაფრთხო გადახდა", desc: "SSL დაცული გადახდები" },
                                { icon: RotateCcw, title: "30 დღიანი დაბრუნება", desc: "უფასო დაბრუნება" },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center text-black">
                                    <item.icon className="w-6 h-6 mr-4" />
                                    <div>
                                        <div className="font-medium">{item.title}</div>
                                        <div className="text-sm">{item.desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Tabs */}
                <section className="bg-white rounded-2xl shadow-sm mt-16">
                    <nav className="flex border-b border-gray-200 px-6">
                        {[
                            { id: "description", label: "აღწერა", icon: Eye },
                            { id: "features", label: "მახასიათებლები", icon: CheckCircle },
                            { id: "specifications", label: "სპეციფიკაციები", icon: MessageCircle },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`py-4 px-3 border-b-2 text-sm font-medium transition ${activeTab === tab.id
                                        ? "border-black text-black"
                                        : "border-transparent hover:border-black"
                                    }`}
                            >
                                <tab.icon className="inline w-4 h-4 mr-2" />
                                {tab.label}
                            </button>
                        ))}
                    </nav>

                    <div className="p-6">
                        {activeTab === "description" && (
                            <p className="text-gray-800 leading-relaxed text-lg">
                                {product.description}
                            </p>
                        )}

                        {activeTab === "features" && (
                            <div className="grid md:grid-cols-2 gap-4">
                                {["უმაღლესი ხარისხი", "სწრაფი მიწოდება", "დაცული გადახდა", "დაბრუნება"].map(
                                    (f, i) => (
                                        <div key={i} className="p-4 bg-gray-50 rounded-lg flex items-center">
                                            <CheckCircle className="w-5 h-5 text-black mr-3" />
                                            <span className="text-black">{f}</span>
                                        </div>
                                    )
                                )}
                            </div>
                        )}

                        {activeTab === "specifications" && (
                            <div className="divide-y divide-gray-200">
                                <div className="flex justify-between py-3 text-black">
                                    <span className="font-medium">კატეგორია</span>
                                    <span>{product.category?.name || "უცნობი"}</span>
                                </div>
                                <div className="flex justify-between py-3 text-black">
                                    <span className="font-medium">ფასი</span>
                                    <span>₾{getSelectedPrice().toFixed(2)}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </div>

    )
}

export default ProductPage