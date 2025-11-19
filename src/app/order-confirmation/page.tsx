"use client"
import React, { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { CheckCircle, Package, ArrowLeft, Home, ShoppingBag } from 'lucide-react'
import { formatDate } from '@/utils/dateUtils'
import AnimatedDotsLoader from '@/component/AnimatedDotsLoader'

interface OrderItem {
    id: number
    productName: string
    image?: string
    size?: string
    price: number
    quantity: number
    isRental?: boolean
    rentalStartDate?: string
    rentalEndDate?: string
    rentalDays?: number
    deposit?: number
}

interface Order {
    id: number
    status: string
    total: number
    createdAt: string
    customerName: string
    email?: string
    phone: string
    address: string
    city?: string
    paymentMethod?: string
    items: OrderItem[]
}

const OrderConfirmationContent = () => {
    const searchParams = useSearchParams()
    const router = useRouter()
    const orderId = searchParams.get('orderId')
    
    const [order, setOrder] = useState<Order | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!orderId) {
            setError('შეკვეთის ID არ მოიძებნა')
            setLoading(false)
            return
        }

        const fetchOrder = async () => {
            try {
                const response = await fetch(`/api/orders/${orderId}`)
                const data = await response.json()
                
                if (!response.ok) {
                    setError(data.message || 'შეკვეთა ვერ მოიძებნა')
                    return
                }
                
                if (data.success && data.order) {
                    setOrder(data.order)
                } else {
                    setError(data.message || 'შეკვეთა ვერ მოიძებნა')
                }
            } catch (error) {
                console.error('Error fetching order:', error)
                setError('შეცდომა შეკვეთის მიღებისას. გთხოვთ სცადოთ მოგვიანებით.')
            } finally {
                setLoading(false)
            }
        }

        fetchOrder()
    }, [orderId])

    // if (loading) {
    //     return (
    //         <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center px-4">
    //             <AnimatedDotsLoader />
    //         </div>
    //     )
    // }

    if (error || !order) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 py-16">
                <div className="container mx-auto px-4">
                    <div className="max-w-2xl mx-auto text-center">
                        <div className="mb-8">
                            <Package className="w-24 h-24 text-black mx-auto mb-4 opacity-50" />
                            <h1 className="text-3xl font-bold text-black mb-4">
                                {error || 'შეკვეთა ვერ მოიძებნა'}
                            </h1>
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

    const getStatusLabel = (status: string) => {
        const statusMap: Record<string, string> = {
            PENDING: 'მოლოდინში',
            PAID: 'გადახდილი',
            SHIPPED: 'გაგზავნილი',
            CANCELED: 'გაუქმებული',
            REFUNDED: 'დაბრუნებული'
        }
        return statusMap[status] || status
    }

    const getStatusColor = (status: string) => {
        const colorMap: Record<string, string> = {
            PENDING: 'bg-yellow-100 text-yellow-800',
            PAID: 'bg-green-100 text-green-800',
            SHIPPED: 'bg-blue-100 text-blue-800',
            CANCELED: 'bg-red-100 text-red-800',
            REFUNDED: 'bg-gray-100 text-gray-800'
        }
        return colorMap[status] || 'bg-gray-100 text-gray-800'
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 py-16">
            <div className="container mx-auto px-4">
                <div className="max-w-4xl mx-auto">
                    {/* Success Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
                            <CheckCircle className="w-12 h-12 text-green-600" />
                        </div>
                        <h1 className="text-3xl font-bold text-black mb-2">
                            შეკვეთა წარმატებით გაფორმდა!
                        </h1>
                        <p className="text-black text-lg">
                            გმადლობთ თქვენი შეკვეთისთვის
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Order Details */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Order Info Card */}
                            <div className="bg-white rounded-2xl shadow-sm p-6">
                                <h2 className="text-xl font-semibold text-black mb-6">შეკვეთის ინფორმაცია</h2>
                                
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                                        <span className="text-black font-medium">შეკვეთის ნომერი:</span>
                                        <span className="text-black font-bold">#{order.id}</span>
                                    </div>
                                    
                                    <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                                        <span className="text-black font-medium">სტატუსი:</span>
                                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                                            {getStatusLabel(order.status)}
                                        </span>
                                    </div>
                                    
                                    <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                                        <span className="text-black font-medium">თარიღი:</span>
                                        <span className="text-black">{formatDate(order.createdAt)}</span>
                                    </div>
                                    
                                    <div className="flex justify-between items-center">
                                        <span className="text-black font-medium">გადახდის მეთოდი:</span>
                                        <span className="text-black">
                                            {order.paymentMethod === 'card' ? 'ბანკის ბარათი' : 
                                             order.paymentMethod === 'cash' ? 'ნაღდი ფული' : 
                                             order.paymentMethod === 'transfer' ? 'ბანკის გადარიცხვა' : 
                                             order.paymentMethod || 'არ არის მითითებული'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Customer Info Card */}
                            <div className="bg-white rounded-2xl shadow-sm p-6">
                                <h2 className="text-xl font-semibold text-black mb-6">მიწოდების ინფორმაცია</h2>
                                
                                <div className="space-y-3">
                                    <div>
                                        <span className="text-black text-sm">სახელი:</span>
                                        <p className="text-black font-medium">{order.customerName}</p>
                                    </div>
                                    {order.email && (
                                        <div>
                                            <span className="text-black text-sm">ელ. ფოსტა:</span>
                                            <p className="text-black font-medium">{order.email}</p>
                                        </div>
                                    )}
                                    <div>
                                        <span className="text-black text-sm">ტელეფონი:</span>
                                        <p className="text-black font-medium">{order.phone}</p>
                                    </div>
                                    <div>
                                        <span className="text-black text-sm">მისამართი:</span>
                                        <p className="text-black font-medium">{order.address}</p>
                                    </div>
                                    {order.city && (
                                        <div>
                                            <span className="text-black text-sm">ქალაქი:</span>
                                            <p className="text-black font-medium">{order.city}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Order Items */}
                            <div className="bg-white rounded-2xl shadow-sm p-6">
                                <h2 className="text-xl font-semibold text-black mb-6">
                                    შეკვეთილი ნივთები ({order.items.length})
                                </h2>
                                
                                <div className="space-y-4">
                                    {order.items.map((item) => (
                                        <div key={item.id} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                                            <div className="relative w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                                <Image
                                                    src={item.image || '/placeholder.jpg'}
                                                    alt={item.productName}
                                                    fill
                                                    className="object-cover"
                                                    sizes="80px"
                                                />
                                                {item.isRental && (
                                                    <div className="absolute top-1 right-1 bg-blue-500 text-white text-xs px-1 py-0.5 rounded">
                                                        ქირა
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-lg font-medium text-black truncate">
                                                    {item.productName}
                                                </h3>
                                                <p className="text-black text-sm">
                                                    ზომა: <span className="font-medium">{item.size}</span>
                                                </p>
                                                
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
                                            
                                            <div className="text-center">
                                                <span className="text-sm text-black">რაოდენობა:</span>
                                                <div className="font-medium text-black">{item.quantity}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Order Summary Sidebar */}
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-2xl shadow-sm p-6 sticky top-8">
                                <h2 className="text-xl font-semibold text-black mb-6">შეკვეთის შეჯამება</h2>
                                
                                <div className="space-y-4 mb-6">
                                    <div className="flex justify-between text-black">
                                        <span>ყიდვის ნივთები:</span>
                                        <span className="font-medium">
                                            {order.items.filter(item => !item.isRental).reduce((total, item) => total + item.quantity, 0)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-black">
                                        <span>ქირაობის ნივთები:</span>
                                        <span className="font-medium">
                                            {order.items.filter(item => item.isRental).length}
                                        </span>
                                    </div>
                                    <div className="border-t border-gray-200 pt-4">
                                        <div className="flex justify-between text-black">
                                            <span className="font-semibold">ჯამური ღირებულება:</span>
                                            <span className="font-bold text-lg">₾{order.total.toFixed(2)}</span>
                                        </div>
                                    </div>
                                    {order.items.some(item => item.isRental && item.deposit && item.deposit > 0) && (
                                        <div className="flex justify-between text-blue-600">
                                            <span>გირაო (ქირაობისთვის):</span>
                                            <span className="font-medium">
                                                ₾{order.items.filter(item => item.isRental).reduce((total, item) => total + (item.deposit || 0), 0).toFixed(2)}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <Link
                                        href="/shop"
                                        className="flex items-center justify-center w-full bg-[#1B3729] text-white px-8 py-4 rounded-lg font-bold uppercase tracking-wide transition-colors duration-300 hover:opacity-95"
                                    >
                                        <ShoppingBag className="w-5 h-5 mr-2" />
                                        გაგრძელება შოპინგი
                                    </Link>
                                    
                                    <Link
                                        href="/"
                                        className="flex items-center md:text-[18px] text-[16px] justify-center w-full bg-gray-100 text-black py-4 px-6 rounded-lg font-semibold text-lg hover:bg-gray-200 transition-colors"
                                    >
                                        <Home className="w-5 h-5 mr-2" />
                                        მთავარ გვერდზე დაბრუნება
                                    </Link>
                                </div>

                                {/* Info Box */}
                                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                                    <h3 className="font-medium text-black mb-2">რა ხდება შემდეგ?</h3>
                                    <p className="text-black text-sm">
                                        თქვენი შეკვეთა მიღებულია და მუშავდება. შეკვეთის სტატუსის განახლებებს მიიღებთ ელ. ფოსტაზე.
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

const OrderConfirmationPage = () => {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center px-4">
                    <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
                </div>
            }
        >
            <OrderConfirmationContent />
        </Suspense>
    )
}

export default OrderConfirmationPage
