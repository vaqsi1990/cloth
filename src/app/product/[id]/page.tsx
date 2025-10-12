"use client"
import React, { useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { Star, ShoppingCart, Heart, Truck, Shield, RotateCcw, ArrowLeft, Share2, Eye, MessageCircle, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import productsData from '@/data/products.json'

const ProductPage = () => {
    const params = useParams()
    const productId = params.id as string
    
    const [selectedSize, setSelectedSize] = useState<string>('')
    const [quantity, setQuantity] = useState(1)
    const [activeImage, setActiveImage] = useState(0)
    const [activeTab, setActiveTab] = useState('description')
    const [isWishlisted, setIsWishlisted] = useState(false)

    // Get product data from JSON
    const getProductById = (id: string) => {
        return productsData.products.find(product => product.id === parseInt(id)) || null
    }

    const product = getProductById(productId)

    // Handle size selection
    const handleSizeSelect = (size: string) => {
        setSelectedSize(size)
    }


    // Handle quantity change
    const handleQuantityChange = (newQuantity: number) => {
        if (newQuantity >= 1 && newQuantity <= (product?.stockCount || 0)) {
            setQuantity(newQuantity)
        }
    }

    // Add to cart
    const addToCart = () => {
        if (!selectedSize) {
            alert('გთხოვთ აირჩიოთ ზომა')
            return
        }
        // Add to cart logic here
        alert('პროდუქტი დაემატა კალათაში')
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
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 gi-product-tab px-3 gi-products">
            {/* Header with Navigation */}
            <div className=" gi-product-tab px-3 gi-products  sticky top-0 z-40">
                <div className="flex pt-5 flex-wrap justify-between items-center mx-auto min-[1600px]:max-w-[1600px] min-[1400px]:max-w-[1320px] min-[1200px]:max-w-[1140px] min-[992px]:max-w-[960px] min-[768px]:max-w-[720px] min-[576px]:max-w-[540px]">
                    <div className="flex items-center justify-between">
                        <Link 
                            href="/" 
                            className="inline-flex items-center text-black hover:text-black transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 mr-2" />
                            უკან დაბრუნება
                        </Link>
                        
                     
                    </div>
                </div>
            </div>

            <div className="gi-product-tab px-3 gi-products flex mt-10 flex-wrap justify-between items-center mx-auto min-[1600px]:max-w-[1600px] min-[1400px]:max-w-[1320px] min-[1200px]:max-w-[1140px] min-[992px]:max-w-[960px] min-[768px]:max-w-[720px] min-[576px]:max-w-[540px]">
                {/* Main Product Section */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 mb-16">
                    {/* Product Images */}
                    <div className="space-y-6">
                        {/* Main Image */}
                        <div className="relative aspect-square bg-white rounded-2xl overflow-hidden shadow-xl border border-gray-100">
                            <Image
                                src={product.images[activeImage]}
                                alt={product.name}
                                fill
                                className="object-cover transition-transform duration-700 hover:scale-110"
                                priority
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 40vw"
                            />
                            
                            {/* Image Badges */}
                            <div className="absolute top-4 left-4 flex flex-col space-y-2 z-10">
                                {product.hasSale && (
                                    <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg transform hover:scale-105 transition-transform duration-200">
                                        SALE
                                    </span>
                                )}
                                {product.isNew && (
                                    <span className="bg-teal-500 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg transform hover:scale-105 transition-transform duration-200">
                                        NEW
                                    </span>
                                )}
                            </div>
                            
                            {/* Image Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
                        </div>
                        
                        {/* Thumbnail Images */}
                        <div className="grid grid-cols-4 gap-3">
                            {product.images.map((image, index) => (
                                <button
                                    key={index}
                                    onClick={() => setActiveImage(index)}
                                    className={`relative w-full h-20 bg-white rounded-lg overflow-hidden border-2 transition-all duration-300 hover:scale-105 ${
                                        activeImage === index 
                                            ? 'border-teal-500 ring-2 ring-teal-200 shadow-lg' 
                                            : 'border-gray-200 hover:border-teal-300 hover:shadow-md'
                                    }`}
                                >
                                    <Image
                                        src={image}
                                        alt={`${product.name} ${index + 1}`}
                                        fill
                                        className="object-cover transition-transform duration-300 hover:scale-110"
                                        sizes="(max-width: 768px) 80px, 80px"
                                    />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Product Info */}
                    <div className="space-y-8">
                        {/* Product Header */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm">
                            <h1 className="text-4xl font-bold text-black mb-4">{product.name}</h1>
                            
                            <div className="flex items-center space-x-4 mb-4">
                                <div className="flex items-center">
                                    {[...Array(5)].map((_, i) => (
                                        <Star
                                            key={i}
                                            className={`w-6 h-6 ${
                                                i < product.rating ? "text-yellow-400 fill-current" : "text-black"
                                            }`}
                                        />
                                    ))}
                                </div>
                                <span className="text-black text-lg">({product.rating} შეფასება)</span>
                            </div>

                            <div className="flex items-center space-x-4 mb-6">
                                <span className="text-4xl font-bold text-black">
                                    ₾{product.currentPrice.toFixed(2)}
                                </span>
                                {product.originalPrice > product.currentPrice && (
                                    <span className="text-2xl text-black line-through">
                                        ₾{product.originalPrice.toFixed(2)}
                                    </span>
                                )}
                            </div>

                            <p className="text-black text-lg leading-relaxed">{product.description}</p>
                        </div>

                        {/* Selection Options */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-6">
                            {/* Size Selection */}
                            <div>
                                <h3 className="text-lg font-semibold text-black mb-3">ზომა</h3>
                                <div className="grid grid-cols-4 gap-3">
                                    {product.sizes.map((size) => (
                                        <button
                                            key={size}
                                            onClick={() => handleSizeSelect(size)}
                                            className={`py-4 px-4 text-center rounded-xl border-2 transition-all font-medium ${
                                                selectedSize === size
                                                    ? "border-black bg-black text-white shadow-md"
                                                    : "border-gray-300 hover:border-black text-black hover:bg-gray-50"
                                            }`}
                                        >
                                            {size}
                                        </button>
                                    ))}
                                </div>
                            </div>

                       

                            {/* Quantity */}
                            <div>
                                <h3 className="text-lg font-semibold text-black mb-3">რაოდენობა</h3>
                                <div className="flex items-center space-x-4">
                                    <button
                                        onClick={() => handleQuantityChange(quantity - 1)}
                                        className="w-12 h-12 rounded-xl border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                                    >
                                        -
                                    </button>
                                    <span className="w-20 text-center text-xl font-medium">{quantity}</span>
                                    <button
                                        onClick={() => handleQuantityChange(quantity + 1)}
                                        className="w-12 h-12 rounded-xl border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                                    >
                                        +
                                    </button>
                                    <span className="text-sm text-black">
                                        ხელმისაწვდომია: <span className="font-medium">{product.stockCount}</span>
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                            <button
                                onClick={addToCart}
                                disabled={!selectedSize}
                                className="w-full bg-black  text-white py-5 px-6 rounded-xl font-semibold md:text-[20px] text-[18px] transition-all duration-300 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                            >
                                <ShoppingCart className="w-6 h-6 inline mr-3" />
                                კალათაში დამატება
                            </button>
                      

                        {/* Product Benefits */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm">
                            <div className="space-y-4">
                                <div className="flex items-center text-black">
                                    <Truck className="w-6 h-6 mr-4 text-black" />
                                    <div>
                                        <div className="font-medium">უფასო მიწოდება</div>
                                        <div className="text-sm">50₾-ზე მეტი შეკვეთისთვის</div>
                                    </div>
                                </div>
                                <div className="flex items-center text-black">
                                    <Shield className="w-6 h-6 mr-4 text-black" />
                                    <div>
                                        <div className="font-medium">უსაფრთხო გადახდა</div>
                                        <div className="text-sm">SSL დაცული გადახდები</div>
                                    </div>
                                </div>
                                <div className="flex items-center text-black">
                                    <RotateCcw className="w-6 h-6 mr-4 text-black" />
        <div>
                                        <div className="font-medium">30 დღიანი დაბრუნება</div>
                                        <div className="text-sm">უფასო დაბრუნება</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs Section */}
                <div className="bg-white mx-auto rounded-2xl shadow-sm mb-16">
                    <div className="border-b border-black">
                        <nav className="flex space-x-8 px-6">
                            {[
                                { id: 'description', label: 'აღწერა', icon: Eye },
                                { id: 'features', label: 'მახასიათებლები', icon: CheckCircle },
                                { id: 'specifications', label: 'სპეციფიკაციები', icon: MessageCircle },
                               
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`py-6 px-1 border-b-2 font-medium text-sm transition-colors ${
                                        activeTab === tab.id
                                            ? 'border-black text-black'
                                            : 'border-transparent text-black hover:text-black hover:border-black'
                                    }`}
                                >
                                    <tab.icon className="w-5 h-5 inline mr-2" />
                                    {tab.label}
                                </button>
                            ))}
                        </nav>
                    </div>

                    <div className="p-6">
                        {activeTab === 'description' && (
                            <div className="prose max-w-none">
                                <p className="text-black leading-relaxed text-lg">{product.description}</p>
                            </div>
                        )}

                        {activeTab === 'features' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {product.features.map((feature, index) => (
                                    <div key={index} className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                                        <CheckCircle className="w-5 h-5 text-black flex-shrink-0" />
                                        <span className="text-black">{feature}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === 'specifications' && (
                            <div className="space-y-4">
                                {Object.entries(product.specifications).map(([key, value]) => (
                                    <div key={key} className="flex justify-between py-3 border-b border-gray-200">
                                        <span className="font-medium text-black">{key}</span>
                                        <span className="text-black">{value}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === 'reviews' && (
                            <div className="space-y-6">
                                {product.reviews.map((review) => (
                                    <div key={review.id} className="border-b border-gray-200 pb-6 last:border-b-0">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
                                                    <span className="text-black font-medium">{review.user[0]}</span>
                                                </div>
                                                <div>
                                                    <div className="font-medium text-black">{review.user}</div>
                                                    <div className="text-sm text-black">{review.date}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star
                                                        key={i}
                                                        className={`w-4 h-4 ${
                                                            i < review.rating ? "text-yellow-400 fill-current" : "text-black"
                                                        }`}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                        <p className="text-black">{review.comment}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ProductPage