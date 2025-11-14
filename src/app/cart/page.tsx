"use client"
import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ShoppingCart, Plus, Minus, Trash2, ArrowLeft } from 'lucide-react'
import { useCart } from '@/hooks/useCart'
import { formatDate } from '@/utils/dateUtils'
import AnimatedDotsLoader from '@/component/AnimatedDotsLoader'
const CartPage = () => {
    const { cartItems, removeFromCart, updateQuantity, getTotalPrice, clearCart, loading, initialized } = useCart()
    const handleQuantityChange = async (id: number, newQuantity: number) => {
        if (newQuantity <= 0) {
            await removeFromCart(id)
        } else {
            await updateQuantity(id, newQuantity)
        }
    }

    const handleRemoveItem = async (id: number) => {
        await removeFromCart(id)
    }
    // if (loading) {
    //     return (
    //         <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center px-4">
    //             <AnimatedDotsLoader />
    //         </div>
    //     )
    // }

    if (initialized && !loading && cartItems.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 py-16">
                <div className="container mx-auto px-4">
                    <div className="max-w-2xl mx-auto text-center">
                        <div className="mb-8">
                            <ShoppingCart className="w-24 h-24 text-black mx-auto mb-4 opacity-50" />
                            <h1 className="text-3xl font-bold text-black mb-4">
                                თქვენი კალათა ცარიელია
                            </h1>
                            <p className="text-black text-lg mb-8">
                                დაამატეთ ნივთები კალათაში შესაძენად
                            </p>
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
                                        <div key={item.id} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                                            {/* Product Image */}
                                            <div className="relative w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                                <Image
                                                    src={item.image || '/placeholder.jpg'}
                                                    alt={item.productName}
                                                    fill
                                                    className="object-cover"
                                                    sizes="80px"
                                                />
                                                {/* Rental Badge */}
                                                {item.isRental && (
                                                    <div className="absolute top-1 right-1 bg-blue-500 text-white text-xs px-1 py-0.5 rounded">
                                                        ქირა
                                                    </div>
                                                )}
                                            </div>

                                            {/* Product Info */}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-lg font-medium text-black truncate">
                                                    {item.productName}
                                                </h3>
                                                <p className="text-black მდ:ტეხტ-[18px] text-[16px]">
                                                    ზომა: <span className="font-medium">{item.size}</span>
                                                </p>

                                                {/* Rental Information */}
                                                {item.isRental && item.rentalStartDate && item.rentalEndDate && (
                                                    <div className="md:text-[18px] text-[16px] text-blue-600 mb-1">
                                                        <p>ქირაობის პერიოდი: {formatDate(item.rentalStartDate)} - {formatDate(item.rentalEndDate)}</p>
                                                        <p>დღეების რაოდენობა: {item.rentalDays}</p>
                                                        {item.deposit && item.deposit > 0 && (
                                                            <p>გირაო: ₾{item.deposit.toFixed(2)}</p>
                                                        )}
                                                    </div>
                                                )}

                                                <p className="text-lg font-bold text-black">
                                                    ₾{item.price.toFixed(2)}
                                                </p>
                                            </div>

                                            {/* Quantity Controls - Only show for non-rental items */}
                                            {!item.isRental && (
                                                <div className="flex items-center space-x-2">
                                                    <button
                                                        onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                                                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                                                    >
                                                        <Minus className="w-4 h-4 text-black" />
                                                    </button>
                                                    <span className="w-12 text-center font-medium text-black">
                                                        {item.quantity}
                                                    </span>
                                                    <button
                                                        onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                                                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                                                    >
                                                        <Plus className="w-4 h-4 text-black" />
                                                    </button>
                                                </div>
                                            )}

                                            {/* Rental items show quantity as 1 */}
                                            {item.isRental && (
                                                <div className="text-center">
                                                    <span className="md:text-[18px] text-[16px] text-black">რაოდენობა:</span>
                                                    <div className="font-medium text-black">1</div>
                                                </div>
                                            )}

                                            {/* Remove Button */}
                                            <button
                                                onClick={() => handleRemoveItem(item.id)}
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
                                    <div className="flex justify-between text-black md:text-[18px] text-[16px]">
                                        <span>ყიდვის ნივთები:</span>
                                        <span className="font-medium">{cartItems.filter(item => !item.isRental).reduce((total, item) => total + item.quantity, 0)}</span>
                                    </div>
                                    <div className="flex justify-between text-black md:text-[18px] text-[16px]">
                                        <span>ქირაობის ნივთები:</span>
                                        <span className="font-medium">{cartItems.filter(item => item.isRental).length}</span>
                                    </div>
                                    <div className="flex justify-between text-black md:text-[18px] text-[16px]">
                                        <span>ჯამური ღირებულება:</span>
                                        <span className="font-bold text-lg">₾{getTotalPrice().toFixed(2)}</span>
                                    </div>
                                    {/* Show total deposit if any rental items have deposits */}
                                    {cartItems.some(item => item.isRental && item.deposit && item.deposit > 0) && (
                                        <div className="flex justify-between text-blue-600 md:text-[18px] text-[16px]">
                                            <span>გირაო (ქირაობისთვის):</span>
                                            <span className="font-medium">₾{cartItems.filter(item => item.isRental).reduce((total, item) => total + (item.deposit || 0), 0).toFixed(2)}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <Link
                                        href="/checkout"
                                        className="flex md:text-[18px] text-[16px] font-bold justify-center md:mt-14 items-center w-full mx-auto mt-4 bg-[#1B3729] text-white px-8 py-4 rounded-lg font-bold uppercase tracking-wide  transition-colors duration-300"
                                    >
                                        შეკვეთის გაფორმება
                                    </Link>

                                    <Link
                                        href="/shop"
                                        className="w-full md:text-[18px] text-[16px] bg-gray-100 text-black py-4 px-6 rounded-lg font-semibold text-lg hover:bg-gray-200 transition-colors text-center block"
                                    >
                                        მაღაზიაში დაბრუნება
                                    </Link>
                                </div>

                                {/* Shipping Info */}
                                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                                    <h3 className="font-medium text-black md:text-[18px] text-[16px] mb-2">მიწოდების ინფორმაცია</h3>
                                    <p className="text-black md:text-[18px] text-[16px]">
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
