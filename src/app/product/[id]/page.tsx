"use client"
import React, { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import {
    ArrowLeft,
    CalendarDays,
    CheckCircle,
    CreditCard,
    RotateCcw,
    Shield,
} from "lucide-react"
import { useCart } from "@/hooks/useCart"
import { useSession } from "next-auth/react"
import { Product, RentalPeriod } from "@/types/product"
import { formatDate } from "@/utils/dateUtils"

type Tier = { minDays: number; pricePerDay: number }

const ProductPage = () => {
    const params = useParams()
    const productId = params.id as string

    const { addToCart } = useCart()
    const { data: session } = useSession()

    const [product, setProduct] = useState<Product | null>(null)
    const [loading, setLoading] = useState(true)
    const [activeImage, setActiveImage] = useState(0)

    const [selectedSize, setSelectedSize] = useState<string>("")
    const [quantity, setQuantity] = useState(1)

    const [purchaseMode, setPurchaseMode] = useState<"buy" | "rent">("rent")
    const [rentalStartDate, setRentalStartDate] = useState("")
    const [rentalEndDate, setRentalEndDate] = useState("")
    const [isAdding, setIsAdding] = useState(false)

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

                if (pJson?.success) setProduct(pJson.product)
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

    // -------------------------
    // Helpers
    // -------------------------
    const tiers: Tier[] =
        ((product as any)?.rentalPriceTiers as Tier[] | undefined)?.sort(
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
            const sz = firstAvailableSize() || product.variants?.[0]?.size
            if (sz) setSelectedSize(sz)
        }
    }, [product, rentalStatus, selectedSize])

    const selectedVariant = product?.variants?.find(v => v.size === selectedSize)
    const selectedPrice = selectedVariant?.price ?? 0
    const selectedStock = selectedVariant?.stock ?? 0

    const handleSizeClick = (size: string) => {
        if (!hasActiveRentals(size)) setSelectedSize(size)
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
        return sorted[0].endDate
    }

    const calcDays = () => {
        if (!rentalStartDate || !rentalEndDate) return 0
        const s = new Date(rentalStartDate).getTime()
        const e = new Date(rentalEndDate).getTime()
        const diff = Math.ceil((e - s) / (1000 * 60 * 60 * 24))
        return Math.max(0, diff)
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
        if (!rentalStartDate || !rentalEndDate) {
            alert("აირჩიე ქირაობის თარიღები")
            return
        }
        if (hasActiveRentals(selectedSize)) {
            alert("ეს ზომა ამჟამად გაქირავებულია")
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
                        <div className="relative w-full aspect-[3/4] bg-white rounded-2xl overflow-hidden shadow border">
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

                        <div className="grid grid-cols-4 gap-3 mt-3">
                            {product.images?.map((img, i) => (
                                <button
                                    key={i}
                                    onClick={() => setActiveImage(i)}
                                    className={`relative aspect-square rounded-xl overflow-hidden border-2 transition ${activeImage === i
                                            ? "border-black"
                                            : "border-gray-200 hover:border-black"
                                        }`}
                                >
                                    <Image src={img.url} alt={`${product.name}-${i}`} fill className="object-cover" />
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* RIGHT — Details */}
                    <section className="space-y-6">
                        {/* Title */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm">
                            <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
                            {product.description && (
                                <p className="text-gray-700 mt-2 leading-relaxed">{product.description}</p>
                            )}
                        </div>

                        {/* Pricing plans (4+/7+/28+) */}
                        {product.isRentable && tiers.length > 0 && (
                            <div className="bg-white rounded-2xl p-6 shadow-sm">
                                <div className="grid sm:grid-cols-3 gap-4">
                                    {/* 4+ days */}
                                    {tiers[0] && (
                                        <div className="border border-gray-200 rounded-xl p-4">
                                            <p className="text-sm text-gray-600">4+ days</p>
                                            <p className="text-xl font-bold text-gray-900">₾{tiers[0].pricePerDay.toFixed(2)}/დღე</p>
                                            <p className="text-sm text-gray-600">From ₾{fromAmount(tiers[0]).toFixed(2)}</p>
                                        </div>
                                    )}

                                    {/* 7+ days - Recommended */}
                                    {tiers[1] && (
                                        <div className="border border-emerald-400 rounded-xl p-4 ring-2 ring-emerald-400 bg-emerald-50">
                                            <span className="inline-block bg-emerald-100 text-emerald-800 text-xs font-semibold px-2 py-1 rounded mb-2">
                                                Recommended
                                            </span>
                                            <p className="text-sm text-gray-600">7+ days</p>
                                            <p className="text-xl font-bold text-gray-900">₾{tiers[1].pricePerDay.toFixed(2)}/დღე</p>
                                            <p className="text-sm text-gray-600">From ₾{fromAmount(tiers[1]).toFixed(2)}</p>
                                        </div>
                                    )}

                                    {/* 28+ days */}
                                    {tiers[2] && (
                                        <div className="border border-gray-200 rounded-xl p-4">
                                            <p className="text-sm text-gray-600">28+ days</p>
                                            <p className="text-xl font-bold text-gray-900">₾{tiers[2].pricePerDay.toFixed(2)}/დღე</p>
                                            <p className="text-sm text-gray-600">From ₾{fromAmount(tiers[2]).toFixed(2)}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Size selector */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-black">ზომა</h3>
                                {!!selectedStock && (
                                    <span className="text-sm text-gray-600">საწყობი: {selectedStock} ც</span>
                                )}
                            </div>

                            <div className="grid grid-cols-4 gap-3">
                                {getAvailableSizes().map(size => {
                                    const variant = product.variants?.find(v => v.size === size)
                                    const price = variant?.price || 0
                                    const rented = hasActiveRentals(size)
                                    const firstEnd =
                                        getRentalPeriods(size).length > 0
                                            ? formatDate(
                                                getRentalPeriods(size)
                                                    .map(p => p.endDate)
                                                    .sort(
                                                        (a, b) =>
                                                            new Date(a).getTime() - new Date(b).getTime()
                                                    )[0]
                                            )
                                            : null

                                    return (
                                        <button
                                            key={size}
                                            onClick={() => handleSizeClick(size)}
                                            disabled={rented}
                                            className={`rounded-xl border-2 p-3 text-center transition ${selectedSize === size
                                                    ? "border-[#1B3729] bg-[#1B3729] text-white"
                                                    : rented
                                                        ? "border-red-300 bg-red-50 text-red-600 cursor-not-allowed"
                                                        : "border-gray-300 hover:border-black"
                                                }`}
                                        >
                                            <div className="font-semibold">{size}</div>
                                            <div className="text-sm">{`₾${price.toFixed(2)}`}</div>
                                            {rented && (
                                                <div className="text-[11px] mt-1">
                                                    გაქირავებულია {firstEnd ? `— ${firstEnd}-მდე` : ""}
                                                </div>
                                            )}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Purchase / Rent toggle + calendars */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setPurchaseMode("buy")}
                                    className={`p-4 rounded-xl border-2 flex items-center justify-center gap-2 ${purchaseMode === "buy"
                                            ? "border-[#1B3729] bg-[#1B3729] text-white"
                                            : "border-gray-300"
                                        }`}
                                >
                                    <CreditCard className="w-5 h-5" />
                                    ყიდვა
                                </button>
                                {product.isRentable && (
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

                            {purchaseMode === "rent" && product.isRentable && (
                                <div className="space-y-3 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">დაწყება</label>
                                            <input
                                                type="date"
                                                value={rentalStartDate}
                                                onChange={e => setRentalStartDate(e.target.value)}
                                                min={new Date().toISOString().split("T")[0]}
                                                className="w-full px-3 py-2 border rounded-lg"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">დასრულება</label>
                                            <input
                                                type="date"
                                                value={rentalEndDate}
                                                onChange={e => setRentalEndDate(e.target.value)}
                                                min={rentalStartDate || new Date().toISOString().split("T")[0]}
                                                className="w-full px-3 py-2 border rounded-lg"
                                            />
                                        </div>
                                    </div>

                                    {!!calcDays() && (
                                        <div className="text-center bg-white rounded-lg border p-3">
                                            <div className="text-lg font-semibold">
                                                ჯამური ფასი: ₾{priceForDays(calcDays()).toFixed(2)}
                                            </div>
                                            {product.deposit ? (
                                                <div className="text-sm text-gray-700">
                                                    + გირაო: ₾{product.deposit.toFixed(2)}
                                                </div>
                                            ) : null}
                                        </div>
                                    )}

                                    {Object.keys(rentalStatus).some(s => hasActiveRentals(s)) && (
                                        <div className="text-sm text-gray-700">
                                            ყველაზე ადრინდელი ხელმისაწვდომობა:{" "}
                                            <b>
                                                {earliestAvailableGlobal()
                                                    ? formatDate(earliestAvailableGlobal()!)
                                                    : "მაშინვე"}
                                            </b>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Action button */}
                        <div>
                            <button
                                onClick={() =>
                                    purchaseMode === "buy" ? handleAddToCart() : handleRental()
                                }
                                disabled={
                                    isAdding ||
                                    !selectedSize ||
                                    (purchaseMode === "rent" && (!rentalStartDate || !rentalEndDate))
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
                                        : "ქირაობა ახლა"}
                            </button>
                        </div>

                        {/* Facts block (Brand/Size/Location/Colour/Minimal days) */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm">
                            <ul className="text-sm text-gray-800 space-y-2">
                                <li>
                                    <span className="font-semibold">Brand: </span>
                                    {product.category?.name || "—"}
                                </li>
                                <li>
                                    <span className="font-semibold">Size: </span>
                                    {selectedSize || "—"}
                                </li>
                                <li>
                                    <span className="font-semibold">Location: </span>
                                    Tbilisi, GE
                                </li>

                                <li>
                                    <span className="font-semibold">Minimal rental period: </span>
                                    {minDaysGlobal} days
                                </li>
                            </ul>
                        </div>

                        {/* Benefits */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-3">
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
                    </section>
                </div>

                {/* Why rent instead of buying new? */}
                <section className="mt-16 bg-gray-50 p-8 rounded-2xl border">
                    <h2 className="text-2xl font-bold mb-4">რატომ ქირაობა უფრო უკეთესია, ვიდრე ყიდვა?</h2>
                    <ul className="list-disc pl-6 space-y-2 text-gray-800">
                        <li>დაზოგე ფული — ატარე მაღალი ბრენდები მცირე ფასად</li>
                        <li>გარემოს დაცვა — გაზიარების ეკონომიკა, ნაკლები ნარჩენი</li>
                        <li>ყოველ ღონისძიებაზე განსხვავებული ლუქი — არც ზედმეტი ყიდვები</li>
                    </ul>
                    <button className="mt-4 px-5 py-3 rounded-lg bg-black text-white font-semibold">
                        იხილე დამატებითი ინფორმაცია
                    </button>
                </section>
            </main>
        </div>
    )
}

export default ProductPage
