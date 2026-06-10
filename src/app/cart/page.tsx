"use client"
import React, { useCallback, useEffect, useState } from 'react'
import Image from '@/component/AppImage'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ShoppingCart, Trash2, ArrowLeft } from 'lucide-react'
import { useCart } from '@/hooks/useCart'
import { formatDate } from '@/utils/dateUtils'
import DeliveryOptions, { DeliveryCityOption } from '@/components/DeliveryOptions'
import { DeliverySpeedOption, DeliveryType, getDeliverySpeedLabel } from '@/lib/delivery'
import { showToast } from '@/utils/toast'

const defaultPickupAddress = 'ლეო დავითაშვილის ქუჩა 120, 0190 თბილისი, საქართველო'

const CartPage = () => {
    const router = useRouter()
    const {
        cart,
        cartItems,
        removeFromCart,
        getTotalPrice,
        getDeliveryPrice,
        getTotalWithDelivery,
        updateCartDelivery,
        clearCart,
        loading,
        initialized,
    } = useCart()

    const [deliveryCities, setDeliveryCities] = useState<DeliveryCityOption[]>([])
    const [loadingCities, setLoadingCities] = useState(false)
    const [deliveryType, setDeliveryType] = useState<DeliveryType>('pickup')
    const [selectedCityId, setSelectedCityId] = useState<number | null>(null)
    const [deliverySpeed, setDeliverySpeed] = useState<DeliverySpeedOption | null>(null)
    const [savingDelivery, setSavingDelivery] = useState(false)

    const sellerPickupAddress =
        cartItems
            .map((item) => item.sellerPickupAddress)
            .find((address) => address && address.trim() !== '') || null
    const pickupAddress = sellerPickupAddress || defaultPickupAddress

    const fetchDeliveryCities = useCallback(async () => {
        try {
            setLoadingCities(true)
            const response = await fetch('/api/delivery-cities', { cache: 'no-store' })
            const data = await response.json()
            if (data.success) {
                setDeliveryCities(data.cities || [])
            }
        } catch (error) {
            console.error('Error fetching delivery cities:', error)
        } finally {
            setLoadingCities(false)
        }
    }, [])

    useEffect(() => {
        fetchDeliveryCities()
    }, [fetchDeliveryCities])

    useEffect(() => {
        if (!cart?.delivery) return
        setDeliveryType(cart.delivery.type)
        setSelectedCityId(cart.delivery.cityId)
        setDeliverySpeed(cart.delivery.speed)
    }, [cart?.delivery])

    const persistDelivery = async (
        nextType: DeliveryType,
        nextCityId: number | null,
        nextSpeed: DeliverySpeedOption | null,
    ) => {
        setSavingDelivery(true)
        const result = await updateCartDelivery({
            deliveryType: nextType,
            deliveryCityId: nextType === 'delivery' ? nextCityId : null,
            deliverySpeed: nextType === 'delivery' ? nextSpeed : null,
        })
        setSavingDelivery(false)

        if (!result.success) {
            showToast(result.message, 'error')
        }
    }

    const handleDeliveryTypeChange = async (type: DeliveryType) => {
        setDeliveryType(type)
        if (type === 'pickup') {
            setSelectedCityId(null)
            setDeliverySpeed(null)
            await persistDelivery('pickup', null, null)
            return
        }
    }

    const handleCityChange = async (cityId: number | null) => {
        setSelectedCityId(cityId)
        if (!cityId) {
            setDeliverySpeed(null)
            return
        }
        const nextSpeed = deliverySpeed || 'standard'
        setDeliverySpeed(nextSpeed)
        await persistDelivery('delivery', cityId, nextSpeed)
    }

    const handleSpeedChange = async (speed: DeliverySpeedOption) => {
        setDeliverySpeed(speed)
        if (selectedCityId) {
            await persistDelivery('delivery', selectedCityId, speed)
        }
    }

    const handleRemoveItem = async (id: number) => {
        await removeFromCart(id)
    }

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

    const deliveryReady =
        deliveryType === 'pickup' ||
        (deliveryType === 'delivery' && selectedCityId && deliverySpeed)

    return (
        <div className="min-h-screen  py-16">
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
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white rounded-2xl shadow-sm p-6">
                                <h2 className="text-xl font-semibold text-black mb-6">
                                    ნივთები ({cartItems.length})
                                </h2>

                                <div className="space-y-6">
                                    {cartItems.map((item) => (
                                            <div key={item.id} className="flex flex-col sm:flex-row text-center md:text-start items-center md:items-start gap-4 p-4 border border-gray-200 rounded-lg">
                                            <div className="relative w-full md:w-24 h-62 md:h-32 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
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
                                                <p className="text-black md:text-[18px] text-[16px]">
                                                    ზომა: <span className="font-medium">{item.size}</span>
                                                </p>

                                                {item.isRental && item.rentalStartDate && item.rentalEndDate && (
                                                    <div className="md:text-[18px] text-[16px] text-blue-600 mb-1">
                                                        <p>ქირაობის პერიოდი: {formatDate(item.rentalStartDate)} - {formatDate(item.rentalEndDate)}</p>
                                                        <p>დღეების რაოდენობა: {item.rentalDays}</p>
                                                    </div>
                                                )}

                                                {item.discount && item.discount > 0 ? (
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-lg font-bold text-black">
                                                                ₾{(item.price - item.discount).toFixed(2)}
                                                            </span>
                                                            <span className="text-base font-bold text-black line-through decoration-black opacity-60" style={{ textDecorationThickness: '2px' }}>
                                                                ₾{item.price.toFixed(2)}
                                                            </span>
                                                        </div>
                                                        <div className="bg-[#1B3729] rounded-md text-[#FFFFFF] font-regular flex items-center px-2 py-1 w-fit">
                                                            <span className="text-xs whitespace-nowrap">დანაზოგი: ₾{item.discount.toFixed(2)}</span>
                                                            {item.discountDays && (
                                                                <span className="bg-white text-black px-2 py-1 rounded ml-2 text-xs whitespace-nowrap">{item.discountDays} დღე</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="text-lg font-bold text-black">
                                                        ₾{item.price.toFixed(2)}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="text-center sm:self-auto self-start mt-0 md:mt-10">
                                                <span className="md:text-[18px] text-[16px] text-black">რაოდენობა:</span>
                                                <div className="font-medium text-black">1</div>
                                            </div>

                                            <button
                                                onClick={() => handleRemoveItem(item.id)}
                                                className="p-2 text-black mt-0  md:mt-10 hover:text-red-600 transition-colors"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl shadow-sm p-6">
                                <h2 className="text-xl font-semibold text-black mb-6">მიღება / მიტანა</h2>
                                <DeliveryOptions
                                    deliveryType={deliveryType}
                                    onDeliveryTypeChange={handleDeliveryTypeChange}
                                    deliveryCities={deliveryCities}
                                    loadingCities={loadingCities || savingDelivery}
                                    selectedCityId={selectedCityId}
                                    onCityChange={handleCityChange}
                                    deliverySpeed={deliverySpeed}
                                    onSpeedChange={handleSpeedChange}
                                    pickupAddress={pickupAddress}
                                    compact
                                />
                            </div>
                        </div>

                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-2xl shadow-sm p-6 lg:sticky lg:top-8">
                                <h2 className="text-xl font-semibold text-black mb-6">შეკვეთის შეჯამება</h2>

                                <div className="space-y-4 mb-6">
                                    <div className="flex justify-between text-black md:text-[18px] text-[16px]">
                                        <span>პროდუქტები:</span>
                                        <span className="font-medium">₾{getTotalPrice().toFixed(2)}</span>
                                    </div>
                                    {deliveryType === 'delivery' && getDeliveryPrice() > 0 && (
                                        <div className="flex justify-between text-black md:text-[18px] text-[16px]">
                                            <span>
                                                მიტანა
                                                {deliverySpeed ? ` (${getDeliverySpeedLabel(deliverySpeed)})` : ''}
                                            </span>
                                            <span className="font-medium">₾{getDeliveryPrice().toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-black md:text-[18px] text-[16px] border-t pt-4">
                                        <span className="font-semibold">ჯამი:</span>
                                        <span className="font-bold text-lg">₾{getTotalWithDelivery().toFixed(2)}</span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {deliveryReady ? (
                                        <Link
                                            href="/checkout"
                                            className="flex md:text-[18px] text-[16px] font-bold justify-center md:mt-14 items-center w-full mx-auto mt-4 bg-[#1B3729] text-white px-8 py-4 rounded-lg font-bold uppercase tracking-wide transition-colors duration-300"
                                        >
                                            შეკვეთის გაფორმება
                                        </Link>
                                    ) : (
                                        <button
                                            type="button"
                                            disabled
                                            className="flex md:text-[18px] text-[16px] font-bold justify-center md:mt-14 items-center w-full mx-auto mt-4 bg-gray-300 text-gray-600 px-8 py-4 rounded-lg font-bold uppercase tracking-wide cursor-not-allowed"
                                        >
                                            აირჩიეთ მიტანის ტიპი
                                        </button>
                                    )}

                                    <Link
                                        href="/shop"
                                        className="w-full md:text-[18px] text-[16px] bg-gray-100 text-black py-4 px-6 rounded-lg font-semibold text-lg hover:bg-gray-200 transition-colors text-center block"
                                    >
                                        მაღაზიაში დაბრუნება
                                    </Link>
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
