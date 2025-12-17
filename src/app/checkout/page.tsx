"use client"
import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { useCart } from '@/hooks/useCart'
import { useRouter } from 'next/navigation'
import { ArrowLeft, MapPin, Phone, Mail, User, ShoppingCart, Truck, Store } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/utils/dateUtils'
import { showToast } from '@/utils/toast'
import GooglePayButton from '@/component/GooglePayButton'

interface DeliveryCity {
    id: number
    name: string
    price: number
    isActive: boolean
}

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
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
    
    const [isProcessing, setIsProcessing] = useState(false)
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'google_pay'>('card')
    const [deliveryType, setDeliveryType] = useState<'pickup' | 'delivery'>('pickup')
    const [deliveryCities, setDeliveryCities] = useState<DeliveryCity[]>([])
    const [selectedDeliveryCityId, setSelectedDeliveryCityId] = useState<number | null>(null)
    const [loadingCities, setLoadingCities] = useState(false)

    const georgianTextRegex = /^[\u10A0-\u10FF\s.,\-'():;!?/\\"]+$/
    const georgianAddressRegex = /^[\u10A0-\u10FF\s0-9№N.,\-'():;!?/\\"#]+$/

    // Fixed pickup address
    const pickupAddress = 'ლეო დავითაშვილის ქუჩა 120, 0190 თბილისი, საქართველო'

    // Fetch delivery cities
    useEffect(() => {
        const fetchDeliveryCities = async () => {
            try {
                setLoadingCities(true)
                const response = await fetch('/api/delivery-cities')
                const data = await response.json()
                
                if (data.success) {
                    setDeliveryCities(data.cities)
                }
            } catch (error) {
                console.error('Error fetching delivery cities:', error)
            } finally {
                setLoadingCities(false)
            }
        }

        fetchDeliveryCities()
    }, [])

    // Get selected delivery city
    const selectedDeliveryCity = deliveryCities.find(city => city.id === selectedDeliveryCityId)
    const deliveryPrice = selectedDeliveryCity ? selectedDeliveryCity.price : 0

    // Calculate total with delivery
    const getTotalWithDelivery = () => {
        const baseTotal = getTotalPrice()
        return deliveryType === 'delivery' && selectedDeliveryCity ? baseTotal + deliveryPrice : baseTotal
    }

    const clearFieldError = (field: string) => {
        setFieldErrors(prev => {
            if (!prev[field]) return prev
            const next = { ...prev }
            delete next[field]
            return next
        })
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))

        if (['firstName', 'lastName', 'city'].includes(name)) {
            if (value && !georgianTextRegex.test(value)) {
                const fieldName = name === 'firstName' ? 'სახელი' : name === 'lastName' ? 'გვარი' : 'ქალაქი'
                setFieldErrors(prev => ({
                    ...prev,
                    [name]: `${fieldName} უნდა შეიცავდეს ქართულ სიმბოლოებს`
                }))
            } else {
                clearFieldError(name)
            }
        } else if (name === 'address') {
            if (value && !georgianAddressRegex.test(value)) {
                setFieldErrors(prev => ({
                    ...prev,
                    address: 'მისამართი უნდა შეიცავდეს ქართულ სიმბოლოებს, ციფრებს და სასვენი ნიშნებს'
                }))
            } else if (value && !/[0-9]/.test(value)) {
                setFieldErrors(prev => ({
                    ...prev,
                    address: 'მისამართი უნდა შეიცავდეს ციფრებს'
                }))
            } else {
                clearFieldError('address')
            }
        }
    }

    const validateCheckoutFields = () => {
        const errors: Record<string, string> = {}

        if (!formData.firstName || !georgianTextRegex.test(formData.firstName.trim())) {
            errors.firstName = 'სახელი უნდა შეიცავდეს ქართულ სიმბოლოებს'
        }

        if (!formData.lastName || !georgianTextRegex.test(formData.lastName.trim())) {
            errors.lastName = 'გვარი უნდა შეიცავდეს ქართულ სიმბოლოებს'
        }

        // Validate delivery-specific fields
        if (deliveryType === 'delivery') {
            if (!selectedDeliveryCityId) {
                errors.deliveryCity = 'გთხოვთ აირჩიოთ მიტანის ქალაქი'
            }
        }

        // City and address validation only for delivery
        if (deliveryType === 'delivery') {
            if (!formData.city || !georgianTextRegex.test(formData.city.trim())) {
                errors.city = 'ქალაქი უნდა შეიცავდეს ქართულ სიმბოლოებს'
            }

            if (!formData.address || !georgianAddressRegex.test(formData.address.trim())) {
                errors.address = 'მისამართი უნდა შეიცავდეს ქართულ სიმბოლოებს, ციფრებს და სასვენი ნიშნებს'
            } else if (!/[0-9]/.test(formData.address)) {
                errors.address = 'მისამართი უნდა შეიცავდეს ციფრებს'
            }
        }

        setFieldErrors(errors)

        if (Object.keys(errors).length > 0) {
            showToast('გთხოვთ შეავსოთ ყველა ველი ქართულად', 'error')
            return false
        }

        return true
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
        if (!validateCheckoutFields()) {
            setIsProcessing(false)
            return
        }
        
        try {
            // Step 1: Get BOG token
            const token = await getToken()

            // Step 2: Prepare order data for BOG
            const totalAmount = getTotalWithDelivery()
            const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`

            // Determine delivery address
            const deliveryAddress = deliveryType === 'pickup' 
                ? pickupAddress 
                : `${formData.address}, ${formData.city}`

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
                deliveryType: 'pickup' | 'delivery'
                deliveryCityId?: number | null
                deliveryPrice?: number
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
                deliveryOption: deliveryAddress,
                deliveryType: deliveryType,
                deliveryCityId: deliveryType === 'delivery' ? selectedDeliveryCityId : null,
                deliveryPrice: deliveryType === 'delivery' ? deliveryPrice : 0,
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

            // Calculate split payment amounts (9% admin, 91% seller)
            // Note: Delivery fee goes 100% to admin
            const baseAmount = getTotalPrice()
            const adminAmount = (baseAmount * 0.09) + (deliveryType === 'delivery' ? deliveryPrice : 0)
            const sellerAmount = baseAmount * 0.91
            
            console.log('💰 Split Payment Breakdown:')
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
            console.log(`📊 მთლიანი თანხა: ₾${totalAmount.toFixed(2)}`)
            console.log(`👤 ადმინის ნაწილი (9%): ₾${adminAmount.toFixed(2)}`)
            console.log(`✍️ ავტორის ნაწილი (91%): ₾${sellerAmount.toFixed(2)}`)
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

            // Step 3: Create payment order
            console.log('📤 [CHECKOUT] Sending order creation request...')
            console.log('📤 [CHECKOUT] Order data:', {
                totalAmount: orderData.totalAmount,
                itemsCount: orderData.cart.items.length,
                productIds: orderData.cart.items.map(i => i.productId),
                paymentMethod: orderData.paymentMethod || 'card'
            })
            
            const res = await fetch('/api/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    orderData
                }),
            })

            const data = await res.json()

            // Log full response for debugging
            console.log('📡 API Response Status:', res.status)
            console.log('📡 API Response Data:', JSON.stringify(data, null, 2))

            if (!res.ok) {
                console.error('❌ API Error Response:', {
                    status: res.status,
                    statusText: res.statusText,
                    data: data
                })
            }

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
                console.error('❌ Payment order creation failed:', {
                    status: res.status,
                    data: data,
                    error: data.error,
                    details: data.details
                })
                
                const errorMessage = data.error 
                    || data.message 
                    || (data.details && typeof data.details === 'string' ? data.details : 'დაფიქსირდა შეცდომა გადახდის დაწყებისას')
                
                showToast(errorMessage, 'error')
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
        if (!validateCheckoutFields()) {
            return
        }

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
    //         <div className="min-h-screen  flex items-center justify-center px-4">
    //             <AnimatedDotsLoader />
    //         </div>
    //     )
    // }

    if (initialized && !loading && cartItems.length === 0) {
        return (
            <div className="min-h-screen  py-16">
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
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="inline-flex items-center bg-black text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-800 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 mr-2" />
                            მაღაზიაში დაბრუნება
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    const hasErrors = Object.keys(fieldErrors).length > 0
    const requiredFieldsFilled = deliveryType === 'pickup' 
        ? Object.values({
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            email: formData.email.trim(),
            phone: formData.phone.trim()
        }).every(Boolean)
        : Object.values({
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            email: formData.email.trim(),
            phone: formData.phone.trim(),
            address: formData.address.trim(),
            city: formData.city.trim()
        }).every(Boolean) && selectedDeliveryCityId !== null

    return (
        <div className="min-h-screen  py-16">
            <div className="container mx-auto px-4">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="flex items-center cursor-pointer md:text-[18px] text-[16px] text-black hover:text-black mb-4 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 mr-2" />
                            კალათაში დაბრუნება
                        </button>
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
                                        <label className="block md:text-[18px] text-[16px] text-black font-medium mb-2">
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
                                        {fieldErrors.firstName && (
                                            <p className="text-red-500 md:text-[18px] text-[16px] mt-1">{fieldErrors.firstName}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block md:text-[18px] text-[16px] text-black font-medium mb-2">
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
                                        {fieldErrors.lastName && (
                                            <p className="text-red-500 md:text-[18px] text-[16px] mt-1">{fieldErrors.lastName}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Contact Information */}
                                <div>
                                    <label className="block md:text-[18px] text-[16px] text-black font-medium mb-2">
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
                                    <label className="block md:text-[18px] text-[16px] text-black font-medium mb-2">
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

                                {/* Delivery Type Selection */}
                                <div className="mb-6">
                                    <h3 className="md:text-[18px] text-[16px] font-semibold text-black mb-4">მიწოდების ტიპი</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <label className={`flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                                            deliveryType === 'pickup' 
                                                ? 'border-[#1B3729] bg-[#1B3729]/5' 
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}>
                                            <input
                                                type="radio"
                                                name="deliveryType"
                                                value="pickup"
                                                checked={deliveryType === 'pickup'}
                                                onChange={(e) => {
                                                    setDeliveryType(e.target.value as 'pickup' | 'delivery')
                                                    setSelectedDeliveryCityId(null)
                                                }}
                                                className="w-5 h-5 text-[#1B3729] focus:ring-[#1B3729]"
                                            />
                                            <Store className="w-5 h-5 text-black" />
                                            <span className="text-black font-medium">ადგილზე</span>
                                        </label>
                                        <label className={`flex items-center space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                                            deliveryType === 'delivery' 
                                                ? 'border-[#1B3729] bg-[#1B3729]/5' 
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}>
                                            <input
                                                type="radio"
                                                name="deliveryType"
                                                value="delivery"
                                                checked={deliveryType === 'delivery'}
                                                onChange={(e) => setDeliveryType(e.target.value as 'pickup' | 'delivery')}
                                                className="w-5 h-5 text-[#1B3729] focus:ring-[#1B3729]"
                                            />
                                            <Truck className="w-5 h-5 text-black" />
                                            <span className="text-black font-medium">მიტანით</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Address Information */}
                                {deliveryType === 'pickup' ? (
                                    <div>
                                        <label className="block md:text-[18px] text-[16px] text-black font-medium mb-2">
                                            <MapPin className="w-4 h-4 inline mr-2" />
                                            მისამართი
                                        </label>
                                        <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-black">
                                            {pickupAddress}
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div>
                                            <label className="block md:text-[18px] text-[16px] text-black font-medium mb-2">
                                                <MapPin className="w-4 h-4 inline mr-2" />
                                                მიტანის ქალაქი *
                                            </label>
                                            <select
                                                name="deliveryCity"
                                                value={selectedDeliveryCityId || ''}
                                                onChange={(e) => {
                                                    const cityId = e.target.value ? parseInt(e.target.value, 10) : null
                                                    setSelectedDeliveryCityId(cityId)
                                                    if (cityId) {
                                                        const city = deliveryCities.find(c => c.id === cityId)
                                                        if (city) {
                                                            setFormData(prev => ({ ...prev, city: city.name }))
                                                        }
                                                    }
                                                    clearFieldError('deliveryCity')
                                                }}
                                                required
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-[#1B3729]"
                                            >
                                                <option value="">აირჩიეთ ქალაქი</option>
                                                {deliveryCities.map(city => (
                                                    <option key={city.id} value={city.id}>
                                                        {city.name} - ₾{city.price.toFixed(2)}
                                                    </option>
                                                ))}
                                            </select>
                                            {fieldErrors.deliveryCity && (
                                                <p className="text-red-500 md:text-[18px] text-[16px] mt-1">{fieldErrors.deliveryCity}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block md:text-[18px] text-[16px] text-black font-medium mb-2">
                                                <MapPin className="w-4 h-4 inline mr-2" />
                                                მისამართი *
                                            </label>
                                            <input
                                                type="text"
                                                name="address"
                                                value={formData.address}
                                                onChange={handleInputChange}
                                                required
                                                placeholder="მაგ: ქუჩის სახელი, სახლის ნომერი"
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-[#1B3729]"
                                            />
                                            {fieldErrors.address && (
                                                <p className="text-red-500 md:text-[18px] text-[16px] mt-1">{fieldErrors.address}</p>
                                            )}
                                        </div>
                                    </>
                                )}

                                {/* Payment Method Selection */}
                                <div className="mb-6">
                                    <h3 className="md:text-[18px] text-[16px] font-semibold text-black mb-4">გადახდის მეთოდი</h3>
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
                                        disabled={isProcessing || hasErrors || !requiredFieldsFilled || (deliveryType === 'delivery' && !selectedDeliveryCityId)}
                                        className="flex cursor-pointer md:text-[18px] text-[16px] font-bold justify-center items-center w-full mx-auto mt-6 bg-[#1B3729] text-white px-8 py-4 rounded-lg font-bold uppercase tracking-wide transition-colors duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed hover:opacity-95"
                                    >
                                        {isProcessing ? 'მუშავდება...' : 'ბარათით ყიდვა'}
                                    </button>
                                ) : (
                                    <div className="mt-6">
                                        <GooglePayButton
                                            totalAmount={getTotalWithDelivery()}
                                            currency="GEL"
                                            onPaymentSuccess={handleGooglePaySuccess}
                                            onError={handleGooglePayError}
                                            disabled={isProcessing || hasErrors || !requiredFieldsFilled || (deliveryType === 'delivery' && !selectedDeliveryCityId)}
                                        />
                                    </div>
                                )}
                                </form>
                            </div>
                        </div>

                        {/* Order Summary */}
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-2xl shadow-sm p-6 sticky top-8">
                                <h2 className="md:text-[18px] text-[16px] font-semibold text-black mb-6">შეკვეთის შეჯამება</h2>
                                
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
                                                <h3 className="md:text-[18px] text-[16px] font-medium text-black truncate">{item.productName}</h3>
                                                <p className="text-black md:text-[18px] text-[16px]">
                                                    ზომა: <span className="font-medium">{item.size}</span>
                                                </p>
                                                
                                                {/* Rental Information */}
                                                {item.isRental && item.rentalStartDate && item.rentalEndDate && (
                                                    <div className="md:text-[18px] text-[16px] text-blue-600 mb-1">
                                                        <p>ქირაობის პერიოდი: {formatDate(item.rentalStartDate)} - {formatDate(item.rentalEndDate)}</p>
                                                        <p>დღეების რაოდენობა: {item.rentalDays}</p>
                                                    </div>
                                                )}
                                                
                                                {item.discount && item.discount > 0 ? (
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="md:text-[18px] text-[16px] font-bold text-black">
                                                                ფასი: ₾{((item.price - item.discount) * item.quantity).toFixed(2)}
                                                            </span>
                                                            <span className="md:text-[16px] text-[14px] font-bold text-black line-through decoration-black opacity-60" style={{ textDecorationThickness: '2px' }}>
                                                                ₾{(item.price * item.quantity).toFixed(2)}
                                                            </span>
                                                        </div>
                                                        <div className="bg-[#228460] rounded-md text-[#FFFFFF] font-regular flex items-center px-2 py-1 w-fit">
                                                            <span className="text-xs whitespace-nowrap">დანაზოგი: ₾{(item.discount * item.quantity).toFixed(2)}</span>
                                                            {item.discountDays && (
                                                                <span className="bg-white text-black px-2 py-1 rounded ml-2 text-xs whitespace-nowrap">{item.discountDays} დღე</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="md:text-[18px] text-[16px]  text-black">
                                                      ფასი:  ₾{(item.price * item.quantity).toFixed(2)}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Summary */}
                                <div className="border-t border-gray-200 pt-4 space-y-4 mb-6">
                                    <div className="flex justify-between text-black md:text-[18px] text-[16px]">
                                        <span>ყიდვის ნივთები:</span>
                                        <span className="font-medium">{cartItems.filter(item => !item.isRental).reduce((total, item) => total + item.quantity, 0)}</span>
                                    </div>
                                    <div className="flex justify-between text-black md:text-[18px] text-[16px]">
                                        <span>ქირაობის ნივთები:</span>
                                        <span className="font-medium">{cartItems.filter(item => item.isRental).length}</span>
                                    </div>
                                    <div className="flex justify-between text-black md:text-[18px] text-[16px]">
                                        <span>ნივთების ჯამი:</span>
                                        <span className="font-medium">₾{getTotalPrice().toFixed(2)}</span>
                                    </div>
                                    {deliveryType === 'delivery' && selectedDeliveryCity && (
                                        <div className="flex justify-between text-black md:text-[18px] text-[16px]">
                                            <span>მიტანის ფასი:</span>
                                            <span className="font-medium">₾{deliveryPrice.toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-black md:text-[18px] text-[16px] border-t border-gray-300 pt-4 mt-2">
                                        <span className="font-bold">ჯამური ღირებულება:</span>
                                        <span className="font-bold text-lg">₾{getTotalWithDelivery().toFixed(2)}</span>
                                    </div>
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
