"use client"
import React, { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import {
    ArrowLeft,
    CalendarDays,
    CheckCircle,
    CreditCard,
    RotateCcw,
    Shield,
} from "lucide-react"
import { useCart } from "@/hooks/useCart"
import { useSession } from 'next-auth/react';

import { Product, RentalPeriod } from "@/types/product"
import { formatDate } from "@/utils/dateUtils"
import SimilarProducts from "@/components/SimilarProducts"

type Tier = { minDays: number; pricePerDay: number }

// Helper to normalize date to start of day
const startOfDay = (date: Date) => {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    return d
}

// Today at start of day
const startToday = startOfDay(new Date())

const ProductPage = () => {
    const params = useParams()
    const productId = params.id as string

    const { addToCart } = useCart()
    const { data: session, status } = useSession();

    const [product, setProduct] = useState<Product | null>(null)
    const [loading, setLoading] = useState(true)
    const [activeImage, setActiveImage] = useState(0)

    const [selectedSize, setSelectedSize] = useState<string>("")
    const [quantity, setQuantity] = useState(1)

    const [purchaseMode, setPurchaseMode] = useState<"buy" | "rent">("buy")
    const [rentalStartDate, setRentalStartDate] = useState("")
    const [rentalEndDate, setRentalEndDate] = useState("")
    const [isAdding, setIsAdding] = useState(false)
    const [userVerification, setUserVerification] = useState<{ status?: 'PENDING' | 'APPROVED' | 'REJECTED' } | null>(null);

    // Auto-switch to rent mode if product is rented
    useEffect(() => {
        if (product?.status === 'RENTED' && purchaseMode === 'buy') {
            setPurchaseMode('rent')
        }
    }, [product?.status, purchaseMode])

    // size => busy periods
    const [rentalStatus, setRentalStatus] = useState<Record<string, RentalPeriod[]>>({})

    // -------------------------
    // Fetch product + rental status
    // -------------------------
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [pRes, rRes] = await Promise.all([
                    fetch(`/api/products/${productId}`),
                    fetch(`/api/products/${productId}/rental-status`),
                ])
                const pJson = await pRes.json()
                const rJson = await rRes.json()

                if (pJson?.success) {
                    setProduct(pJson.product)
                }
                if (rJson?.success) {
                    const map: Record<string, RentalPeriod[]> = {}
                    rJson.variants?.forEach(
                        (v: { size: string; activeRentals?: RentalPeriod[] }) =>
                            (map[v.size] = v.activeRentals || [])
                    )
                    setRentalStatus(map)
                }
            } catch (e) {
                console.error(e)
            } finally {
                setLoading(false)
            }
        }
        if (productId) fetchData()
    }, [productId])

    useEffect(() => {
        // Fetch verification only if logged in
        if (session?.user?.id) {
            fetch('/api/user/verification')
                .then((r) => r.json())
                .then((d) => setUserVerification(d.verification || null));
        } else {
            setUserVerification(null);
        }
    }, [session?.user?.id]);

    // -------------------------
    // Helpers
    // -------------------------
    const tiers: Tier[] =
        (product?.rentalPriceTiers as Tier[] | undefined)?.sort(
            (a, b) => a.minDays - b.minDays
        ) ||
        [
            // fallback თუ API-დან არ მოდის ტირები
            { minDays: 4, pricePerDay: product?.pricePerDay || 20 },
            { minDays: 7, pricePerDay: (product?.pricePerDay || 20) * 0.6 },
            { minDays: 28, pricePerDay: (product?.pricePerDay || 20) * 0.4 },
        ]

    const minDaysGlobal = tiers.length ? Math.min(...tiers.map(t => t.minDays)) : 4

    const getMainImage = () =>
        product?.images?.[activeImage]?.url || product?.images?.[0]?.url || "/placeholder.jpg"

    const getAvailableSizes = () => product?.variants?.map(v => v.size) || []

    const hasActiveRentals = (size: string) => (rentalStatus[size] || []).length > 0

    const getRentalPeriods = (size: string) => rentalStatus[size] || []

    const firstAvailableSize = () =>
        product?.variants?.find(v => !hasActiveRentals(v.size))?.size || null

    useEffect(() => {
        if (product && !selectedSize) {
            // First try to find a size without active rentals, otherwise just pick the first size
            const sz = firstAvailableSize() || product.variants?.[0]?.size
            if (sz) {
                setSelectedSize(sz)
            }
        }
    }, [product, rentalStatus, selectedSize])

    // Debug product status
    useEffect(() => {
        if (product) {
            console.log('Product status:', product.status)
        }
    }, [product])

    const selectedVariant = product?.variants?.find(v => v.size === selectedSize)
    const selectedPrice = selectedVariant?.price ?? 0
    const selectedStock = selectedVariant?.stock ?? 0

    const handleSizeClick = (size: string) => {
        if (product?.status === 'AVAILABLE') {
            setSelectedSize(size)
        }
    }

    const handleQuantity = (q: number) => {
        if (q >= 1 && q <= selectedStock) setQuantity(q)
    }

    const earliestAvailableGlobal = () => {
        const all = Object.values(rentalStatus).flat()
        if (!all.length) return null
        const sorted = [...all].sort(
            (a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime()
        )
        // Add 2 days for return + maintenance (endDate + 1 day for return + 1 day for maintenance)
        const earliestEndDate = new Date(sorted[0].endDate)
        earliestEndDate.setDate(earliestEndDate.getDate() + 2)
        return earliestEndDate.toISOString()
    }

    // Helper to get all blocked dates (rental periods + 2 days buffer)
    const getBlockedDates = () => {
        const blockedDates: Date[] = []
        const periods = getRentalPeriods(selectedSize)

        console.log('[DEBUG] getBlockedDates - selectedSize:', selectedSize, 'periods:', periods)

        periods.forEach(period => {
            const start = new Date(period.startDate)
            const end = new Date(period.endDate)
            // Normalize to avoid timezone issues
            start.setHours(0, 0, 0, 0)
            end.setHours(0, 0, 0, 0)
            // Add only 1 day for maintenance (so last maintenance day is selectable)
            const lastBlockedDate = new Date(end.getTime() + 24 * 60 * 60 * 1000)

            console.log(`[DEBUG] Blocking from ${start.toISOString().split('T')[0]} to ${lastBlockedDate.toISOString().split('T')[0]} (available from ${new Date(lastBlockedDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]})`)

            const currentDate = new Date(start)
            while (currentDate <= lastBlockedDate) {
                const normalizedDate = new Date(currentDate)
                normalizedDate.setHours(0, 0, 0, 0)
                blockedDates.push(normalizedDate)
                currentDate.setDate(currentDate.getDate() + 1)
            }
        })

        console.log('[DEBUG] Total blocked dates:', blockedDates.length, blockedDates.map(d => d.toISOString().split('T')[0]))

        return blockedDates
    }

    // Helper to check if a date is blocked
    const isDateBlocked = (date: Date) => {
        if (!date) return false;

        // Normalize the date to avoid timezone issues
        const dateToCheck = new Date(date)
        dateToCheck.setHours(0, 0, 0, 0)

        const blockedDates = getBlockedDates()

        const isBlocked = blockedDates.some(blockedDate => {
            const normalizedBlocked = new Date(blockedDate)
            normalizedBlocked.setHours(0, 0, 0, 0)
            return dateToCheck.getTime() === normalizedBlocked.getTime()
        })

        if (Math.random() < 0.01) {
            console.log('[DEBUG] isDateBlocked:', dateToCheck.toISOString().split('T')[0], '->', isBlocked)
        }

        return isBlocked
    }

    const calcDays = () => {
        if (!rentalStartDate || !rentalEndDate) return 0
        const start = new Date(rentalStartDate)
        const end = new Date(rentalEndDate)

        // Set time to start of day to avoid timezone issues
        start.setHours(0, 0, 0, 0)
        end.setHours(0, 0, 0, 0)

        const diffTime = end.getTime() - start.getTime()
        const diffDays = diffTime / (1000 * 60 * 60 * 24)

        console.log('[DEBUG] calcDays - start:', rentalStartDate, 'end:', rentalEndDate, 'diffDays:', diffDays)

        // Add 1 to include both start and end days
        return Math.max(1, Math.floor(diffDays) + 1)
    }

    // price from tiers by days
    const priceForDays = (days: number) => {
        if (!days || tiers.length === 0) return 0
        const tier =
            [...tiers]
                .sort((a, b) => b.minDays - a.minDays)
                .find(t => days >= t.minDays) || tiers[0]
        return tier ? tier.pricePerDay * days : 0
    }

    const fromAmount = (t: Tier) => t.minDays * t.pricePerDay

    // -------------------------
    // Cart actions
    // -------------------------
    const handleAddToCart = async () => {
        if (!product || !selectedSize) return
        if (isAdding) return
        setIsAdding(true)

        const ok = await addToCart({
            productId: product.id,
            productName: product.name,
            image: getMainImage(),
            size: selectedSize,
            quantity,
            price: selectedPrice,
            isRental: false,
        })

        if (!ok) alert("შეცდომა კალათაში დამატებისას")
        setIsAdding(false)
    }

    const handleRental = async () => {
        if (!product || !selectedSize) return
        
        // Only block if product is in maintenance or completely unavailable
        if (product.status === 'MAINTENANCE') {
            alert("პროდუქტი რესტავრაციაზეა და ამჟამად ხელმისაწვდომი არ არის")
            return
        }
        
        if (!rentalStartDate || !rentalEndDate) {
            alert("აირჩიე ქირაობის თარიღები")
            return
        }
        
        // Check if the selected dates conflict with existing rentals
        const start = new Date(rentalStartDate)
        const end = new Date(rentalEndDate)
        const conflicts = getRentalPeriods(selectedSize).filter(period => {
            const periodStart = new Date(period.startDate)
            const periodEnd = new Date(period.endDate)
            // Add 1 day buffer for maintenance (last maintenance day is selectable)
            const periodLastBlockedDate = new Date(periodEnd.getTime() + 24 * 60 * 60 * 1000)
            // Check for overlap
            return start < periodLastBlockedDate && end >= periodStart
        })
        
        if (conflicts.length > 0) {
            alert("ამ თარიღებზე პროდუქტი დაკავებულია. გთხოვთ აირჩიოთ სხვა თარიღები")
            return
        }
        
        if (isAdding) return
        setIsAdding(true)

        const days = calcDays()
        const total = priceForDays(days)

        const ok = await addToCart({
            productId: product.id,
            productName: product.name,
            image: getMainImage(),
            size: selectedSize,
            quantity: 1,
            isRental: true,
            rentalStartDate,
            rentalEndDate,
            rentalDays: days,
            price: total,
            deposit: product.deposit || 0,
        })

        if (!ok) alert("შეცდომა ქირაობის დამატებისას")
        setIsAdding(false)
    }

    // -------------------------
    // Render
    // -------------------------
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">იტვირთება...</p>
                </div>
            </div>
        )
    }

    if (!product) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-black mb-4">პროდუქტი ვერ მოიძებნა</h1>
                    <Link href="/shop" className="underline">
                        დაბრუნდი მაღაზიაში
                    </Link>
                </div>
            </div>
        )
    }
    console.log('product', product.status);
    console.log('Debug button state:', {
        isAdding,
        selectedSize,
        productStatus: product.status,
        purchaseMode,
        rentalStartDate,
        rentalEndDate,
        hasActiveRentalsForSize: selectedSize ? hasActiveRentals(selectedSize) : 'no size',
        rentalStatus,
        isRentable: product?.isRentable,
        buttonDisabledReason:
            isAdding ? 'isAdding' :
                !selectedSize ? 'no size' :
                    product.status !== 'AVAILABLE' ? 'status not available' :
                        (purchaseMode === "rent" && (!rentalStartDate || !rentalEndDate)) ? 'no rental dates' :
                            (purchaseMode === "rent" && hasActiveRentals(selectedSize)) ? 'size has active rentals' :
                                'enabled'
    });

    return (
        <div className="min-h-screen">
            {/* Header (Back) */}
            <header className="sticky top-0 z-30 bg-white/70 backdrop-blur border-b">
                <div className="max-w-[1200px] mx-auto px-4 py-4">
                    <Link href="/" className="flex items-center text-black hover:opacity-80">
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        უკან დაბრუნება
                    </Link>
                </div>
            </header>

            <main className="max-w-[1200px] mx-auto px-4 py-10">
                <div className="grid lg:grid-cols-2 gap-10">
                    {/* LEFT — Gallery */}
                    <section>
                        <div className="flex gap-4">
                            {/* Small images on the left */}
                            <div className="flex flex-col gap-3">
                                {product.images?.map((img, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setActiveImage(i)}
                                        className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 transition ${activeImage === i
                                            ? "border-black"
                                            : "border-gray-200 hover:border-black"
                                            }`}
                                    >
                                        <Image src={img.url} alt={`${product.name}-${i}`} fill className="object-cover" />
                                    </button>
                                ))}
                            </div>

                            {/* Main image */}
                            <div className="relative flex-1 aspect-[3/4] bg-white rounded-2xl overflow-hidden shadow border">
                                <Image
                                    src={getMainImage()}
                                    alt={product.name}
                                    fill
                                    className="object-cover"
                                    priority
                                />
                                <div className="absolute top-4 left-4 flex gap-2">
                                    {product.hasSale && (
                                        <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                                            ფასდაკლება
                                        </span>
                                    )}
                                    {product.isNew && (
                                        <span className="bg-black text-white px-3 py-1 rounded-full text-xs font-semibold">
                                            ახალი
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* RIGHT — Details */}
                    <section className="space-y-6">
                        <div className="bg-white  p-6">


                            {/* Author Info */}
                            <div className="bg-white  p-6 ">
                                <div className="flex items-center space-x-4">
                                    <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gray-200">
                                        {product.user?.image ? (
                                            <Image
                                                src={product.user.image}
                                                alt={product.user.name || "ავტორი"}
                                                fill
                                                className="object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-300 text-gray-600 font-semibold">
                                                {product.user?.name ? product.user.name.charAt(0).toUpperCase() : "?"}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        {product.user ? (
                                            <Link
                                                href={`/author/${product.user.id}`}
                                                className="hover:opacity-80 transition-opacity"
                                            >
                                                <h3 className="md:text-[18px] text-[16px] font-semibold text-gray-900 hover:text-underline transition-colors">
                                                    {product.user.name || "უცნობი ავტორი"}
                                                </h3>
                                            </Link>
                                        ) : (
                                            <h3 className="md:text-[18px] text-[16px] font-semibold text-gray-900">
                                                უცნობი ავტორი
                                            </h3>
                                        )}
                                        <p className="text-sm text-gray-600">პროდუქტის ავტორი</p>
                                    </div>
                                </div>
                            </div>
                            {/* Title */}
                            <div className="bg-white  p-6 s">
                                <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
                                {product.description && (
                                    <p className="text-gray-700 mt-2 leading-relaxed">{product.description}</p>
                                )}
                            </div>

                            {/* Pricing plans (4+/7+/28+) */}
                            {product.isRentable && tiers.length > 0 && (
                                <div className="bg-white  p-6 ">
                                    <div className="grid sm:grid-cols-3 gap-4">
                                        {/* 4+ days */}
                                        {tiers[0] && (
                                            <div className="border border-gray-200 rounded-xl p-4">
                                                <p className="text-sm text-gray-600">{tiers[0].minDays} + დღე</p>
                                                <p className="text-[16px] font-bold text-gray-900">₾{tiers[0].pricePerDay.toFixed(2)}/დღე</p>
                                                <p className="text-sm text-gray-500 mt-1">ჯამი: ₾{fromAmount(tiers[0]).toFixed(2)}</p>
                                            </div>
                                        )}

                                        {/* 7+ days - Recommended */}
                                        {tiers[1] && (
                                            <div className="border relative border-emerald-400 rounded-xl p-4 ring-2 ring-emerald-400 bg-emerald-50">
                                                <span className="absolute -top-2 right-0 bg-emerald-100 text-emerald-800 text-xs font-semibold px-2 py-1 rounded">
                                                    რეკომენდირებული
                                                </span>
                                                <p className="text-sm text-gray-600">{tiers[1].minDays} + დღე</p>
                                                <p className="text-[16px] font-bold text-gray-900">₾{tiers[1].pricePerDay.toFixed(2)}/დღე</p>
                                                <p className="text-sm text-emerald-700 mt-1 font-medium">ჯამი: ₾{fromAmount(tiers[1]).toFixed(2)}</p>
                                            </div>
                                        )}

                                        {/* 28+ days */}
                                        {tiers[2] && (
                                            <div className="border border-gray-200 rounded-xl p-4">
                                                <p className="text-sm text-gray-600">{tiers[2].minDays} + დღე</p>
                                                <p className="text-[16px] font-bold text-gray-900">₾{tiers[2].pricePerDay.toFixed(2)}/დღე</p>
                                                <p className="text-sm text-gray-500 mt-1">ჯამი: ₾{fromAmount(tiers[2]).toFixed(2)}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Size selector */}
                            <div className="p-6  space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="md:text-[18px] text-[16px] font-semibold text-black">ზომა:</h3>

                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    {getAvailableSizes().map(size => {
                                        const variant = product.variants?.find(v => v.size === size)
                                        const price = variant?.price || 0
                                        const rented = hasActiveRentals(size)
                                        const firstEnd =
                                            getRentalPeriods(size).length > 0
                                                ? (() => {
                                                    const earliestEnd = getRentalPeriods(size)
                                                        .map(p => p.endDate)
                                                        .sort(
                                                            (a, b) =>
                                                                new Date(a).getTime() - new Date(b).getTime()
                                                        )[0]
                                                    // Add 2 days for return + maintenance
                                                    const availableDate = new Date(earliestEnd)
                                                    availableDate.setDate(availableDate.getDate() + 2)
                                                    return formatDate(availableDate.toISOString())
                                                })()
                                                : null

                                        return (
                                            <button
                                                key={size}
                                                onClick={() => handleSizeClick(size)}
                                                disabled={product.status !== 'AVAILABLE'}
                                                className={`rounded-xl border-2 p-3 text-center transition ${selectedSize === size
                                                    ? rented
                                                        ? " bg-[#1B3729] text-white"
                                                        : " bg-[#1B3729] text-white"
                                                    : rented || (product.status && product.status !== 'AVAILABLE')
                                                        ? product.status === 'MAINTENANCE'
                                                            ? "border-orange-300  bg-[#1B3729] text-orange-600 cursor-not-allowed"
                                                            : product.status === 'RENTED'
                                                                ? "border-blue-300 bg-[#1B3729]0 text-white cursor-not-allowed"
                                                                : "border-red-300 bg-[#1B3729] text-white"
                                                        : "border-gray-300 hover:border-black"
                                                    }`}
                                            >
                                                <div className="font-semibold">{size}</div>
                                                <div className="text-[16px]">{`₾${price.toFixed(2)}`}</div>
                                                {product.status === 'MAINTENANCE' && (
                                                    <div className="mt-1 text-orange-600 text-[16px]">
                                                        რესტავრაციაზე
                                                    </div>
                                                )}

                                                {product.status === 'RENTED' && (
                                                    <div className="mt-1 text-white text-[16px]">
                                                        იქნება ხელმისაწვდომი {firstEnd}
                                                    </div>
                                                )}
                                                {rented && firstEnd && product.status === 'AVAILABLE' && (
                                                    <div className="mt-1 positive text-white">
                                                        თავისუფალია
                                                    </div>
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Purchase / Rent toggle + calendars */}
                            <div className=" p-6  space-y-4">
                                {product.status === 'MAINTENANCE' ? (
                                    <div className="text-center p-6 bg-orange-50 border-2 border-orange-200 rounded-xl">
                                        <div className="text-orange-700 font-semibold text-lg mb-2">
                                            პროდუქტი რესტავრაციაზეა
                                        </div>
                                        <div className="text-orange-600">
                                            ამჟამად ხელმისაწვდომი არ არის
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => setPurchaseMode("buy")}
                                            disabled={product.status === 'RENTED'}
                                            className={`p-4 rounded-xl border-2 flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed ${purchaseMode === "buy"
                                                ? "border-[#1B3729] bg-[#1B3729] text-white"
                                                : "border-gray-300"
                                                }`}
                                        >
                                            <CreditCard className="w-5 h-5" />
                                            ყიდვა
                                        </button>
                                        {product.isRentable && product.status === 'AVAILABLE' && (
                                            <button
                                                onClick={() => setPurchaseMode("rent")}
                                                className={`p-4 rounded-xl border-2 flex items-center justify-center gap-2 ${purchaseMode === "rent"
                                                    ? "border-emerald-400 bg-emerald-100 text-black"
                                                    : "border-gray-300"
                                                    }`}
                                            >
                                                <CalendarDays className="w-5 h-5" />
                                                ქირაობა
                                            </button>
                                        )}
                                    </div>
                                )}

                                {purchaseMode === "rent" && product.isRentable && product.status !== 'MAINTENANCE' && (
                                    <div className="space-y-3 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[16px] font-medium mb-1">დაწყება</label>
                                                <DatePicker
                                                    selected={rentalStartDate ? new Date(rentalStartDate) : null}
                                                    onChange={(date: Date | null) => {
                                                        if (date) {
                                                            const year = date.getFullYear()
                                                            const month = String(date.getMonth() + 1).padStart(2, '0')
                                                            const day = String(date.getDate()).padStart(2, '0')
                                                            setRentalStartDate(`${year}-${month}-${day}`)
                                                        }
                                                    }}
                                                    filterDate={(date) => {
                                                        if (!date) return false;
                                                        const blocked = isDateBlocked(date);
                                                        return !blocked;
                                                    }}
                                                    minDate={new Date()}
                                                    placeholderText="აირჩიე თარიღი"
                                                    dateFormat="dd/MM/yyyy"
                                                    className="w-full text-[16px] placeholder:text-[16px] placeholder:text-black px-3 py-2 border rounded-lg"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[16px] font-medium mb-1">დასრულება</label>

                                                <DatePicker
                                                    selected={rentalEndDate ? new Date(rentalEndDate) : null}
                                                    onChange={(date: Date | null) => {
                                                        if (date) {
                                                            const year = date.getFullYear()
                                                            const month = String(date.getMonth() + 1).padStart(2, '0')
                                                            const day = String(date.getDate()).padStart(2, '0')
                                                            setRentalEndDate(`${year}-${month}-${day}`)
                                                        }
                                                    }}
                                                    filterDate={(date) => {
                                                        if (!date) return false;
                                                        const blocked = isDateBlocked(date);
                                                        return !blocked;
                                                    }}
                                                    minDate={rentalStartDate ? new Date(rentalStartDate) : new Date()}
                                                    placeholderText="აირჩიე თარიღი"
                                                    dateFormat="dd/MM/yyyy"
                                                    className="w-full text-[16px] placeholder:text-[16px] placeholder:text-black px-3 py-2 border rounded-lg"
                                                />
                                            </div>
                                        </div>

                                        {/* Show busy rental periods */}
                                        {hasActiveRentals(selectedSize) && (() => {
                                            const periods = getRentalPeriods(selectedSize)
                                            // Get the last rental period (with latest endDate)
                                            const lastPeriod = periods.length > 0
                                                ? periods.sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())[0]
                                                : null
                                            
                                            if (!lastPeriod) return null
                                            
                                            // Add 2 days: 1 day for return + 1 day for maintenance
                                            const availableDate = new Date(new Date(lastPeriod.endDate).getTime() + 2 * 24 * 60 * 60 * 1000)
                                            const maintenanceEndDate = new Date(new Date(lastPeriod.endDate).getTime() + 24 * 60 * 60 * 1000)
                                            
                                            return (
                                                <div className="text-[16px] bg-white border border-gray-200 rounded-lg p-3">
                                                    <div className="font-medium text-gray-700 mb-2">დაკავებული პერიოდი:</div>
                                                    <div className="p-2 border rounded">
                                                        <div className="text-gray-700 font-medium">ქირაობა: {formatDate(lastPeriod.startDate)} - {formatDate(lastPeriod.endDate)}</div>
                                                        <div className="text-orange-600">რესტავრაცია: {formatDate(maintenanceEndDate.toISOString())}</div>
                                                        <div className="text-green-600 font-semibold">ხელმისაწვდომია {formatDate(availableDate.toISOString())}-იდან</div>
                                                    </div>
                                                </div>
                                            )
                                        })()}

                                        {/* Info message about dates */}
                                      

                                        {/* Show warning if dates conflict with existing rentals */}
                                        {(rentalStartDate && rentalEndDate) && (() => {
                                            const conflicts = getRentalPeriods(selectedSize).filter(period => {
                                                const start = new Date(rentalStartDate)
                                                const end = new Date(rentalEndDate)
                                                const periodStart = new Date(period.startDate)
                                                const periodEnd = new Date(period.endDate)
                                                // Add only 1 day buffer (last maintenance day is selectable)
                                                const periodLastBlockedDate = new Date(periodEnd.getTime() + 24 * 60 * 60 * 1000)
                                                // Check for overlap - only conflict if start is before the last blocked date
                                                // Since periodLastBlockedDate is the last blocked day, rentals can start after it
                                                return start < periodLastBlockedDate && end >= periodStart
                                            })

                                            return conflicts.length > 0 ? (
                                                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                                                    ⚠️ ამ თარიღებზე პროდუქტი დაკავებულია. გთხოვთ აირჩიოთ სხვა თარიღები.
                                                </div>
                                            ) : null
                                        })()}

                                        {!!calcDays() && (
                                            <div className="text-center bg-white rounded-lg border p-3">
                                                <div className="text-lg font-semibold">
                                                    ჯამური ფასი: ₾{priceForDays(calcDays()).toFixed(2)}
                                                </div>

                                                {product.deposit ? (
                                                    <div className="text-[16px] text-gray-700">
                                                        + გირაო: ₾{product.deposit.toFixed(2)}
                                                    </div>
                                                ) : null}
                                            </div>
                                        )}

                                       
                                    </div>
                                )}
                            </div>

                            {/* Action button */}
                            {(session && userVerification?.status === 'APPROVED') ? (
                                <div className="space-y-2">
                                    {product.status !== 'AVAILABLE' && (
                                        <p className="text-sm text-white font-medium text-center">
                                            {product.status === 'RENTED' && 'ნივთი გაქირავებულია'}
                                            {product.status === 'RESERVED' && 'ნივთი დაჯავშნილია'}
                                            {product.status === 'MAINTENANCE' && 'ნივთი რესტავრაციაზეა'}
                                        </p>
                                    )}
                                    {(purchaseMode === "rent" && (!rentalStartDate || !rentalEndDate)) && product.status === 'AVAILABLE' && (
                                        <p className="text-sm text-orange-600 font-medium text-center">
                                            გთხოვთ აირჩიოთ ქირაობის დაწყების და დასრულების თარიღები
                                        </p>
                                    )}
                                    {(purchaseMode === "rent" && rentalStartDate && rentalEndDate) && (() => {
                                        // Check if the selected dates conflict with existing rentals
                                        const start = new Date(rentalStartDate)
                                        const end = new Date(rentalEndDate)
                                        const conflicts = getRentalPeriods(selectedSize).filter(period => {
                                            const periodStart = new Date(period.startDate)
                                            const periodEnd = new Date(period.endDate)
                                            const periodLastBlockedDate = new Date(periodEnd.getTime() + 24 * 60 * 60 * 1000)
                                            return start < periodLastBlockedDate && end >= periodStart
                                        })
                                        
                                        return conflicts.length > 0 ? (
                                            <p className="text-[16px] text-red-600 font-medium text-center">
                                                ⚠️ ამ თარიღებზე პროდუქტი დაკავებულია
                                            </p>
                                        ) : null
                                    })()}

                                    {product.status !== 'MAINTENANCE' && (
                                        <button
                                            onClick={() =>
                                                purchaseMode === "buy" ? handleAddToCart() : handleRental()
                                            }
                                        
                                            className={`w-full py-4 rounded-xl text-white font-bold transition disabled:bg-gray-400 ${purchaseMode === "buy"
                                                ? "bg-[#1B3729] hover:opacity-95"
                                                : "bg-emerald-600 hover:bg-emerald-700"
                                                }`}
                                        >
                                            {isAdding
                                                ? "მუშავდება..."
                                                : purchaseMode === "buy"
                                                    ? "კალათაში დამატება"
                                                    : "ქირაობა "}
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="p-4 text-center bg-yellow-100 border border-yellow-300 text-yellow-900 rounded-lg font-bold">
                                        პროდუქტის შეძენა ან ქირაობა შესაძლებელია მხოლოდ დამტკიცებული მომხმარებლისთვის.<br />
                                        გთხოვთ გაიარეთ ავტორიზაცია და შემდეგვერიფიკაცია ანგარიშის გვერდზე!
                                    </div>
                                </div>
                            )}

                            {/* Facts block (Brand/Size/Location/Colour/Minimal days) */}
                            <div className="  p-6 ">
                                <ul className="md:text-[18px] text-[16px] text-black space-y-2">
                                    <li>
                                        <span className="font-semibold">კატეგორია: </span>
                                        {product.category?.name || "—"}
                                    </li>
                                    <li>
                                        <span className="font-semibold">ზომა: </span>
                                        {selectedSize || "—"}
                                    </li>
                                    <li>
                                        <span className="font-semibold">ფერი: </span>
                                        {product.color || "—"}
                                    </li>
                                    <li>
                                        <span className="font-semibold">მდებარეობა: </span>
                                        {product.location || "Tbilisi, GE"}
                                    </li>

                                    <li>
                                        <span className="font-semibold">მინიმალური ქირაობის დღეები: </span>
                                        {minDaysGlobal} days
                                    </li>
                                </ul>
                            </div>

                            {/* Benefits */}
                            <div className=" p-6  space-y-3">
                                {[
                                    { icon: Shield, title: "უსაფრთხო გადახდა", desc: "SSL დაცული გადახდები" },
                                    { icon: RotateCcw, title: "დაბრუნება", desc: "მოხერხებული პოლისი" },
                                    { icon: CheckCircle, title: "შემოწმებული ნივთები", desc: "ხარისხის კონტროლი" },
                                ].map((i, idx) => (
                                    <div key={idx} className="flex items-center">
                                        <i.icon className="w-5 h-5 mr-3 text-black" />
                                        <div>
                                            <div className="font-medium text-black">{i.title}</div>
                                            <div className="text-sm text-gray-700">{i.desc}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                </div>

                {/* Similar Products */}
                <div className="mt-12">
                    <SimilarProducts
                        productId={product.id}
                        categoryName={product.category?.name}
                    />
                </div>

            </main>
        </div>
    )
}

export default ProductPage
