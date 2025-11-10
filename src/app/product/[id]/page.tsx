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
    Edit,
    Trash2,
} from "lucide-react"
import { useCart } from "@/hooks/useCart"
import { useSession } from 'next-auth/react';

import { Product, RentalPeriod } from "@/types/product"
import { formatDate } from "@/utils/dateUtils"
import SimilarProducts from "@/components/SimilarProducts"
import StarRating from "@/components/StarRating"
import { showToast } from "@/utils/toast"

type Tier = { minDays: number; pricePerDay: number }

// Helper to normalize date to start of day
const startOfDay = (date: Date) => {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    return d
}


const ProductPage = () => {
    const params = useParams()
    const productId = params.id as string


    const { addToCart } = useCart()
    const { data: session } = useSession();

    const [product, setProduct] = useState<Product | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [activeImage, setActiveImage] = useState(0)

    const [selectedSize, setSelectedSize] = useState<string>("")
    const [quantity, setQuantity] = useState(1)

    const [purchaseMode, setPurchaseMode] = useState<"buy" | "rent">("buy")
    const [rentalStartDate, setRentalStartDate] = useState("")
    const [rentalEndDate, setRentalEndDate] = useState("")
    const [isAdding, setIsAdding] = useState(false)
    const [userVerification, setUserVerification] = useState<{ status?: 'PENDING' | 'APPROVED' | 'REJECTED' } | null>(null);
    
    // Reviews state
    const [reviews, setReviews] = useState<Array<{
      id: number
      rating: number
      comment: string | null
      createdAt: string
      user: { id: string; name: string | null; image: string | null }
      reply?: {
        id: number
        comment: string
        createdAt: string
        user: { id: string; name: string | null; image: string | null }
      } | null
    }>>([])
    const [averageRating, setAverageRating] = useState(0)
    const [totalReviews, setTotalReviews] = useState(0)
    const [loadingReviews, setLoadingReviews] = useState(false)
    const [reviewRating, setReviewRating] = useState(0)
    const [reviewComment, setReviewComment] = useState('')
    const [submittingReview, setSubmittingReview] = useState(false)
    const [canReview, setCanReview] = useState(false)
    const [editingReviewId, setEditingReviewId] = useState<number | null>(null)
    const [editingRating, setEditingRating] = useState(0)
    const [editingComment, setEditingComment] = useState('')
    const [deletingReviewId, setDeletingReviewId] = useState<number | null>(null)
    const [replyingToReviewId, setReplyingToReviewId] = useState<number | null>(null)
    const [replyComment, setReplyComment] = useState('')
    const [submittingReply, setSubmittingReply] = useState(false)
    const [deletingReplyId, setDeletingReplyId] = useState<number | null>(null)

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
                    setError(null)
                } else {
                    setError(pJson?.message || 'პროდუქტი ვერ მოიძებნა')
                    setProduct(null)
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
                setError('შეცდომა პროდუქტის ჩატვირთვისას')
                setProduct(null)
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
    }, [session?.user?.id, session?.user?.email, session?.user?.name]);

    // Fetch reviews
    useEffect(() => {
        const fetchReviews = async () => {
            if (!productId) return
            try {
                setLoadingReviews(true)
                const response = await fetch(`/api/products/${productId}/reviews`)
                const data = await response.json()
                if (data.success) {
                    setReviews(data.reviews)
                    setAverageRating(data.averageRating)
                    setTotalReviews(data.totalReviews)
                    setCanReview(data.canReview || false)
                }
            } catch (error) {
                console.error('Error fetching reviews:', error)
            } finally {
                setLoadingReviews(false)
            }
        }
        fetchReviews()
    }, [productId, session?.user?.id, product?.status])

    // Check if user has already reviewed
    useEffect(() => {
        if (session?.user?.id && reviews.length > 0) {
            const userReview = reviews.find(r => r.user.id === session.user.id)
            if (userReview) {
                setReviewRating(userReview.rating)
                setReviewComment(userReview.comment || '')
            }
        }
    }, [session?.user?.id, reviews])

    const handleSubmitReview = async () => {
        if (!session) {
            showToast('გთხოვთ შეხვიდეთ სისტემაში კომენტარის დასაწერად', 'warning')
            return
        }
        if (reviewRating === 0) {
            showToast('გთხოვთ აირჩიოთ რეიტინგი', 'warning')
            return
        }
        try {
            setSubmittingReview(true)
            const response = await fetch(`/api/products/${productId}/reviews`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rating: reviewRating,
                    comment: reviewComment || undefined,
                }),
            })
            const data = await response.json()
            
            if (data.success) {
                // Refresh reviews
                const reviewsRes = await fetch(`/api/products/${productId}/reviews`)
                const reviewsData = await reviewsRes.json()
                if (reviewsData.success) {
                    setReviews(reviewsData.reviews)
                    setAverageRating(reviewsData.averageRating)
                    setTotalReviews(reviewsData.totalReviews)
                    setCanReview(reviewsData.canReview || false) // Update canReview after submission
                    // Update product rating
                    if (product) {
                        setProduct({ ...product, rating: reviewsData.averageRating })
                    }
                }
                setReviewRating(0) // Reset rating
                setReviewComment('')
                showToast('კომენტარი წარმატებით დაემატა', 'success')
            } else {
                showToast(data.error || 'შეცდომა კომენტარის დამატებისას', 'error')
            }
        } catch (error) {
            console.error('Error submitting review:', error)
            showToast('შეცდომა კომენტარის დამატებისას', 'error')
        } finally {
            setSubmittingReview(false)
        }
    }

    const handleEditReview = (review: { id: number; rating: number; comment: string | null }) => {
        setEditingReviewId(review.id)
        setEditingRating(review.rating)
        setEditingComment(review.comment || '')
    }

    const handleCancelEdit = () => {
        setEditingReviewId(null)
        setEditingRating(0)
        setEditingComment('')
    }

    const handleUpdateReview = async () => {
        if (!session || !editingReviewId) return
        if (editingRating === 0) {
            showToast('გთხოვთ აირჩიოთ რეიტინგი', 'warning')
            return
        }
        try {
            setSubmittingReview(true)
            const response = await fetch(`/api/products/${productId}/reviews`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reviewId: editingReviewId,
                    rating: editingRating,
                    comment: editingComment || undefined,
                }),
            })
            const data = await response.json()
            
            if (data.success) {
                // Refresh reviews
                const reviewsRes = await fetch(`/api/products/${productId}/reviews`)
                const reviewsData = await reviewsRes.json()
                if (reviewsData.success) {
                    setReviews(reviewsData.reviews)
                    setAverageRating(reviewsData.averageRating)
                    setTotalReviews(reviewsData.totalReviews)
                    // Update product rating
                    if (product) {
                        setProduct({ ...product, rating: reviewsData.averageRating })
                    }
                }
                setEditingReviewId(null)
                setEditingRating(0)
                setEditingComment('')
                showToast('კომენტარი წარმატებით განახლდა', 'success')
            } else {
                showToast(data.error || 'შეცდომა კომენტარის განახლებისას', 'error')
            }
        } catch (error) {
            console.error('Error updating review:', error)
            showToast('შეცდომა კომენტარის განახლებისას', 'error')
        } finally {
            setSubmittingReview(false)
        }
    }

    const handleDeleteReview = async (reviewId: number) => {
        if (!session) return
        if (!confirm('დარწმუნებული ხართ რომ გსურთ კომენტარის წაშლა?')) {
            return
        }
        try {
            setDeletingReviewId(reviewId)
            const response = await fetch(`/api/products/${productId}/reviews?reviewId=${reviewId}`, {
                method: 'DELETE',
            })
            const data = await response.json()
            
            if (data.success) {
                // Refresh reviews
                const reviewsRes = await fetch(`/api/products/${productId}/reviews`)
                const reviewsData = await reviewsRes.json()
                if (reviewsData.success) {
                    setReviews(reviewsData.reviews)
                    setAverageRating(reviewsData.averageRating)
                    setTotalReviews(reviewsData.totalReviews)
                    // Update product rating
                    if (product) {
                        setProduct({ ...product, rating: reviewsData.averageRating })
                    }
                }
                showToast('კომენტარი წარმატებით წაიშალა', 'success')
            } else {
                showToast(data.error || 'შეცდომა კომენტარის წაშლისას', 'error')
            }
        } catch (error) {
            console.error('Error deleting review:', error)
            showToast('შეცდომა კომენტარის წაშლისას', 'error')
        } finally {
            setDeletingReviewId(null)
        }
    }

    const handleReplyToReview = (reviewId: number, existingReply?: { comment: string }) => {
        setReplyingToReviewId(reviewId)
        setReplyComment(existingReply?.comment || '')
    }

    const handleCancelReply = () => {
        setReplyingToReviewId(null)
        setReplyComment('')
    }

    const handleSubmitReply = async () => {
        if (!session || !replyingToReviewId) return
        if (!replyComment.trim()) {
            showToast('გთხოვთ შეიყვანოთ პასუხი', 'warning')
            return
        }
        try {
            setSubmittingReply(true)
            const response = await fetch(`/api/products/${productId}/reviews/reply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reviewId: replyingToReviewId,
                    comment: replyComment,
                }),
            })
            const data = await response.json()
            
            if (data.success) {
                // Refresh reviews
                const reviewsRes = await fetch(`/api/products/${productId}/reviews`)
                const reviewsData = await reviewsRes.json()
                if (reviewsData.success) {
                    setReviews(reviewsData.reviews)
                    setAverageRating(reviewsData.averageRating)
                    setTotalReviews(reviewsData.totalReviews)
                }
                setReplyingToReviewId(null)
                setReplyComment('')
                showToast('პასუხი წარმატებით დაემატა', 'success')
            } else {
                showToast(data.error || 'შეცდომა პასუხის დამატებისას', 'error')
            }
        } catch (error) {
            console.error('Error submitting reply:', error)
            showToast('შეცდომა პასუხის დამატებისას', 'error')
        } finally {
            setSubmittingReply(false)
        }
    }

    const handleDeleteReply = async (reviewId: number) => {
        if (!session) return
        if (!confirm('დარწმუნებული ხართ რომ გსურთ პასუხის წაშლა?')) {
            return
        }
        try {
            setDeletingReplyId(reviewId)
            const response = await fetch(`/api/products/${productId}/reviews/reply?reviewId=${reviewId}`, {
                method: 'DELETE',
            })
            const data = await response.json()
            
            if (data.success) {
                // Refresh reviews
                const reviewsRes = await fetch(`/api/products/${productId}/reviews`)
                const reviewsData = await reviewsRes.json()
                if (reviewsData.success) {
                    setReviews(reviewsData.reviews)
                    setAverageRating(reviewsData.averageRating)
                    setTotalReviews(reviewsData.totalReviews)
                }
                showToast('პასუხი წარმატებით წაიშალა', 'success')
            } else {
                showToast(data.error || 'შეცდომა პასუხის წაშლისას', 'error')
            }
        } catch (error) {
            console.error('Error deleting reply:', error)
            showToast('შეცდომა პასუხის წაშლისას', 'error')
        } finally {
            setDeletingReplyId(null)
        }
    }

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

        periods.forEach(period => {
            const start = new Date(period.startDate)
            const end = new Date(period.endDate)
            // Normalize to avoid timezone issues
            start.setHours(0, 0, 0, 0)
            end.setHours(0, 0, 0, 0)
            // Add only 1 day for maintenance (so last maintenance day is selectable)
            const lastBlockedDate = new Date(end.getTime() + 24 * 60 * 60 * 1000)

            const currentDate = new Date(start)
            while (currentDate <= lastBlockedDate) {
                const normalizedDate = new Date(currentDate)
                normalizedDate.setHours(0, 0, 0, 0)
                blockedDates.push(normalizedDate)
                currentDate.setDate(currentDate.getDate() + 1)
            }
        })

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

        if (!ok) showToast("შეცდომა კალათაში დამატებისას", "error")
        setIsAdding(false)
    }

    const handleRental = async () => {
        if (!product || !selectedSize) return
        
        // Only block if product is in maintenance or completely unavailable
        if (product.status === 'MAINTENANCE') {
            showToast("პროდუქტი რესტავრაციაზეა და ამჟამად ხელმისაწვდომი არ არის", "warning")
            return
        }
        
        if (!rentalStartDate || !rentalEndDate) {
            showToast("აირჩიე ქირაობის თარიღები", "warning")
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
            showToast("ამ თარიღებზე პროდუქტი დაკავებულია. გთხოვთ აირჩიოთ სხვა თარიღები", "warning")
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

        if (!ok) showToast("შეცდომა ქირაობის დამატებისას", "error")
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

    if (!product || error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-black mb-4">
                        {error || 'პროდუქტი ვერ მოიძებნა'}
                    </h1>
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
                                    {product.discount && product.discount > 0 && (
                                        <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                                            -{product.discount}%
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
                                    პროდუქტის შეძენა ან ქირაობა შესაძლებელია მხოლოდ ვერიფიცირებული მომხმარებლებისთვის.
                                    გთხოვთ, შეხვიდეთ ანგარიშში და გაიაროთ ვერიფიკაცია!
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
                                    {product.sizeSystem && (
                                        <li>
                                            <span className="font-semibold">ზომის სისტემა: </span>
                                            {product.sizeSystem?.toUpperCase() || "—"}
                                        </li>
                                    )}
                                    {product.brand && (
                                        <li>
                                            <span className="font-semibold">ბრენდი: </span>
                                            {product.brand}
                                        </li>
                                    )}
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

                {/* Reviews Section */}
                <div className="mt-12">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <h2 className="text-2xl font-bold text-black mb-6">კომენტარები და რეიტინგები</h2>
                        
                        {/* Average Rating */}
                        <div className="flex items-center gap-4 mb-6 pb-6 border-b">
                            <div className="text-center">
                                <div className="text-4xl font-bold text-black">{averageRating.toFixed(1)}</div>
                                <StarRating rating={Math.round(averageRating)} readonly size="lg" />
                                <div className="text-sm text-gray-600 mt-1">{totalReviews} კომენტარი</div>
                            </div>
                        </div>

                        {/* Review Form */}
                        {session ? (
                            canReview ? (
                                <div className="mb-8 pb-8 border-b">
                                    <h3 className="text-lg font-semibold text-black mb-4">დაწერეთ კომენტარი</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                რეიტინგი *
                                            </label>
                                            <StarRating
                                                rating={reviewRating}
                                                onRatingChange={(rating) => {
                                                    setReviewRating(rating)
                                                }}
                                                size="md"
                                                color="gold"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                კომენტარი
                                            </label>
                                            <textarea
                                                value={reviewComment}
                                                onChange={(e) => setReviewComment(e.target.value)}
                                                placeholder="დაწერეთ თქვენი კომენტარი..."
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                                                rows={4}
                                            />
                                        </div>
                                        <button
                                            onClick={handleSubmitReview}
                                            disabled={submittingReview || reviewRating === 0}
                                            className="px-6 py-2 bg-[#1B3729] text-white rounded-lg font-bold uppercase tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {submittingReview ? 'იგზავნება...' : 'კომენტარის დამატება'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="mb-8 pb-8 border-b">
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                        <p className="text-yellow-800 text-sm">
                                            კომენტარის დაწერა შეგიძლიათ მხოლოდ იმ პროდუქტებზე, რომლებიც იქირავეთ.
                                        </p>
                                    </div>
                                </div>
                            )
                        ) : (
                            <div className="mb-8 pb-8 border-b">
                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                    <p className="text-gray-700 text-sm">
                                        კომენტარის დასაწერად გთხოვთ{' '}
                                        <Link href="/auth/signin" className="text-[#1B3729] font-semibold underline">
                                            შეხვიდეთ სისტემაში
                                        </Link>
                                        {' '}და იქირაოთ პროდუქტი.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Reviews List */}
                        {loadingReviews ? (
                            <div className="text-center py-8">
                                <div className="w-8 h-8 border-4 border-gray-300 border-t-black rounded-full animate-spin mx-auto"></div>
                                <p className="text-gray-600 mt-2">იტვირთება...</p>
                            </div>
                        ) : reviews.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-gray-600">ჯერ არ არის კომენტარები</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {reviews.map((review) => {
                                    const isOwnReview = session?.user?.id === review.user.id
                                    const isAdmin = session?.user?.role === 'ADMIN'
                                    const isEditing = editingReviewId === review.id
                                    const isReplying = replyingToReviewId === review.id
                                    // Determine star color: gold for renters, silver for product owners
                                    const starColor = product?.userId === review.user.id ? 'silver' : 'gold'
                                    
                                    return (
                                        <div key={review.id} className="border-b border-gray-200 pb-6 last:border-b-0">
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                                                        {review.user.image ? (
                                                            <img
                                                                src={review.user.image}
                                                                alt={review.user.name || 'User'}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <span className="text-gray-600 font-semibold">
                                                                {review.user.name?.[0]?.toUpperCase() || 'U'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-black">
                                                            {review.user.name || 'ანონიმური მომხმარებელი'}
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            {new Date(review.createdAt).toLocaleDateString('ka-GE')}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <StarRating rating={review.rating} readonly size="sm" color={starColor} />
                                                    {(isOwnReview || isAdmin) && !isEditing && (
                                                        <div className="flex gap-2 ml-2">
                                                            {isOwnReview && (
                                                                <button
                                                                    onClick={() => handleEditReview(review)}
                                                                    className="p-1 text-gray-600 hover:text-[#1B3729] transition-colors"
                                                                    title="რედაქტირება"
                                                                >
                                                                    <Edit className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                            {(isOwnReview || isAdmin) && (
                                                                <button
                                                                    onClick={() => handleDeleteReview(review.id)}
                                                                    disabled={deletingReviewId === review.id}
                                                                    className="p-1 text-gray-600 hover:text-red-600 transition-colors disabled:opacity-50"
                                                                    title="წაშლა"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {isEditing ? (
                                                <div className="mt-4 space-y-4 p-4 bg-gray-50 rounded-lg border">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                            რეიტინგი *
                                                        </label>
                                                        <StarRating
                                                            rating={editingRating}
                                                            onRatingChange={(rating) => setEditingRating(rating)}
                                                            size="md"
                                                            color={starColor}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                            კომენტარი
                                                        </label>
                                                        <textarea
                                                            value={editingComment}
                                                            onChange={(e) => setEditingComment(e.target.value)}
                                                            placeholder="დაწერეთ თქვენი კომენტარი..."
                                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                                                            rows={4}
                                                        />
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={handleUpdateReview}
                                                            disabled={submittingReview || editingRating === 0}
                                                            className="px-4 py-2 bg-[#1B3729] text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            {submittingReview ? 'იგზავნება...' : 'შენახვა'}
                                                        </button>
                                                        <button
                                                            onClick={handleCancelEdit}
                                                            disabled={submittingReview}
                                                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            გაუქმება
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    {review.comment && (
                                                        <p className="text-gray-700 mt-3">{review.comment}</p>
                                                    )}
                                                    
                                                    {/* Admin Reply Section */}
                                                    {isAdmin && !isReplying && (
                                                        <div className="mt-4">
                                                            {review.reply ? (
                                                                <div className="ml-6 pl-4 border-l-2 border-[#1B3729] bg-gray-50 rounded-lg p-4">
                                                                    <div className="flex items-start justify-between mb-2">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-xs font-semibold text-[#1B3729] bg-[#1B3729]/10 px-2 py-1 rounded">
                                                                                ადმინისტრატორი
                                                                            </span>
                                                                            <span className="text-sm text-gray-500">
                                                                                {new Date(review.reply.createdAt).toLocaleDateString('ka-GE')}
                                                                            </span>
                                                                        </div>
                                                                        <button
                                                                            onClick={() => handleDeleteReply(review.id)}
                                                                            disabled={deletingReplyId === review.id}
                                                                            className="p-1 text-gray-600 hover:text-red-600 transition-colors disabled:opacity-50"
                                                                            title="პასუხის წაშლა"
                                                                        >
                                                                            <Trash2 className="w-3 h-3" />
                                                                        </button>
                                                                    </div>
                                                                    <p className="text-gray-700">{review.reply.comment}</p>
                                                                    <button
                                                                        onClick={() => handleReplyToReview(review.id, { comment: review.reply!.comment })}
                                                                        className="mt-2 text-sm text-[#1B3729] hover:underline"
                                                                    >
                                                                        რედაქტირება
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleReplyToReview(review.id)}
                                                                    className="mt-2 text-sm text-[#1B3729] hover:underline font-medium"
                                                                >
                                                                    პასუხის გაცემა
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                    
                                                    {/* Reply Form */}
                                                    {isReplying && (
                                                        <div className="mt-4 ml-6 pl-4 border-l-2 border-[#1B3729] bg-gray-50 rounded-lg p-4">
                                                            <div className="mb-2">
                                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                                    პასუხი
                                                                </label>
                                                                <textarea
                                                                    value={replyComment}
                                                                    onChange={(e) => setReplyComment(e.target.value)}
                                                                    placeholder="დაწერეთ პასუხი..."
                                                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B3729] focus:border-transparent"
                                                                    rows={3}
                                                                />
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={handleSubmitReply}
                                                                    disabled={submittingReply || !replyComment.trim()}
                                                                    className="px-4 py-2 bg-[#1B3729] text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                >
                                                                    {submittingReply ? 'იგზავნება...' : 'პასუხის გაგზავნა'}
                                                                </button>
                                                                <button
                                                                    onClick={handleCancelReply}
                                                                    disabled={submittingReply}
                                                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                >
                                                                    გაუქმება
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
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
