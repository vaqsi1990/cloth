"use client"
import React, { useState } from 'react'
import Image from 'next/image'
import { useCart } from '@/hooks/useCart'
import { useRouter } from 'next/navigation'
import { ArrowLeft, MapPin, Phone, Mail, User, ShoppingCart } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/utils/dateUtils'
import { showToast } from '@/utils/toast'
import GooglePayButton from '@/component/GooglePayButton'

const CheckoutPage = () => {
    const { cartItems, getTotalPrice, loading, initialized } = useCart()
    const router = useRouter()
    
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        city: ''
    })
    
    const [isProcessing, setIsProcessing] = useState(false)
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'google_pay'>('card')

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const getToken = async () => {
        try {
            const res = await fetch('/api/token')
            const data = await res.json()

            if (!data.success) {
                throw new Error(data.error || 'Failed to get token')
            }

            return data.access_token
        } catch (error) {
            console.error('Token error:', error)
            throw new Error('Failed to get BOG access token')
        }
    }

    const processOrder = async (googlePayToken?: string) => {
        setIsProcessing(true)
        
        try {
            // Step 1: Get BOG token
            const token = await getToken()

            // Step 2: Prepare order data for BOG
            const totalAmount = getTotalPrice()
            const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`

            const orderData: {
                cart: {
                    items: Array<{
                        productId: string
                        qty: number
                        price: number
                        name: string
                        image: string | undefined
                    }>
                }
                totalAmount: number
                orderId: string
                deliveryOption: string
                address: {
                    firstName: string
                    lastName: string
                    email: string
                }
                paymentMethod?: 'google_pay' | 'card'
                googlePayToken?: string
            } = {
                cart: {
                    items: cartItems.map(item => ({
                        productId: String(item.productId),
                        qty: item.quantity,
                        price: item.price,
                        name: item.productName,
                        image: item.image
                    }))
                },
                totalAmount: totalAmount,
                orderId: orderId,
                deliveryOption: `${formData.address}, ${formData.city}`,
                address: {
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    email: formData.email
                }
            }

            // Add Google Pay configuration if using Google Pay
            if (paymentMethod === 'google_pay' && googlePayToken) {
                orderData.paymentMethod = 'google_pay'
                orderData.googlePayToken = googlePayToken
            }

            // Step 3: Create payment order
            const res = await fetch('/api/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    orderData
                }),
            })

            const data = await res.json()

            if (data.success) {
                if (data.redirectUrl) {
                    // Store payment info as backup
                    sessionStorage.setItem('pendingPayment', JSON.stringify({
                        redirectUrl: data.redirectUrl,
                        orderId: data.orderId,
                        bogOrderId: data.bogOrderId
                    }))
                    
                    // Redirect to BOG payment page (component will unmount, so no need to reset state)
                    window.location.href = data.redirectUrl
                } else if (data.orderId) {
                    // Google Pay payment completed, redirect to confirmation
                    router.push(`/order-confirmation?orderId=${data.orderId}`)
                } else {
                    showToast('გადახდა წარმატებით დასრულდა', 'success')
                }
            } else {
                console.error('Payment order creation failed:', data)
                showToast(data.error || 'დაფიქსირდა შეცდომა გადახდის დაწყებისას', 'error')
                setIsProcessing(false)
            }
        } catch (error) {
            console.error('Error submitting order:', error)
            const errorMessage = error instanceof Error ? error.message : 'მოულოდნელი შეცდომა'
            showToast(errorMessage, 'error')
            setIsProcessing(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (paymentMethod === 'google_pay') {
            // Google Pay will be handled by the button's onPaymentSuccess callback
            return
        }
        await processOrder()
    }

    const handleGooglePaySuccess = async (paymentData: {
        paymentMethodData: {
            tokenizationData: {
                token: string
            }
        }
    }) => {
        try {
            // Extract the payment token from Google Pay response
            const paymentMethodData = paymentData.paymentMethodData
            const token = paymentMethodData.tokenizationData.token
            
            // Process order with Google Pay token
            await processOrder(token)
        } catch (error) {
            console.error('Error processing Google Pay:', error)
            showToast('დაფიქსირდა შეცდომა Google Pay გადახდის დამუშავებისას', 'error')
            setIsProcessing(false)
        }
    }

    const handleGooglePayError = (error: Error) => {
        console.error('Google Pay error:', error)
        showToast('Google Pay-ის გამოყენებისას დაფიქსირდა შეცდომა', 'error')
        setIsProcessing(false)
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
                    {/* Header */}
                    <div className="mb-8">
                        <Link 
                            href="/cart"
                            className="flex items-center text-black hover:text-gray-600 mb-4 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 mr-2" />
                            კალათაში დაბრუნება
                        </Link>
                        <h1 className="text-3xl font-bold text-black">შეკვეთის გაფორმება</h1>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Order Form */}
                        <div className="lg:col-span-2">
                            <div className="bg-white rounded-2xl shadow-sm p-6">
                                <h2 className="text-xl font-semibold text-black mb-6">მიწოდების ინფორმაცია</h2>
                        
                        <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Personal Information */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-black font-medium mb-2">
                                            <User className="w-4 h-4 inline mr-2" />
                                            სახელი
                                        </label>
                                        <input
                                            type="text"
                                            name="firstName"
                                            value={formData.firstName}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-[#1B3729]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-black font-medium mb-2">
                                            გვარი
                                        </label>
                                        <input
                                            type="text"
                                            name="lastName"
                                            value={formData.lastName}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-[#1B3729]"
                                        />
                                    </div>
                                </div>

                                {/* Contact Information */}
                                <div>
                                    <label className="block text-black font-medium mb-2">
                                        <Mail className="w-4 h-4 inline mr-2" />
                                        ელ. ფოსტა
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-[#1B3729]"
                                    />
                                </div>

                                <div>
                                    <label className="block text-black font-medium mb-2">
                                        <Phone className="w-4 h-4 inline mr-2" />
                                        ტელეფონი
                                    </label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-[#1B3729]"
                                    />
                                </div>

                                {/* Address Information */}
                                <div>
                                    <label className="block text-black font-medium mb-2">
                                        <MapPin className="w-4 h-4 inline mr-2" />
                                        მისამართი
                                    </label>
                                    <input
                                        type="text"
                                        name="address"
                                        value={formData.address}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-[#1B3729]"
                                    />
                                </div>

                                <div>
                                    <label className="block text-black font-medium mb-2">ქალაქი</label>
                                    <input
                                        type="text"
                                        name="city"
                                        value={formData.city}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-[#1B3729]"
                                    />
                                </div>

                                {/* Payment Method Selection */}
                                <div className="mb-6">
                                    <h3 className="text-lg font-semibold text-black mb-4">გადახდის მეთოდი</h3>
                                    <div className="space-y-3">
                                        <label className="flex items-center space-x-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-[#1B3729] transition-colors">
                                            <input
                                                type="radio"
                                                name="paymentMethod"
                                                value="card"
                                                checked={paymentMethod === 'card'}
                                                onChange={(e) => setPaymentMethod(e.target.value as 'card' | 'google_pay')}
                                                className="w-5 h-5 text-[#1B3729] focus:ring-[#1B3729]"
                                            />
                                            <span className="text-black font-medium">ბანკის ბარათი</span>
                                        </label>
                                        <label className="flex items-center space-x-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-[#1B3729] transition-colors">
                                            <input
                                                type="radio"
                                                name="paymentMethod"
                                                value="google_pay"
                                                checked={paymentMethod === 'google_pay'}
                                                onChange={(e) => setPaymentMethod(e.target.value as 'card' | 'google_pay')}
                                                className="w-5 h-5 text-[#1B3729] focus:ring-[#1B3729]"
                                            />
                                            <span className="text-black font-medium">Google Pay</span>
                                        </label>
                                    </div>
                                </div>

                                {paymentMethod === 'card' ? (
                                    <button
                                        type="submit"
                                        disabled={isProcessing}
                                        className="flex md:text-[20px] text-[18px] font-bold justify-center items-center w-full mx-auto mt-6 bg-[#1B3729] text-white px-8 py-4 rounded-lg font-bold uppercase tracking-wide transition-colors duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed hover:opacity-95"
                                    >
                                        {isProcessing ? 'მუშავდება...' : 'ბარათით ყიდვა'}
                                    </button>
                                ) : (
                                    <div className="mt-6">
                                        <GooglePayButton
                                            totalAmount={getTotalPrice()}
                                            currency="GEL"
                                            onPaymentSuccess={handleGooglePaySuccess}
                                            onError={handleGooglePayError}
                                            disabled={isProcessing}
                                        />
                                    </div>
                                )}
                                </form>
                            </div>
                        </div>

                        {/* Order Summary */}
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-2xl shadow-sm p-6 sticky top-8">
                                <h2 className="text-xl font-semibold text-black mb-6">შეკვეთის შეჯამება</h2>
                                
                                {/* Items */}
                                <div className="space-y-4 mb-6">
                                    {cartItems.map((item) => (
                                        <div key={item.id} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
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
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-lg font-medium text-black truncate">{item.productName}</h3>
                                                <p className="text-black text-sm">
                                                    ზომა: <span className="font-medium">{item.size}</span>
                                                </p>
                                                
                                                {/* Rental Information */}
                                                {item.isRental && item.rentalStartDate && item.rentalEndDate && (
                                                    <div className="text-sm text-blue-600 mb-1">
                                                        <p>ქირაობის პერიოდი: {formatDate(item.rentalStartDate)} - {formatDate(item.rentalEndDate)}</p>
                                                        <p>დღეების რაოდენობა: {item.rentalDays}</p>
                                                        {item.deposit && item.deposit > 0 && (
                                                            <p>გირაო: ₾{item.deposit.toFixed(2)}</p>
                                                        )}
                                                    </div>
                                                )}
                                                
                                                <p className="text-lg font-bold text-black">
                                                    ₾{(item.price * item.quantity).toFixed(2)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Summary */}
                                <div className="border-t border-gray-200 pt-4 space-y-4 mb-6">
                                    <div className="flex justify-between text-black">
                                        <span>ყიდვის ნივთები:</span>
                                        <span className="font-medium">{cartItems.filter(item => !item.isRental).reduce((total, item) => total + item.quantity, 0)}</span>
                                    </div>
                                    <div className="flex justify-between text-black">
                                        <span>ქირაობის ნივთები:</span>
                                        <span className="font-medium">{cartItems.filter(item => item.isRental).length}</span>
                                    </div>
                                    <div className="flex justify-between text-black">
                                        <span>ჯამური ღირებულება:</span>
                                        <span className="font-bold text-lg">₾{getTotalPrice().toFixed(2)}</span>
                                    </div>
                                    {/* Show total deposit if any rental items have deposits */}
                                    {cartItems.some(item => item.isRental && item.deposit && item.deposit > 0) && (
                                        <div className="flex justify-between text-blue-600">
                                            <span>გირაო (ქირაობისთვის):</span>
                                            <span className="font-medium">₾{cartItems.filter(item => item.isRental).reduce((total, item) => total + (item.deposit || 0), 0).toFixed(2)}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Shipping Info */}
                                <div className="p-4 bg-gray-50 rounded-lg">
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

export default CheckoutPage
