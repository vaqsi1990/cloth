"use client"
import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ShoppingCart, Plus, Minus, Trash2, ArrowLeft } from 'lucide-react'
import { useCart } from '@/context/CartContext'

const CartPage = () => {
    const { cartItems, removeFromCart, updateQuantity, getTotalPrice, clearCart } = useCart()

    const handleQuantityChange = (id: number, size: string, newQuantity: number) => {
        if (newQuantity <= 0) {
            removeFromCart(id, size)
        } else {
            updateQuantity(id, size, newQuantity)
        }
    }

    const handleRemoveItem = (id: number, size: string) => {
        removeFromCart(id, size)
    }

    if (cartItems.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 py-16">
                <div className="container mx-auto px-4">
                    <div className="max-w-2xl mx-auto text-center">
                        <div className="mb-8">
                            <ShoppingCart className="w-24 h-24 text-black mx-auto mb-4 opacity-50" />
                            <h1 className="text-3xl font-bold text-black mb-4">თქვენი კალათა ცარიელია</h1>
                            <p className="text-black text-lg mb-8">დაამატეთ ნივთები კალათაში შესაძენად</p>
                        </div>
                        <Link 
                            href="/shop" 
                            className="inline-flex items-center bg-black text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-800 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 mr-2" />
                            მაღაზიაში დაბრუნება
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 py-16">
            <div className="container mx-auto px-4">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <h1 className="text-3xl font-bold text-black">კალათა</h1>
                        <button
                            onClick={clearCart}
                            className="text-black hover:text-red-600 transition-colors font-medium"
                        >
                            კალათის გასუფთავება
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Cart Items */}
                        <div className="lg:col-span-2">
                            <div className="bg-white rounded-2xl shadow-sm p-6">
                                <h2 className="text-xl font-semibold text-black mb-6">
                                    ნივთები ({cartItems.length})
                                </h2>
                                
                                <div className="space-y-6">
                                    {cartItems.map((item) => (
                                        <div key={`${item.id}-${item.size}`} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                                            {/* Product Image */}
                                            <div className="relative w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                                <Image
                                                    src={item.image}
                                                    alt={item.name}
                                                    fill
                                                    className="object-cover"
                                                    sizes="80px"
                                                />
                                            </div>

                                            {/* Product Info */}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-lg font-medium text-black truncate">
                                                    {item.name}
                                                </h3>
                                                <p className="text-black text-sm">
                                                    ზომა: <span className="font-medium">{item.size}</span>
                                                </p>
                                                <p className="text-lg font-bold text-black">
                                                    ₾{item.price.toFixed(2)}
                                                </p>
                                            </div>

                                            {/* Quantity Controls */}
                                            <div className="flex items-center space-x-2">
                                                <button
                                                    onClick={() => handleQuantityChange(item.id, item.size, item.quantity - 1)}
                                                    className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                                                >
                                                    <Minus className="w-4 h-4 text-black" />
                                                </button>
                                                <span className="w-12 text-center font-medium text-black">
                                                    {item.quantity}
                                                </span>
                                                <button
                                                    onClick={() => handleQuantityChange(item.id, item.size, item.quantity + 1)}
                                                    className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                                                >
                                                    <Plus className="w-4 h-4 text-black" />
                                                </button>
                                            </div>

                                            {/* Remove Button */}
                                            <button
                                                onClick={() => handleRemoveItem(item.id, item.size)}
                                                className="p-2 text-black hover:text-red-600 transition-colors"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Order Summary */}
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-2xl shadow-sm p-6 sticky top-8">
                                <h2 className="text-xl font-semibold text-black mb-6">შეკვეთის შეჯამება</h2>
                                
                                <div className="space-y-4 mb-6">
                                    <div className="flex justify-between text-black">
                                        <span>ნივთების რაოდენობა:</span>
                                        <span className="font-medium">{cartItems.reduce((total, item) => total + item.quantity, 0)}</span>
                                    </div>
                                    <div className="flex justify-between text-black">
                                        <span>ჯამური ღირებულება:</span>
                                        <span className="font-bold text-lg">₾{getTotalPrice().toFixed(2)}</span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <Link 
                                        href="/checkout"
                                        className="w-full cursor-pointer bg-black text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-gray-800 transition-colors text-center block"
                                    >
                                        შეკვეთის გაფორმება
                                    </Link>
                                    
                                    <Link 
                                        href="/shop"
                                        className="w-full bg-gray-100 text-black py-4 px-6 rounded-lg font-semibold text-lg hover:bg-gray-200 transition-colors text-center block"
                                    >
                                        მაღაზიაში დაბრუნება
                                    </Link>
                                </div>

                                {/* Shipping Info */}
                                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                                    <h3 className="font-medium text-black mb-2">მიწოდების ინფორმაცია</h3>
                                    <p className="text-black text-sm">
                                        უფასო მიწოდება 50₾-ზე მეტი შეკვეთისთვის
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default CartPage
