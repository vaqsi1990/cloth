"use client"
import React, { useState } from 'react'
import Image from 'next/image'
import { useCart } from '@/hooks/useCart'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CreditCard, MapPin, Phone, Mail, User } from 'lucide-react'
import Link from 'next/link'

const CheckoutPage = () => {
    const { cartItems, getTotalPrice, getTotalItems, clearCart } = useCart()
    const router = useRouter()
    
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        paymentMethod: 'card'
    })
    
    const [isProcessing, setIsProcessing] = useState(false)

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsProcessing(true)
        
        try {
            // Prepare order data
            const orderData = {
                customerName: `${formData.firstName} ${formData.lastName}`,
                phone: formData.phone,
                email: formData.email,
                address: formData.address,
                city: formData.city,
                paymentMethod: formData.paymentMethod,
                items: cartItems.map(item => ({
                    productId: item.productId,
                    productName: item.productName,
                    image: item.image,
                    size: item.size,
                    price: item.price,
                    quantity: item.quantity,
                    // Include rental information if it's a rental item
                    isRental: item.isRental || false,
                    rentalStartDate: item.rentalStartDate || null,
                    rentalEndDate: item.rentalEndDate || null,
                    rentalDays: item.rentalDays || null,
                    deposit: item.deposit || null
                }))
            }

            // Send order to API
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(orderData),
            })

            const result = await response.json()

            if (result.success) {
                alert('შეკვეთა წარმატებით გაფორმდა!')
                clearCart()
                router.push('/')
            } else {
                alert(result.message || 'შეცდომა შეკვეთის გაფორმებისას')
            }
        } catch (error) {
            console.error('Error submitting order:', error)
            alert('მოულოდნელი შეცდომა')
        } finally {
            setIsProcessing(false)
        }
    }

    if (cartItems.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-[20px] text-black font-bold mb-4">კალათა ცარიელია</h1>
                    <Link 
                        href="/shop"
                        className="bg-black text-white px-6 py-3 rounded-lg text-[20px] text-black hover:bg-gray-800 transition-colors"
                    >
                        მაღაზიაში დაბრუნება
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <Link 
                        href="/cart"
                        className="flex items-center text-[20px] text-black hover:text-gray-600 mb-4"
                    >
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        კალათაში დაბრუნება
                    </Link>
                    <h1 className="text-[20px] text-black font-bold">შეკვეთის გაფორმება</h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Order Form */}
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h2 className="text-[20px] text-black font-semibold mb-6">მიწოდების ინფორმაცია</h2>
                        
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Personal Information */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[20px] text-black font-medium mb-2">
                                        <User className="w-4 h-4 inline mr-2" />
                                        სახელი
                                    </label>
                                    <input
                                        type="text"
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[20px] text-black font-medium mb-2">
                                        გვარი
                                    </label>
                                    <input
                                        type="text"
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black"
                                    />
                                </div>
                            </div>

                            {/* Contact Information */}
                            <div>
                                <label className="block text-[20px] text-black font-medium mb-2">
                                    <Mail className="w-4 h-4 inline mr-2" />
                                    ელ. ფოსტა
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black"
                                />
                            </div>

                            <div>
                                <label className="block text-[20px] text-black font-medium mb-2">
                                    <Phone className="w-4 h-4 inline mr-2" />
                                    ტელეფონი
                                </label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black"
                                />
                            </div>

                            {/* Address Information */}
                            <div>
                                <label className="block text-[20px] text-black font-medium mb-2">
                                    <MapPin className="w-4 h-4 inline mr-2" />
                                    მისამართი
                                </label>
                                <input
                                    type="text"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black"
                                />
                            </div>

                            <div>
                                <label className="block text-[20px] text-black font-medium mb-2">ქალაქი</label>
                                <input
                                    type="text"
                                    name="city"
                                    value={formData.city}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black"
                                />
                            </div>

                            {/* Payment Method */}
                            <div>
                                <label className="block text-[20px] text-black font-medium mb-2">
                                    <CreditCard className="w-4 h-4 inline mr-2" />
                                    გადახდის მეთოდი
                                </label>
                                <select
                                    name="paymentMethod"
                                    value={formData.paymentMethod}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black"
                                >
                                    <option value="card">ბანკის ბარათი</option>
                                    <option value="cash">ნაღდი ფული</option>
                                    <option value="transfer">ბანკის გადარიცხვა</option>
                                </select>
                            </div>

                            <button
                                type="submit"
                                disabled={isProcessing}
                                className="flex md:text-[20px] text-[18px] font-bold justify-center md:mt-14 items-center w-full cursor-pointer mx-auto mt-4 bg-[#1B3729] text-white px-8 py-4 rounded-lg font-bold uppercase tracking-wide  transition-colors duration-300"
                            >
                                {isProcessing ? 'მუშავდება...' : 'შეკვეთის დადასტურება'}
                            </button>
                        </form>
                    </div>

                    {/* Order Summary */}
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h2 className="text-[20px] text-black font-semibold mb-6">შეკვეთის დეტალები</h2>
                        
                        {/* Items */}
                        <div className="space-y-4 mb-6">
                            {cartItems.map((item) => (
                                <div key={item.id} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                                    <div className="relative w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                                        <Image
                                            src={item.image || '/placeholder.jpg'}
                                            alt={item.productName}
                                            width={64}
                                            height={64}
                                            className="w-full h-full object-cover"
                                        />
                                        {/* Rental Badge */}
                                        {item.isRental && (
                                            <div className="absolute top-1 right-1 bg-blue-500 text-white text-xs px-1 py-0.5 rounded">
                                                ქირა
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-[20px] text-black font-medium">{item.productName}</h3>
                                        <p className="text-[20px] text-black text-gray-600">ზომა: {item.size}</p>
                                        
                                        {/* Rental Information */}
                                        {item.isRental && item.rentalStartDate && item.rentalEndDate && (
                                            <div className="text-sm text-blue-600 mt-1">
                                                <p>ქირაობის პერიოდი: {new Date(item.rentalStartDate).toLocaleDateString('ka-GE')} - {new Date(item.rentalEndDate).toLocaleDateString('ka-GE')}</p>
                                                <p>დღეების რაოდენობა: {item.rentalDays} დღე</p>
                                                {item.deposit && item.deposit > 0 && (
                                                    <p>გირაო: ₾{item.deposit.toFixed(2)}</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[20px] text-black font-semibold">₾{(item.price * item.quantity).toFixed(2)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Summary */}
                        <div className="border-t border-gray-200 pt-4 space-y-2">
                            <div className="flex justify-between text-[20px] text-black">
                                <span>ყიდვის ნივთები:</span>
                                <span>{cartItems.filter(item => !item.isRental).reduce((total, item) => total + item.quantity, 0)}</span>
                            </div>
                            <div className="flex justify-between text-[20px] text-black">
                                <span>ქირაობის ნივთები:</span>
                                <span>{cartItems.filter(item => item.isRental).length}</span>
                            </div>
                            <div className="flex justify-between text-[20px] text-black font-semibold">
                                <span>სულ თანხა:</span>
                                <span>₾{getTotalPrice().toFixed(2)}</span>
                            </div>
                            {/* Show total deposit if any rental items have deposits */}
                            {cartItems.some(item => item.isRental && item.deposit && item.deposit > 0) && (
                                <div className="flex justify-between text-[20px] text-blue-600">
                                    <span>გირაო (ქირაობისთვის):</span>
                                    <span>₾{cartItems.filter(item => item.isRental).reduce((total, item) => total + (item.deposit || 0), 0).toFixed(2)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default CheckoutPage
