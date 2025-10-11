"use client"
import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { Star, ShoppingCart, Heart, Truck, Shield, RotateCcw, ArrowLeft, Share2, Eye, MessageCircle, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import productsData from '@/data/products.json'

const ProductPage = () => {
    const params = useParams()
    const productId = params.id as string
    
    const [selectedSize, setSelectedSize] = useState<string>('')
    const [selectedColor, setSelectedColor] = useState<string>('')
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

    // Handle color selection
    const handleColorSelect = (color: string) => {
        setSelectedColor(color)
    }

    // Handle quantity change
    const handleQuantityChange = (newQuantity: number) => {
        if (newQuantity >= 1 && newQuantity <= product?.stockCount!) {
            setQuantity(newQuantity)
        }
    }

    // Add to cart
    const addToCart = () => {
        if (!selectedSize || !selectedColor) {
            alert('გთხოვთ აირჩიოთ ზომა და ფერი')
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
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">პროდუქტი ვერ მოიძებნა</h1>
                    <Link href="/shop" className="text-teal-600 hover:text-teal-700">
                        დაბრუნდი მაღაზიაში
                    </Link>
                </div>
            </div>
        )
    }

    const colorLabels: { [key: string]: string } = {
        black: "შავი",
        white: "თეთრი",
        red: "წითელი",
        blue: "ლურჯი",
        green: "მწვანე",
        yellow: "ყვითელი",
        pink: "ვარდისფერი",
        purple: "იისფერი",
        gray: "ნაცრისფერი",
        brown: "ყავისფერი"
    }

    const colorHex: { [key: string]: string } = {
        black: "#000000",
        white: "#FFFFFF",
        red: "#FF0000",
        blue: "#0000FF",
        green: "#008000",
        yellow: "#FFFF00",
        pink: "#FFC0CB",
        purple: "#800080",
        gray: "#808080",
        brown: "#A52A2A"
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header with Navigation */}
            <div className="bg-white shadow-sm border-b sticky top-0 z-40">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <Link 
                            href="/shop" 
                            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 mr-2" />
                            დაბრუნდი მაღაზიაში
                        </Link>
                        
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={shareProduct}
                                className="p-2 text-gray-600 hover:text-teal-600 transition-colors"
                                title="გაზიარება"
                            >
                                <Share2 className="w-5 h-5" />
                            </button>
                            <button
                                onClick={toggleWishlist}
                                className={`p-2 transition-colors ${
                                    isWishlisted 
                                        ? 'text-red-500 hover:text-red-600' 
                                        : 'text-gray-600 hover:text-red-500'
                                }`}
                                title="ფავორიტები"
                            >
                                <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-current' : ''}`} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8">
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
                            <h1 className="text-4xl font-bold text-gray-900 mb-4">{product.name}</h1>
                            
                            <div className="flex items-center space-x-4 mb-4">
                                <div className="flex items-center">
                                    {[...Array(5)].map((_, i) => (
                                        <Star
                                            key={i}
                                            className={`w-6 h-6 ${
                                                i < product.rating ? "text-yellow-400 fill-current" : "text-gray-300"
                                            }`}
                                        />
                                    ))}
                                </div>
                                <span className="text-gray-600 text-lg">({product.rating} შეფასება)</span>
                            </div>

                            <div className="flex items-center space-x-4 mb-6">
                                <span className="text-4xl font-bold text-teal-600">
                                    ₾{product.currentPrice.toFixed(2)}
                                </span>
                                {product.originalPrice > product.currentPrice && (
                                    <span className="text-2xl text-gray-400 line-through">
                                        ₾{product.originalPrice.toFixed(2)}
                                    </span>
                                )}
                            </div>

                            <p className="text-gray-600 text-lg leading-relaxed">{product.description}</p>
                        </div>

                        {/* Selection Options */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-6">
                            {/* Size Selection */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">ზომა</h3>
                                <div className="grid grid-cols-4 gap-3">
                                    {product.sizes.map((size) => (
                                        <button
                                            key={size}
                                            onClick={() => handleSizeSelect(size)}
                                            className={`py-4 px-4 text-center rounded-xl border-2 transition-all font-medium ${
                                                selectedSize === size
                                                    ? "border-teal-500 bg-teal-50 text-teal-700 shadow-md"
                                                    : "border-gray-300 hover:border-teal-400 text-gray-700 hover:bg-gray-50"
                                            }`}
                                        >
                                            {size}
                                        </button>
                                    ))}
                                </div>
                            </div>

                       

                            {/* Quantity */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">რაოდენობა</h3>
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
                                    <span className="text-sm text-gray-600">
                                        ხელმისაწვდომია: <span className="font-medium">{product.stockCount}</span>
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                            <button
                                onClick={addToCart}
                                disabled={!selectedSize || !selectedColor}
                                className="w-full bg-teal-600 text-white py-5 px-6 rounded-xl font-semibold text-xl hover:bg-teal-700 transition-all duration-300 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                            >
                                <ShoppingCart className="w-6 h-6 inline mr-3" />
                                კალათაში დამატება
                            </button>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={toggleWishlist}
                                    className={`py-4 px-6 rounded-xl font-medium transition-all duration-300 ${
                                        isWishlisted
                                            ? 'bg-red-50 text-red-600 border-2 border-red-200 hover:bg-red-100'
                                            : 'border-2 border-gray-300 text-gray-700 hover:border-teal-500 hover:text-teal-600'
                                    }`}
                                >
                                    <Heart className={`w-5 h-5 inline mr-2 ${isWishlisted ? 'fill-current' : ''}`} />
                                    {isWishlisted ? 'ფავორიტებში' : 'ფავორიტები'}
                                </button>
                                
                                <button className="border-2 border-gray-300 text-gray-700 py-4 px-6 rounded-xl font-medium hover:border-teal-500 hover:text-teal-600 transition-all duration-300">
                                    <Eye className="w-5 h-5 inline mr-2" />
                                    სწრაფი ნახვა
                                </button>
                            </div>
                        </div>

                        {/* Product Benefits */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm">
                            <div className="space-y-4">
                                <div className="flex items-center text-gray-600">
                                    <Truck className="w-6 h-6 mr-4 text-teal-600" />
                                    <div>
                                        <div className="font-medium">უფასო მიწოდება</div>
                                        <div className="text-sm">50₾-ზე მეტი შეკვეთისთვის</div>
                                    </div>
                                </div>
                                <div className="flex items-center text-gray-600">
                                    <Shield className="w-6 h-6 mr-4 text-teal-600" />
                                    <div>
                                        <div className="font-medium">უსაფრთხო გადახდა</div>
                                        <div className="text-sm">SSL დაცული გადახდები</div>
                                    </div>
                                </div>
                                <div className="flex items-center text-gray-600">
                                    <RotateCcw className="w-6 h-6 mr-4 text-teal-600" />
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
                <div className="bg-white rounded-2xl shadow-sm mb-16">
                    <div className="border-b border-gray-200">
                        <nav className="flex space-x-8 px-6">
                            {[
                                { id: 'description', label: 'აღწერა', icon: Eye },
                                { id: 'features', label: 'მახასიათებლები', icon: CheckCircle },
                                { id: 'specifications', label: 'სპეციფიკაციები', icon: MessageCircle },
                                { id: 'reviews', label: 'მიმოხილვები', icon: Star }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`py-6 px-1 border-b-2 font-medium text-sm transition-colors ${
                                        activeTab === tab.id
                                            ? 'border-teal-500 text-teal-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
                                <p className="text-gray-600 leading-relaxed text-lg">{product.description}</p>
                            </div>
                        )}

                        {activeTab === 'features' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {product.features.map((feature, index) => (
                                    <div key={index} className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                                        <CheckCircle className="w-5 h-5 text-teal-600 flex-shrink-0" />
                                        <span className="text-gray-700">{feature}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === 'specifications' && (
                            <div className="space-y-4">
                                {Object.entries(product.specifications).map(([key, value]) => (
                                    <div key={key} className="flex justify-between py-3 border-b border-gray-200">
                                        <span className="font-medium text-gray-700">{key}</span>
                                        <span className="text-gray-600">{value}</span>
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
                                                <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                                                    <span className="text-teal-600 font-medium">{review.user[0]}</span>
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900">{review.user}</div>
                                                    <div className="text-sm text-gray-500">{review.date}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star
                                                        key={i}
                                                        className={`w-4 h-4 ${
                                                            i < review.rating ? "text-yellow-400 fill-current" : "text-gray-300"
                                                        }`}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                        <p className="text-gray-600">{review.comment}</p>
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