"use client"
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "@/component/AppImage"
import Link from "next/link"
import DatePicker from "react-datepicker"
import {
    ArrowLeft,
    CalendarDays,
    CheckCircle,
    ChevronLeft,
    ChevronRight,
    CreditCard,
    RotateCcw,
    Shield,
    Edit,
    Trash2,
    MessageCircle,
    X,
} from "lucide-react"
import { useCart } from "@/hooks/useCart"
import { useSession } from 'next-auth/react';

import { Product, RentalPeriod } from "@/types/product"
import { formatDate } from "@/utils/dateUtils"
import SimilarProducts from "@/components/SimilarProducts"
import ProductSalePrice from "@/components/ProductSalePrice"
import RentalTierPrice from "@/components/RentalTierPrice"
import BuyerPriceBreakdown from "@/components/BuyerPriceBreakdown"
import { getBuyerPrice, getBuyerSavingsFromSellerDiscount } from "@/lib/platform-pricing"
import { calcRentalBuyerPayableTotal } from "@/lib/rental-inquiry"
import StarRating from "@/components/StarRating"
import { showToast } from "@/utils/toast"
import ChatTypingIndicator from "@/components/ChatTypingIndicator"
import { useChatTyping } from "@/hooks/useChatTyping"
import StructuredData from "@/components/StructuredData"
import { PRODUCT_IMAGE_QUALITY } from "@/lib/image-config"
import { useProductStatusSync } from "@/hooks/useProductStatusSync"
import {
  calcRentalDays,
  firstAvailableRentalStartAfter,
  getBlockedCalendarDates,
  getRentalCalendarMaxEndDate,
  getRentalCalendarMaxSelectableDate,
  getRentalCalendarMinStartDate,
  hasRentalPeriodConflict,
  isDateBlockedByRentalPeriods,
  isDateInRentalCalendarWindow,
  isRentalEndBeforeStart,
  MAX_RENTAL_PERIOD_DAYS,
  normalizeDateOnly,
  RENTAL_CALENDAR_LIMIT_MESSAGE,
  validateSelfServeRentalDates,
} from "@/lib/rental-dates"
type Tier = { minDays: number; pricePerDay: number }

function formatDateInput(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

// Helper to normalize date to start of day
const startOfDay = (date: Date) => normalizeDateOnly(date)


const ProductPage = () => {
    const params = useParams()
    const router = useRouter()
    const productId = params.id as string


    const { addToCart } = useCart()
    const { data: session } = useSession();

    const [product, setProduct] = useState<Product | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [activeImage, setActiveImage] = useState(0)
    const [isGalleryOpen, setIsGalleryOpen] = useState(false)

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

    // Chat state
    const [isChatOpen, setIsChatOpen] = useState(false)
    const [chatRoomId, setChatRoomId] = useState<number | null>(null)
    const [chatMessages, setChatMessages] = useState<Array<{
        id: number
        content: string
        createdAt: string
        isFromAdmin: boolean
        userId?: string | null
        user_name?: string | null
        user_email?: string | null
        admin_name?: string | null
        admin_email?: string | null
    }>>([])
    const [newChatMessage, setNewChatMessage] = useState('')
    const [sendingChatMessage, setSendingChatMessage] = useState(false)
    const [loadingChatMessages, setLoadingChatMessages] = useState(false)
    const [buyerInfo, setBuyerInfo] = useState<{ name?: string | null; email?: string | null; image?: string | null } | null>(null)
    const [chatRoomInfo, setChatRoomInfo] = useState<{ userId?: string | null; adminId?: string | null } | null>(null)
    const [otherPartyTyping, setOtherPartyTyping] = useState(false)

    type InquirySnapshot = {
        id: number
        status: string
        onSiteAvailable: boolean | null
        chatRoomId: number | null
        expiresAt?: string | null
    } | null
    const [rentalInquiry, setRentalInquiry] = useState<InquirySnapshot>(null)
    const [requiresInquiry, setRequiresInquiry] = useState(true)
    const [canBookFromInquiry, setCanBookFromInquiry] = useState(false)
    const [submittingInquiry, setSubmittingInquiry] = useState(false)
    const prevInquiryStatusRef = useRef<string | null>(null)

    const { notifyTyping, stopTyping } = useChatTyping({
        chatRoomId,
        enabled: isChatOpen && !!chatRoomId,
    })

    const refreshInquiryStatus = useCallback(async () => {
        if (!session?.user?.id || !productId) return
        const params = new URLSearchParams()
        if (rentalStartDate) params.set('startDate', rentalStartDate)
        if (rentalEndDate) params.set('endDate', rentalEndDate)
        try {
            const res = await fetch(
                `/api/products/${productId}/rental-inquiry?${params.toString()}`,
            )
            const data = await res.json()
            if (data.success) {
                const nextStatus = data.inquiry?.status ?? null
                if (prevInquiryStatusRef.current === 'PENDING' && nextStatus === 'APPROVED') {
                    showToast('დადასტურებულია — შეგიძლიათ დაჯავშნოთ', 'success')
                } else if (prevInquiryStatusRef.current === 'PENDING' && nextStatus === 'REJECTED') {
                    showToast('ამ თარიღებზე პროდუქტი ადგილზე არ არის', 'warning')
                }
                prevInquiryStatusRef.current = nextStatus

                setRequiresInquiry(Boolean(data.requiresInquiry))
                setRentalInquiry(data.inquiry || null)
                setCanBookFromInquiry(Boolean(data.canBook))

                if (
                    data.inquiry?.status === 'APPROVED' &&
                    data.inquiry.startDate &&
                    data.inquiry.endDate
                ) {
                    const approvedStart = formatDateInput(
                        normalizeDateOnly(data.inquiry.startDate),
                    )
                    const approvedEnd = formatDateInput(
                        normalizeDateOnly(data.inquiry.endDate),
                    )
                    setRentalStartDate((prev) => prev || approvedStart)
                    setRentalEndDate((prev) => prev || approvedEnd)
                }

                if (data.inquiry?.chatRoomId) {
                    setChatRoomId(data.inquiry.chatRoomId)
                }
            }
        } catch (e) {
            console.error('Inquiry status:', e)
        }
    }, [session?.user?.id, productId, rentalStartDate, rentalEndDate])

    useEffect(() => {
        refreshInquiryStatus()
    }, [refreshInquiryStatus])

    // Poll inquiry status while waiting for seller confirmation
    useEffect(() => {
        if (!session?.user?.id || !requiresInquiry) return
        if (rentalInquiry?.status !== 'PENDING') return

        const interval = setInterval(() => {
            refreshInquiryStatus()
        }, 3000)

        return () => clearInterval(interval)
    }, [session?.user?.id, requiresInquiry, rentalInquiry?.status, refreshInquiryStatus])

    // Check if user has an active chat for this product
    useEffect(() => {
        const checkExistingChat = async () => {
            if (!session?.user?.id || !product?.user?.id || session.user.id === product?.user?.id) return

            try {
                const response = await fetch('/api/chat')
                const data = await response.json()
                if (data.success && product?.user?.id) {
                    // Find chat room where current user is buyer (userId) and product author is seller (adminId)
                    const existingChat = data.chatRooms.find((room: any) =>
                        room.userId === session.user.id &&
                        room.adminId === product?.user?.id &&
                        (room.status === 'ACTIVE' || room.status === 'PENDING')
                    )

                    if (existingChat) {
                        setChatRoomId(existingChat.id)
                        setChatRoomInfo({
                            userId: existingChat.userId,
                            adminId: existingChat.adminId
                        })
                        // Auto-open chat if it exists
                        setIsChatOpen(true)
                        fetchChatMessages(existingChat.id)
                    }
                }
            } catch (error) {
                console.error('Error checking existing chat:', error)
            }
        }

        checkExistingChat()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session?.user?.id, product?.user?.id])

    const tiers: Tier[] = useMemo(() => {
        if (!product) return []

        const normalized =
            (product.rentalPriceTiers as Tier[] | undefined)?.filter(
                tier => tier.pricePerDay && tier.pricePerDay > 0
            ).map(tier => ({
                ...tier,
                pricePerDay: Number(tier.pricePerDay),
            })) || []

        if (normalized.length) {
            return [...normalized].sort((a, b) => a.minDays - b.minDays)
        }

        const fallbackPrice =
            typeof product.pricePerDay === 'number' && product.pricePerDay > 0
                ? product.pricePerDay
                : null

        if (!fallbackPrice) {
            return []
        }

        return [
            { minDays: 4, pricePerDay: fallbackPrice },
            { minDays: 7, pricePerDay: Number((fallbackPrice * 0.6).toFixed(2)) },
            { minDays: 28, pricePerDay: Number((fallbackPrice * 0.4).toFixed(2)) },
        ]
    }, [product])

    const canRent = Boolean(product?.isRentable && tiers.length > 0)
    const canBuyProduct = useMemo(() => {
        if (!product?.variants || product.variants.length === 0) {
            return false
        }
        return product.variants.some(variant => (variant.price ?? 0) > 0)
    }, [product])

    // Auto-switch to rent mode if product is rented or if buy price is 0
    useEffect(() => {
        if (!product) return

        if (purchaseMode === 'rent' && !canRent) {
            if (canBuyProduct) {
                setPurchaseMode('buy')
            }
            return
        }

        if (product.status === 'RENTED' && purchaseMode === 'buy' && canRent) {
            setPurchaseMode('rent')
            return
        }

        if (purchaseMode === 'buy') {
            if (!canBuyProduct && canRent) {
                setPurchaseMode('rent')
                return
            }
            if (selectedSize && product.variants && product.variants.length > 0) {
                const variant = product.variants[0] // Use first variant since they're just different prices
                const price = variant?.price ?? 0
                if (price === 0 && canRent) {
                    setPurchaseMode('rent')
                }
            }
        }
    }, [product, purchaseMode, selectedSize, canRent, canBuyProduct])

    // Active rental periods for calendar blocking
    const [activeRentalPeriods, setActiveRentalPeriods] = useState<RentalPeriod[]>([])

    // -------------------------
    // Fetch product + rental status
    // -------------------------
    const reloadProduct = useCallback(async () => {
        if (!productId) return false
        try {
            const [pRes, rRes] = await Promise.all([
                fetch(`/api/products/${productId}`, { cache: 'no-store' }),
                fetch(`/api/products/${productId}/rental-status`, { cache: 'no-store' }),
            ])
            const pJson = await pRes.json()
            const rJson = await rRes.json()

            if (pJson?.success) {
                setProduct(pJson.product)
                setRequiresInquiry(
                    Boolean(
                        pJson.product?.isRentable &&
                            pJson.product?.requiresInquiryBeforeRent !== false,
                    ),
                )
                setError(null)
            } else {
                setError(pJson?.message || 'პროდუქტი ვერ მოიძებნა')
                setProduct(null)
                return false
            }

            if (rJson?.success) {
                const periods: RentalPeriod[] = Array.isArray(rJson.activeRentals)
                    ? rJson.activeRentals
                    : (rJson.variants || []).flatMap(
                          (v: { activeRentals?: RentalPeriod[] }) => v.activeRentals || [],
                      )
                const unique = periods.filter((period, index, list) =>
                    list.findIndex(
                        (p) =>
                            p.startDate === period.startDate &&
                            p.endDate === period.endDate,
                    ) === index,
                )
                setActiveRentalPeriods(unique)
            } else {
                setActiveRentalPeriods([])
            }
            return true
        } catch (e) {
            console.error('Error refreshing product data:', e)
            return false
        }
    }, [productId])

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true)
                await reloadProduct()
            } catch (e) {
                console.error('Error fetching product data:', e)
                setError('შეცდომა პროდუქტის ჩატვირთვისას')
                setProduct(null)
            } finally {
                setLoading(false)
            }
        }
        if (productId) fetchData()
    }, [productId, reloadProduct])

    useProductStatusSync(productId, ({ status }) => {
        setProduct((prev) => (prev ? { ...prev, status } : prev))
        void reloadProduct()
    })

    useEffect(() => {
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
    const minDaysGlobal = tiers.length ? Math.min(...tiers.map(t => t.minDays)) : 4
    const rentalCalendarMinDate = useMemo(() => getRentalCalendarMinStartDate(), [])
    const rentalCalendarMaxDate = useMemo(() => getRentalCalendarMaxSelectableDate(), [])
    const selfServeRentalValidation = useMemo(() => {
        if (!rentalStartDate || !rentalEndDate) return null
        return validateSelfServeRentalDates(rentalStartDate, rentalEndDate)
    }, [rentalStartDate, rentalEndDate])
    const selfServeDatesValid = selfServeRentalValidation?.ok ?? false

    const getMainImage = () =>
        product?.images?.[activeImage]?.url || product?.images?.[0]?.url || "/placeholder.jpg"

    const imageCount = product?.images?.length ?? 0

    const showPrevImage = () => {
        if (imageCount <= 1) return
        setActiveImage((i) => (i - 1 + imageCount) % imageCount)
    }

    const showNextImage = () => {
        if (imageCount <= 1) return
        setActiveImage((i) => (i + 1) % imageCount)
    }

    useEffect(() => {
        if (!isGalleryOpen) return

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setIsGalleryOpen(false)
            if (imageCount <= 1) return
            if (e.key === "ArrowLeft") setActiveImage((i) => (i - 1 + imageCount) % imageCount)
            if (e.key === "ArrowRight") setActiveImage((i) => (i + 1) % imageCount)
        }

        document.addEventListener("keydown", onKeyDown)
        return () => document.removeEventListener("keydown", onKeyDown)
    }, [isGalleryOpen, imageCount])

    // Since variants no longer have size, use product size
    const getAvailableSizes = () => product?.size ? [product.size] : []

    const effectiveRentalPeriods =
        product?.status === 'AVAILABLE' ? [] : activeRentalPeriods

    const getRentalPeriods = (): RentalPeriod[] => effectiveRentalPeriods

    const hasActiveRentals = (): boolean => effectiveRentalPeriods.length > 0

    const blockedRentalDates = getBlockedCalendarDates(effectiveRentalPeriods)

    // Get first available variant (one without active rentals)
    const firstAvailableVariant = () => {
        if (!product?.variants) return null
        if (hasActiveRentals()) return product.variants[0] || null
        return product.variants[0] || null
    }

    useEffect(() => {
        if (product && !selectedSize) {
            // Use product size if available
            const sz = product.size || 'default'
            if (sz) {
                setSelectedSize(sz)
            }
        }
    }, [product, activeRentalPeriods, selectedSize])

    // Select variant by index (since variants are just different prices now)
    const hasVariants = product?.variants && Array.isArray(product.variants) && product.variants.length > 0
    const selectedVariantIndex = hasVariants ? 0 : -1
    const selectedVariant = hasVariants ? product.variants[0] : undefined
    const selectedPrice = selectedVariant?.price ?? 0
    const isProductOwner = session?.user?.id === product?.user?.id
    const pricingMode = isProductOwner ? 'seller' : 'buyer'
    const showBuyOption = Boolean(canBuyProduct && selectedSize && selectedPrice > 0)
    const rentStatusAllowed =
        product?.status === 'AVAILABLE' ||
        product?.status === 'RENTED' ||
        product?.status === 'RESERVED' ||
        typeof product?.status === 'undefined'
    const showRentOption = Boolean(canRent && rentStatusAllowed)
    const selectedStock = product?.stock ?? 0

    const handleSizeClick = (size: string) => {
        // Allow size selection in both buy and rent modes, as long as product is not in maintenance or damaged
        if (product?.status !== 'MAINTENANCE' && product?.status !== 'DAMAGED') {
            setSelectedSize(size)
        }
    }

    const handleQuantity = (q: number) => {
        if (q >= 1 && q <= selectedStock) setQuantity(q)
    }

    const earliestAvailableGlobal = () => {
        if (!effectiveRentalPeriods.length) return null
        const sorted = [...effectiveRentalPeriods].sort(
            (a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime()
        )
        const earliestEndDate = firstAvailableRentalStartAfter(sorted[0].endDate)
        return earliestEndDate.toISOString()
    }

    const getRentalConflicts = (startDate: string, endDate: string) =>
        getRentalPeriods().filter((period) =>
            hasRentalPeriodConflict(startDate, endDate, period.startDate, period.endDate),
        )

    const isDateBlocked = (date: Date) => {
        if (!date) return false
        return isDateBlockedByRentalPeriods(date, effectiveRentalPeriods)
    }

    useEffect(() => {
        if (!rentalStartDate && !rentalEndDate) return

        const startBlocked =
            rentalStartDate &&
            isDateBlockedByRentalPeriods(rentalStartDate, effectiveRentalPeriods)
        const endBlocked =
            rentalEndDate &&
            isDateBlockedByRentalPeriods(rentalEndDate, effectiveRentalPeriods)
        const hasConflict =
            rentalStartDate &&
            rentalEndDate &&
            effectiveRentalPeriods.some((period) =>
                hasRentalPeriodConflict(
                    rentalStartDate,
                    rentalEndDate,
                    period.startDate,
                    period.endDate,
                ),
            )

        if (startBlocked || endBlocked || hasConflict) {
            setRentalStartDate('')
            setRentalEndDate('')
        }
    }, [effectiveRentalPeriods, rentalStartDate, rentalEndDate])

    const calcDays = () => {
        if (!rentalStartDate || !rentalEndDate) return 0
        return calcRentalDays(rentalStartDate, rentalEndDate)
    }

    const rentalQuote = useMemo(() => {
        const days = calcDays()
        if (!days || !product || tiers.length === 0) return null

        return calcRentalBuyerPayableTotal(days, {
            rentalPriceTiers: tiers,
            pricePerDay: product.pricePerDay,
            discount: product.discount,
            discountDays: product.discountDays,
            discountStartDate: product.discountStartDate,
        })
    }, [
        rentalStartDate,
        rentalEndDate,
        product,
        tiers,
    ])

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
        
        if (product.status === 'DAMAGED') {
            showToast("პროდუქტი დაზიანებულია და ამჟამად ხელმისაწვდომი არ არის", "warning")
            return
        }
        
        if (product.status === 'MAINTENANCE') {
            showToast("პროდუქტი რესტავრაციაზეა და ამჟამად ხელმისაწვდომი არ არის", "warning")
            return
        }
        
        setIsAdding(true)

        const result = await addToCart({
            productId: product.id,
            productName: product.name,
            image: getMainImage(),
            size: selectedSize,
            quantity: 1,
            price: getBuyerPrice(selectedPrice),
            isRental: false,
        })

        if (result.success) {
            showToast("პროდუქტი დაემატა კალათაში", "success")
        } else {
            showToast(result.message, "error")
        }
        setIsAdding(false)
    }

    const handleBuyCheckout = async () => {
        if (!product || !selectedSize) return
        if (isAdding) return

        if (product.status === 'DAMAGED') {
            showToast("პროდუქტი დაზიანებულია და ამჟამად ხელმისაწვდომი არ არის", "warning")
            return
        }

        if (product.status === 'MAINTENANCE') {
            showToast("პროდუქტი რესტავრაციაზეა და ამჟამად ხელმისაწვდომი არ არის", "warning")
            return
        }

        setIsAdding(true)

        const result = await addToCart({
            productId: product.id,
            productName: product.name,
            image: getMainImage(),
            size: selectedSize,
            quantity: 1,
            price: getBuyerPrice(selectedPrice),
            isRental: false,
        })

        if (result.success) {
            router.push(`/checkout?item=${result.itemId}`)
        } else {
            showToast(result.message, "error")
        }
        setIsAdding(false)
    }

    const fetchChatMessages = async (roomId: number) => {
        try {
            setLoadingChatMessages(true)
            const response = await fetch(`/api/chat/${roomId}`)
            const data = await response.json()
            if (data.success) {
                setChatMessages(data.messages || [])
                setOtherPartyTyping(Boolean(data.otherPartyTyping))

                // Store chat room info from API response
                if (data.chatRoom) {
                    setChatRoomInfo({
                        userId: data.chatRoom.userId,
                        adminId: data.chatRoom.adminId
                    })
                }

                // Fetch chat room info to get buyer/author details for display
                const roomResponse = await fetch('/api/chat')
                const roomData = await roomResponse.json()
                if (roomData.success) {
                    const room = roomData.chatRooms.find((r: any) => r.id === roomId)
                    if (room) {
                        // If current user is the author (adminId), show buyer info
                        if (session?.user?.id === product?.user?.id) {
                            setBuyerInfo({
                                name: room.user_name || null,
                                email: room.user_email || null,
                                image: null
                            })
                        } else {
                            // If current user is the buyer, show author info
                            setBuyerInfo({
                                name: room.admin_name || product?.user?.name || null,
                                email: room.admin_email || null,
                                image: product?.user?.image || null
                            })
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching messages:', error)
        } finally {
            setLoadingChatMessages(false)
        }
    }

    const sendChatMessage = async () => {
        if (!newChatMessage.trim() || !chatRoomId) return

        setSendingChatMessage(true)
        const messageToSend = newChatMessage.trim()
        setNewChatMessage('')
        stopTyping()

        try {
            const response = await fetch(`/api/chat/${chatRoomId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: messageToSend })
            })

            const data = await response.json()
            if (data.success) {
                // Refresh messages
                fetchChatMessages(chatRoomId)
            } else {
                showToast(data.error || 'შეცდომა შეტყობინების გაგზავნისას', 'error')
                setNewChatMessage(messageToSend) // Restore message on error
            }
        } catch (error) {
            console.error('Error sending message:', error)
            showToast('შეცდომა შეტყობინების გაგზავნისას', 'error')
            setNewChatMessage(messageToSend) // Restore message on error
        } finally {
            setSendingChatMessage(false)
        }
    }

    // Poll for new messages when chat is open
    useEffect(() => {
        if (isChatOpen && chatRoomId) {
            fetchChatMessages(chatRoomId)
            const interval = setInterval(() => {
                fetchChatMessages(chatRoomId)
            }, 3000)
            return () => clearInterval(interval)
        }
    }, [isChatOpen, chatRoomId])

    const handleContactAuthor = async () => {
        if (!session) {
            showToast('გთხოვთ შეხვიდეთ სისტემაში ავტორთან დასაკონტაქტებლად', 'warning')
            return
        }

        if (!product?.user?.id) {
            showToast('ავტორის ინფორმაცია ვერ მოიძებნა', 'error')
            return
        }

        // Don't allow users to chat with themselves
        if (session.user.id === product.user.id) {
            showToast('თქვენ არ შეგიძლიათ საკუთარ თავთან დაკონტაქტება', 'warning')
            return
        }

        try {
            const response = await fetch(`/api/chat/product/${productId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            })

            const data = await response.json()

            if (data.success) {
                showToast('ჩათი შექმნილია', 'success')
                // Open chat on the same page
                setChatRoomId(data.chatRoomId)
                setIsChatOpen(true)
                // Fetch initial messages
                fetchChatMessages(data.chatRoomId)
            } else {
                showToast(data.error || 'შეცდომა ჩათის შექმნისას', 'error')
            }
        } catch (error) {
            console.error('Error creating chat:', error)
            showToast('შეცდომა ჩათის შექმნისას', 'error')
        }
    }

    const handleSubmitInquiry = async () => {
        if (!product || !session?.user?.id) {
            showToast('გთხოვთ შეხვიდეთ ანგარიშში', 'warning')
            return
        }

        if (!rentalStartDate || !rentalEndDate) {
            showToast('აირჩიეთ ქირავების თარიღები', 'warning')
            return
        }

        if (isRentalEndBeforeStart(rentalStartDate, rentalEndDate)) {
            showToast('დასრულების თარიღი არ შეიძლება იყოს დაწყების წინ', 'warning')
            return
        }

        const days = calcDays()
        const calendarCheck = validateSelfServeRentalDates(
            rentalStartDate,
            rentalEndDate,
        )
        if (!calendarCheck.ok) {
            showToast(calendarCheck.message, 'warning')
            return
        }

        const conflicts = getRentalConflicts(rentalStartDate, rentalEndDate)

        if (conflicts.length > 0) {
            showToast('ამ თარიღებზე პროდუქტი დაკავებულია', 'warning')
            return
        }

        setSubmittingInquiry(true)
        try {
            const res = await fetch('/api/rental-inquiries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId: product.id,
                    startDate: rentalStartDate,
                    endDate: rentalEndDate,
                    size: selectedSize || product.size || undefined,
                }),
            })
            const data = await res.json()
            if (data.success) {
                showToast(data.message || 'მოთხოვნა გაგზავნილია', 'success')
                prevInquiryStatusRef.current = 'PENDING'
                setRentalInquiry({
                    id: data.inquiry.id,
                    status: 'PENDING',
                    onSiteAvailable: null,
                    chatRoomId: data.chatRoomId,
                })
                setCanBookFromInquiry(false)
                if (data.chatRoomId) {
                    setChatRoomId(data.chatRoomId)
                    setIsChatOpen(true)
                    fetchChatMessages(data.chatRoomId)
                }
            } else {
                showToast(data.message || 'შეცდომა', 'error')
            }
        } catch {
            showToast('შეცდომა მოთხოვნის გაგზავნისას', 'error')
        } finally {
            setSubmittingInquiry(false)
        }
    }

    const handleDeleteInquiry = async () => {
        if (!rentalInquiry?.id) return
        if (!window.confirm('ნამდვილად გსურთ მოთხოვნის წაშლა?')) return

        try {
            const res = await fetch(`/api/rental-inquiries/${rentalInquiry.id}`, {
                method: 'DELETE',
            })
            const data = await res.json()
            if (data.success) {
                showToast('მოთხოვნა წაიშალა', 'success')
                prevInquiryStatusRef.current = null
                setRentalInquiry(null)
                setCanBookFromInquiry(false)
            } else {
                showToast(data.message || 'შეცდომა', 'error')
            }
        } catch {
            showToast('შეცდომა მოთხოვნის წაშლისას', 'error')
        }
    }

    const handleRental = async () => {
        if (!product) return

        const sizeForCart = selectedSize || product.size || 'default'

        if (requiresInquiry && !canBookFromInquiry) {
            showToast('ჯერ გაგზავნეთ მოთხოვნა და დაელოდეთ ავტორის დადასტურებას', 'warning')
            return
        }

        // Only block if product is in maintenance, damaged, or completely unavailable
        if (product.status === 'MAINTENANCE') {
            showToast("პროდუქტი რესტავრაციაზეა და ამჟამად ხელმისაწვდომი არ არის", "warning")
            return
        }
        if (product.status === 'DAMAGED') {
            showToast("პროდუქტი დაზიანებულია და ამჟამად ხელმისაწვდომი არ არის", "warning")
            return
        }

        if (!rentalStartDate || !rentalEndDate) {
            showToast("აირჩიე ქირაობის თარიღები", "warning")
            return
        }

        if (isRentalEndBeforeStart(rentalStartDate, rentalEndDate)) {
            showToast("დასრულების თარიღი არ შეიძლება იყოს დაწყების წინ", "warning")
            return
        }

        // Check rental period and calendar window
        const calendarCheck = validateSelfServeRentalDates(
            rentalStartDate,
            rentalEndDate,
        )
        if (!calendarCheck.ok) {
            showToast(calendarCheck.message, "warning")
            return
        }

        const days = calcDays()

        const conflicts = getRentalConflicts(rentalStartDate, rentalEndDate)

        if (conflicts.length > 0) {
            showToast("ამ თარიღებზე პროდუქტი დაკავებულია. გთხოვთ აირჩიოთ სხვა თარიღები", "warning")
            return
        }

        if (isAdding) return

        setIsAdding(true)

        const total = priceForDays(days)

        const result = await addToCart({
            productId: product.id,
            productName: product.name,
            image: getMainImage(),
            size: sizeForCart,
            quantity: 1,
            isRental: true,
            rentalStartDate,
            rentalEndDate,
            rentalDays: days,
            price: getBuyerPrice(total),
        })

        if (result.success) {
            router.push(`/checkout?item=${result.itemId}`)
        } else {
            showToast(result.message, "error")
        }
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
                    <p className="text-black">იტვირთება...</p>
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
            {product && <StructuredData type="Product" data={product} />}
            {/* Header (Back) */}
            <header className=" top-0 z-30 ">
                <div className="max-w-[1200px] mx-auto px-4 py-4">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="flex md:text-[20px] text-[18px] items-center text-black hover:opacity-80"
                    >
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        უკან დაბრუნება
                    </button>
                </div>
            </header>

            <main className="max-w-[1200px] mx-auto px-4 py-10">
                <div className="grid lg:grid-cols-2 gap-10">
                    {/* LEFT — Gallery */}
                    <section>
                        <div className="flex flex-col lg:flex-row gap-4">
                            {/* Main image - First on mobile, second on desktop */}
                            <button
                                type="button"
                                onClick={() => setIsGalleryOpen(true)}
                                aria-label="სურათის გადიდება"
                                className="relative w-full lg:flex-1 
                aspect-[3/4] sm:w-[100px] lg:aspect-[3/4]
                bg-white rounded-2xl overflow-hidden shadow border
                order-1 lg:order-2 cursor-pointer group"
                            >
                                <Image
                                    src={getMainImage()}
                                    alt={product.name}
                                    fill
                                    quality={PRODUCT_IMAGE_QUALITY}
                                    sizes="(max-width: 640px) 100vw,
               (max-width: 1024px) 50vw,
               600px"
                                    className="object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                                    priority
                                />
                            </button>


                            {/* Small images - Below on mobile, left on desktop */}
                            <div className="flex flex-row lg:flex-col gap-3 order-2 lg:order-1 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
                                {product.images?.map((img, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setActiveImage(i)}
                                        className={`relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden border-2 transition group ${activeImage === i
                                            ? "border-black"
                                            : "border-gray-200 hover:border-black"
                                            }`}
                                    >
                                        <Image
                                            width={164}
                                            height={164}
                                            src={img.url}
                                            alt={`${product.name}-${i}`}
                                            quality={PRODUCT_IMAGE_QUALITY}
                                            sizes="80px"
                                            className="object-cover transition-transform duration-300 ease-out group-hover:scale-110"
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {isGalleryOpen && (
                            <div
                                className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
                                onClick={() => setIsGalleryOpen(false)}
                            >
                                <button
                                    type="button"
                                    onClick={() => setIsGalleryOpen(false)}
                                    className="absolute top-4 right-4 text-white hover:text-gray-300 text-3xl font-bold z-10 bg-black/50 rounded-full w-10 h-10 flex items-center justify-center cursor-pointer"
                                    aria-label="დახურვა"
                                >
                                    <X className="w-5 h-5" />
                                </button>

                                {imageCount > 1 && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); showPrevImage() }}
                                            className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-black/50 hover:bg-black/70 rounded-full w-10 h-10 flex items-center justify-center z-10 cursor-pointer"
                                            aria-label="წინა სურათი"
                                        >
                                            <ChevronLeft className="w-6 h-6" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); showNextImage() }}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-black/50 hover:bg-black/70 rounded-full w-10 h-10 flex items-center justify-center z-10 cursor-pointer"
                                            aria-label="შემდეგი სურათი"
                                        >
                                            <ChevronRight className="w-6 h-6" />
                                        </button>
                                    </>
                                )}

                                <div
                                    className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <Image
                                        width={1600}
                                        height={1600}
                                        src={getMainImage()}
                                        alt={product.name}
                                        quality={PRODUCT_IMAGE_QUALITY}
                                        className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                                    />
                                </div>

                                {imageCount > 1 && (
                                    <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm">
                                        {activeImage + 1} / {imageCount}
                                    </p>
                                )}
                            </div>
                        )}
                    </section>

                    {/* RIGHT — Details */}
                    <section className="space-y-6">
                        <div className="bg-white ">


                            {/* Author Info */}
                            <div className="bg-white  p-6 ">
                                <div className="flex flex-col md:flex-row gap-4 md:gap-2 items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        <div className="relative w-16 h-16 rounded-full overflow-hidden bg-black">
                                            {product.user?.image ? (
                                                <Image
                                                    width={64}
                                                    height={64}
                                                    src={product.user.image}
                                                    alt={product.user.name || "ავტორი"}

                                                    className="object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-black text-white font-semibold">
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
                                                    <h3 className="md:text-[18px] text-[16px] font-semibold text-black hover:text-underline transition-colors">
                                                        {product.user.name || "უცნობი ავტორი"}
                                                    </h3>
                                                </Link>
                                            ) : (
                                                <h3 className="md:text-[20px] text-[18px] font-semibold text-black">
                                                    უცნობი ავტორი
                                                </h3>
                                            )}
                                            <p className="md:text-[20px] text-[18px] text-black">პროდუქტის ავტორი</p>
                                        </div>
                                    </div>
                                    {product.user && session?.user?.id !== product.user.id && (
                                        <button
                                            onClick={handleContactAuthor}
                                            className="flex items-center space-x-2 px-4 py-2 bg-black text-white rounded-lg hover:opacity-90 transition-opacity md:text-[16px] text-[14px] font-medium"
                                        >
                                            <MessageCircle className="w-4 h-4" />
                                            <span>დაეკონტაქტე</span>
                                        </button>
                                    )}
                                </div>
                                {product.sku && (
                                    <div className="bg-white flex items-center justify-between p-6 ">
                                        <p className="text-black md:text-[18px] text-[16px] uppercase tracking-wide">პროდუქტის საიდენტიფიკაციო </p>
                                        <p className="text-black md:text-[18px] text-[16px]">{product.sku}</p>
                                    </div>
                                )}
                            </div>
                            {/* Title */}
                            <div className="bg-white  p-6 s">
                                <h1 className="text-3xl font-bold text-black md:text-[20px] text-[18px]">{product.name}</h1>
                                {product.description && (
                                    <p className="text-black md:text-[18px] text-[16px] mt-2 leading-relaxed">{product.description}</p>
                                )}
                            </div>

                            {/* Sale price */}
                            {canBuyProduct && (
                                <div className="bg-white p-6  rounded-2xl">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-black md:text-[18px] text-[16px] uppercase tracking-wide">გაყიდვის ფასი</p>
                                            <p className="md:text-[18px] text-[16px] text-black">
                                                {selectedSize
                                                    ? 'ფასი არჩეული ზომისთვის'
                                                    : 'აირჩიეთ ზომა ფასის სანახავად'}
                                            </p>
                                        </div>
                                        {showBuyOption ? (
                                            <div className="flex flex-col items-end gap-2">
                                                {product.discount && product.discount > 0 ? (
                                                    <>
                                                        <ProductSalePrice
                                                            originalPrice={selectedPrice}
                                                            discount={product.discount}
                                                            size="lg"
                                                            pricingMode={pricingMode}
                                                        />
                                                        <div className="bg-[#1B3729] rounded-md text-[#FFFFFF] font-regular flex items-center px-2 py-1">
                                                            <span className="text-sm whitespace-nowrap">
                                                                დანაზოგი: ₾
                                                                {(pricingMode === 'buyer'
                                                                    ? getBuyerSavingsFromSellerDiscount(product.discount)
                                                                    : product.discount
                                                                ).toFixed(2)}
                                                            </span>
                                                            {product.discountDays && (
                                                                <span className="bg-white text-black px-2 py-1 rounded ml-2 text-sm whitespace-nowrap">{product.discountDays} დღე</span>
                                                            )}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="text-3xl font-bold text-black">
                                                        ₾
                                                        {(pricingMode === 'buyer'
                                                            ? getBuyerPrice(selectedPrice)
                                                            : selectedPrice
                                                        ).toFixed(2)}
                                                    </div>
                                                )}
                                                {pricingMode === 'buyer' && (
                                                    <BuyerPriceBreakdown
                                                        sellerPrice={selectedPrice}
                                                        discount={product.discount}
                                                        className="w-full max-w-xs"
                                                    />
                                                )}
                                            </div>
                                        ) : (
                                            <div className="md:text-[18px] text-[16px] font-semibold text-black">
                                                ფასის გარეშე
                                            </div>
                                        )}
                                    </div>
                                    {selectedSize && !showBuyOption && (
                                        <p className="md:text-[18px] text-[16px] text-red-600 mt-2">
                                            არჩეული ზომა ამჟამად არ იყიდება
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Pricing plans (4+/7+/28+) */}
                            {product.isRentable && tiers.length > 0 && (
                                <div className="bg-white  p-6 ">
                                    <div className="grid sm:grid-cols-3 gap-4">
                                        {/* 4+ days */}
                                        {tiers[0] && (
                                            <div className="border border-gray-200 rounded-xl p-4">
                                                <p className="text-[16px] text-black">{tiers[0].minDays} + დღე</p>
                                                <RentalTierPrice
                                                    minDays={tiers[0].minDays}
                                                    pricePerDay={tiers[0].pricePerDay}
                                                    discount={product.discount}
                                                    pricingMode={pricingMode}
                                                />
                                            </div>
                                        )}

                                        {/* 7+ days - Recommended */}
                                        {tiers[1] && (
                                            <div className="border relative border-emerald-400 rounded-xl p-4 ring-2 ring-emerald-400 bg-emerald-50">
                                                <span className="absolute -top-2 right-1 bg-emerald-100 text-emerald-800 text-[13px] font-semibold px-2 py-1 rounded">
                                                    რეკომენდირებული
                                                </span>
                                                <p className="text-[16px] text-black">{tiers[1].minDays} + დღე</p>
                                                <RentalTierPrice
                                                    minDays={tiers[1].minDays}
                                                    pricePerDay={tiers[1].pricePerDay}
                                                    discount={product.discount}
                                                    pricingMode={pricingMode}
                                                    totalClassName="md:text-[18px] text-[16px] text-emerald-700 mt-1 font-medium"
                                                />
                                            </div>
                                        )}

                                        {/* 28+ days */}
                                        {tiers[2] && (
                                            <div className="border border-gray-200 rounded-xl p-4">
                                                <p className="text-[16px] text-black">{tiers[2].minDays} + დღე</p>
                                                <RentalTierPrice
                                                    minDays={tiers[2].minDays}
                                                    pricePerDay={tiers[2].pricePerDay}
                                                    discount={product.discount}
                                                    pricingMode={pricingMode}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Size selector */}
                            <div className="p-6 space-y-3">
                                <h3 className="md:text-[18px] text-[16px] font-semibold text-black">ზომა:</h3>

                                {product.size && (
                                    <div className="inline-block">
                                        <div className="rounded-xl border-2 border-gray-300 bg-black  px-6 py-4 text-center transition hover:border-black">
                                            <div className="text-xl font-bold text-white">{product.size}</div>
                                        </div>
                                    </div>
                                )}
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
                                ) : product.status === 'DAMAGED' ? (
                                    <div className="text-center p-6 bg-red-50 border-2 border-red-200 rounded-xl">
                                        <div className="text-red-700 font-semibold text-lg mb-2">
                                            პროდუქტი დაზიანებულია
                                        </div>
                                        <div className="text-red-600">
                                            ამჟამად ხელმისაწვდომი არ არის
                                        </div>
                                    </div>
                                ) : (
                                    <div className={`grid gap-3 ${(showBuyOption ? 1 : 0) + (showRentOption ? 1 : 0) > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                        {/* {showBuyOption && (
                                            <button
                                                onClick={() => setPurchaseMode("buy")}
                                                disabled={product.status === 'RENTED'}
                                                className={`p-4 rounded-xl border-2 flex md:text-[18px] text-[16px] items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed ${purchaseMode === "buy"
                                                    ? "border-black bg-black text-white"
                                                    : "border-gray-300"
                                                    }`}
                                            >
                                                <CreditCard className="w-5 h-5" />
                                                ყიდვა
                                            </button>
                                        )} */}
                                        {/* {showRentOption && (
                                            <button
                                                onClick={() => setPurchaseMode("rent")}
                                                className={`p-4 rounded-xl border-2 flex md:text-[18px] text-[16px] items-center justify-center gap-2 transition ${purchaseMode === "rent"
                                                    ? "border-emerald-400 bg-emerald-100 text-black"
                                                    : "border-gray-300"
                                                    }`}
                                            >
                                                <CalendarDays className="w-5 h-5" />
                                                ქირაობა
                                            </button>
                                        )} */}
                                    </div>
                                )}

                                {purchaseMode === "rent" && canRent && product.status !== 'MAINTENANCE' && product.status !== 'DAMAGED' && (
                                    <div className="space-y-3 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                                        <div className="text-sm text-emerald-900 bg-white border border-emerald-200 rounded-lg p-3">
                                            <p>{RENTAL_CALENDAR_LIMIT_MESSAGE}</p>
                                            <button
                                                type="button"
                                                onClick={handleContactAuthor}
                                                className="mt-2 inline-flex items-center gap-1.5 text-[#1B3729] font-semibold underline hover:opacity-80"
                                            >
                                                <MessageCircle className="w-4 h-4" />
                                                დაუკავშირდით მიმწოდებელს ჩატში
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block md:text-[18px] text-black text-[16px] font-medium mb-1">დაწყება</label>
                                                <DatePicker
                                                    selected={rentalStartDate ? normalizeDateOnly(rentalStartDate) : null}
                                                    onChange={(date: Date | null) => {
                                                        if (date) {
                                                            const nextStart = formatDateInput(date)
                                                            setRentalStartDate(nextStart)
                                                            if (
                                                                !rentalEndDate ||
                                                                isRentalEndBeforeStart(nextStart, rentalEndDate)
                                                            ) {
                                                                setRentalEndDate(nextStart)
                                                            }
                                                        }
                                                    }}
                                                    filterDate={(date) => {
                                                        if (!date) return false;
                                                        if (!isDateInRentalCalendarWindow(date)) return false;
                                                        return !isDateBlocked(date);
                                                    }}
                                                    excludeDates={blockedRentalDates}
                                                    dayClassName={(date) =>
                                                        date && isDateBlocked(date)
                                                            ? 'react-datepicker__day--disabled'
                                                            : ''
                                                    }
                                                    minDate={rentalCalendarMinDate}
                                                    maxDate={rentalCalendarMaxDate}
                                                    placeholderText="აირჩიე თარიღი"
                                                    dateFormat="dd/MM/yyyy"
                                                    className="w-full text-[16px] placeholder:text-[16px] placeholder:text-gray-500 px-3 py-2 border rounded-lg"
                                                />
                                            </div>
                                            <div>
                                                <label className="block md:text-[18px] text-black text-[16px] font-medium mb-1">დასრულება</label>

                                                <DatePicker
                                                    selected={rentalEndDate ? normalizeDateOnly(rentalEndDate) : null}
                                                    onChange={(date: Date | null) => {
                                                        if (date) {
                                                            setRentalEndDate(formatDateInput(date))
                                                        }
                                                    }}
                                                    filterDate={(date) => {
                                                        if (!date) return false;
                                                        if (isDateBlocked(date)) return false;
                                                        if (!isDateInRentalCalendarWindow(date)) return false;

                                                        if (rentalStartDate) {
                                                            const start = normalizeDateOnly(rentalStartDate)
                                                            const checkDate = normalizeDateOnly(date)
                                                            const diffDays = calcRentalDays(start, checkDate)
                                                            if (diffDays > MAX_RENTAL_PERIOD_DAYS) return false
                                                        }

                                                        return true;
                                                    }}
                                                    minDate={rentalStartDate ? normalizeDateOnly(rentalStartDate) : rentalCalendarMinDate}
                                                    maxDate={
                                                        rentalStartDate
                                                            ? getRentalCalendarMaxEndDate(rentalStartDate)
                                                            : rentalCalendarMaxDate
                                                    }
                                                    excludeDates={blockedRentalDates}
                                                    dayClassName={(date) =>
                                                        date && isDateBlocked(date)
                                                            ? 'react-datepicker__day--disabled'
                                                            : ''
                                                    }
                                                    placeholderText="აირჩიე თარიღი"
                                                    dateFormat="dd/MM/yyyy"
                                                    className="w-full text-[16px] placeholder:text-[16px] placeholder:text-gray-500 px-3 py-2 border rounded-lg"
                                                />
                                            </div>
                                        </div>
                                        <p className="text-sm text-emerald-800">
                                            ერთი დღით ქირაობისთვის დაწყება და დასრულება იგივე დღე აირჩიეთ.
                                        </p>

                                        {/* Show busy rental periods */}
                                        {hasActiveRentals() && (() => {
                                            const periods = getRentalPeriods()
                                            // Get the last rental period (with latest endDate)
                                            const lastPeriod = periods.length > 0
                                                ? periods.sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())[0]
                                                : null

                                            if (!lastPeriod) return null

                                            const availableDate = firstAvailableRentalStartAfter(lastPeriod.endDate)

                                            return (
                                                <div className="text-[16px] bg-white border border-gray-200 rounded-lg p-3">
                                                    <div className="font-medium text-black mb-2">დაკავებული პერიოდი:</div>
                                                    <div className="p-2 border rounded">
                                                        <div className="text-black font-medium">ქირაობა: {formatDate(lastPeriod.startDate)} - {formatDate(lastPeriod.endDate)}</div>
                                                        <div className="text-green-600 font-semibold">ხელმისაწვდომია {formatDate(availableDate.toISOString())}-იდან</div>
                                                    </div>
                                                </div>
                                            )
                                        })()}

                                        {/* Info message about dates */}


                                        {/* Show warning if dates are outside calendar window or period */}
                                        {(rentalStartDate && rentalEndDate) && selfServeRentalValidation && !selfServeRentalValidation.ok && (
                                            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                                                {selfServeRentalValidation.message}
                                            </div>
                                        )}

                                        {/* Show warning if dates conflict with existing rentals */}
                                        {(rentalStartDate && rentalEndDate) && (() => {
                                            const conflicts = getRentalConflicts(rentalStartDate, rentalEndDate)

                                            return conflicts.length > 0 ? (
                                                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                                                    ამ თარიღებზე პროდუქტი დაკავებულია. გთხოვთ აირჩიოთ სხვა თარიღები.
                                                </div>
                                            ) : null
                                        })()}

                                        {!!calcDays() && rentalQuote && (
                                            <div className="text-center bg-white rounded-lg border p-3">
                                                <div className="text-lg font-semibold flex items-center justify-center gap-2 flex-wrap">
                                                    <span>ჯამური ფასი:</span>
                                                    {rentalQuote.hasDiscount ? (
                                                        <>
                                                            <span className="text-gray-400 line-through text-base">
                                                                ₾
                                                                {(pricingMode === 'buyer'
                                                                    ? rentalQuote.buyerListPrice
                                                                    : rentalQuote.sellerTotal
                                                                ).toFixed(2)}
                                                            </span>
                                                            <span className="text-red-600 font-semibold">
                                                                ₾
                                                                {(pricingMode === 'buyer'
                                                                    ? rentalQuote.buyerPayable
                                                                    : rentalQuote.sellerTotalAfterDiscount
                                                                ).toFixed(2)}
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <span>
                                                            ₾
                                                            {(pricingMode === 'buyer'
                                                                ? rentalQuote.buyerPayable
                                                                : rentalQuote.sellerTotal
                                                            ).toFixed(2)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}


                                    </div>
                                )}
                            </div>

                            {/* Action button */}
                            {!session ? (
                                <div className="space-y-2">
                                    <div className="p-4 text-center border-2 border-red-500 text-red-500 rounded-lg">
                                        <p className="font-bold mb-4">
                                            {purchaseMode === "rent"
                                                ? 'პროდუქტის ქირაობა შესაძლებელია მხოლოდ რეგისტრირებული მომხმარებლებისთვის. გთხოვთ, შეხვიდეთ ანგარიშში.'
                                                : 'პროდუქტის შეძენისთვის საჭიროა ანგარიში. გთხოვთ, შეხვიდეთ ანგარიშში.'}
                                        </p>
                                        <Link
                                            href="/auth/signin"
                                            className="inline-block px-6 py-2 bg-[#1B3729] text-white rounded-lg font-bold uppercase tracking-wide transition-colors hover:opacity-90"
                                        >
                                            შესვლა
                                        </Link>
                                    </div>
                                </div>
                            ) : purchaseMode === "rent" && userVerification?.status !== 'APPROVED' ? (
                                <div className="space-y-2">
                                    <div className="p-4 text-center border-2 border-amber-500 text-amber-700 rounded-lg font-bold">
                                        <div className="space-y-1">
                                            <p>პროდუქტის ქირაობა შესაძლებელია მხოლოდ ვერიფიცირებული მომხმარებლებისთვის.</p>
                                            <p>
                                                გთხოვთ, გაიაროთ{' '}
                                                <Link href="/account" className="underline hover:opacity-80">
                                                    ვერიფიკაცია
                                                </Link>
                                                !
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {product.status !== 'AVAILABLE' && (
                                        <p className="text-sm text-white font-medium text-center">
                                            {product.status === 'RENTED' && 'ნივთი გაქირავებულია'}
                                            {product.status === 'RESERVED' && 'ნივთი დაჯავშნილია'}
                                            {product.status === 'MAINTENANCE' && 'ნივთი რესტავრაციაზეა'}
                                            {product.status === 'DAMAGED' && 'პროდუქტი დაზიანებულია'}
                                        </p>
                                    )}
                                    {(purchaseMode === "rent" && canRent && (!rentalStartDate || !rentalEndDate)) && product.status === 'AVAILABLE' && (
                                        <p className="text-sm text-orange-600 font-medium text-center">
                                            გთხოვთ აირჩიოთ ქირაობის დაწყების და დასრულების თარიღები
                                        </p>
                                    )}
                                    {(purchaseMode === "rent" && canRent && rentalStartDate && rentalEndDate) && (() => {
                                        if (selfServeRentalValidation && !selfServeRentalValidation.ok) {
                                            return (
                                                <p className="text-[16px] text-red-600 font-medium text-center">
                                                    {selfServeRentalValidation.message}
                                                </p>
                                            )
                                        }

                                        const conflicts = getRentalConflicts(rentalStartDate, rentalEndDate)

                                        return conflicts.length > 0 ? (
                                            <p className="text-[16px] text-red-600 font-medium text-center">
                                                ამ თარიღებზე პროდუქტი დაკავებულია
                                            </p>
                                        ) : null
                                    })()}

                                    {purchaseMode === "rent" && canRent && rentalInquiry && (
                                        <div className={`p-3 rounded-lg text-sm text-center font-medium ${
                                            rentalInquiry.status === 'PENDING'
                                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                                : rentalInquiry.status === 'APPROVED'
                                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                                    : rentalInquiry.status === 'REJECTED'
                                                        ? 'bg-red-50 text-red-700 border border-red-200'
                                                        : 'bg-gray-50 text-gray-700 border border-gray-200'
                                        }`}>
                                            {rentalInquiry.status === 'PENDING' && 'ავტორი ამოწმებს, ადგილზე ხელმისაწვდომია თუ არა'}
                                            {rentalInquiry.status === 'APPROVED' && (
                                                <>
                                                    დადასტურებულია — გადახდისთვის გაქვთ 30 წუთი
                                                    {rentalInquiry.expiresAt ? (
                                                        <span className="block mt-1 text-xs font-normal">
                                                            ბოლო ვადა:{' '}
                                                            {new Date(rentalInquiry.expiresAt).toLocaleString('ka-GE', {
                                                                day: '2-digit',
                                                                month: '2-digit',
                                                                year: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                            })}
                                                        </span>
                                                    ) : null}
                                                </>
                                            )}
                                            {rentalInquiry.status === 'REJECTED' && 'ამ თარიღებზე პროდუქტი ადგილზე არ არის'}
                                            {rentalInquiry.status === 'EXPIRED' && 'გადახდის ვადა ამოიწურა (30 წუთი) — გაგზავნეთ ახალი მოთხოვნა'}
                                            {rentalInquiry.status === 'BOOKED' && 'უკვე დაჯავშნილია'}
                                            <button
                                                type="button"
                                                onClick={handleDeleteInquiry}
                                                className="block mx-auto mt-2 text-xs text-red-600 underline hover:text-red-700"
                                            >
                                                მოთხოვნის წაშლა
                                            </button>
                                        </div>
                                    )}

                                    {product.status !== 'MAINTENANCE' && product.status !== 'DAMAGED' && (
                                        <div className="space-y-2">
                                            {purchaseMode === "buy" && showBuyOption ? (
                                                <div className="space-y-2">
                                                    <button
                                                        type="button"
                                                        onClick={handleBuyCheckout}
                                                        disabled={Boolean(isAdding || !selectedSize)}
                                                        className="w-full py-4 rounded-xl md:text-[18px] text-[16px] text-white font-bold transition bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {isAdding ? "მუშავდება..." : "გადახდა"}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handleAddToCart}
                                                        disabled={Boolean(isAdding || !selectedSize)}
                                                        className="w-full py-4 rounded-xl md:text-[18px] text-[16px] text-white font-bold transition bg-black hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {isAdding ? "მუშავდება..." : "კალათაში დამატება"}
                                                    </button>
                                                </div>
                                            ) : purchaseMode === "rent" && canRent ? (
                                                <div className="space-y-2">
                                                    {requiresInquiry && !canBookFromInquiry ? (
                                                        <button
                                                            type="button"
                                                            onClick={handleSubmitInquiry}
                                                            disabled={Boolean(
                                                                submittingInquiry ||
                                                                !rentalStartDate ||
                                                                !rentalEndDate ||
                                                                (rentalStartDate && rentalEndDate && !selfServeDatesValid) ||
                                                                rentalInquiry?.status === 'PENDING'
                                                            )}
                                                            className="w-full py-4 rounded-xl md:text-[18px] text-[16px] text-white font-bold transition bg-[#1B3729] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            {submittingInquiry
                                                                ? 'იგზავნება...'
                                                                : rentalInquiry?.status === 'PENDING'
                                                                    ? 'მოთხოვნა გაგზავნილია'
                                                                    : 'მოთხოვნის გაგზავნა ავტორთან'}
                                                        </button>
                                                    ) : null}
                                                    <button
                                                        type="button"
                                                        onClick={handleRental}
                                                        disabled={Boolean(
                                                            isAdding ||
                                                            !rentalStartDate ||
                                                            !rentalEndDate ||
                                                            (rentalStartDate && rentalEndDate && !selfServeDatesValid) ||
                                                            (requiresInquiry && !canBookFromInquiry)
                                                        )}
                                                        className="w-full py-4 rounded-xl md:text-[18px] text-[16px] text-white font-bold transition bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {isAdding ? 'მუშავდება...' : 'გადახდა'}
                                                    </button>
                                                </div>
                                            ) : null}
                                        </div>
                                    )}
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
                                        <span className="font-semibold">ფერი: </span>
                                        {product.color || "—"}
                                    </li>
                                    <li>
                                        <span className="font-semibold">მდებარეობა: </span>
                                        {product.location || "Tbilisi, GE"}
                                    </li>

                                    {product.allowsPickup && product.pickupAddress && (
                                        <li>
                                            <span className="font-semibold">გატანის მისამართი: </span>
                                            {product.pickupAddress}
                                        </li>
                                    )}

                                    <li>
                                        <span className="font-semibold">მინიმალური ქირაობის დღეები: </span>
                                        {minDaysGlobal} დღე
                                    </li>
                                </ul>
                            </div>

                            {/* Benefits */}
                            <div className=" p-6  space-y-3">
                                {[
                                    { icon: Shield, title: "უსაფრთხო გადახდა", desc: "SSL დაცული გადახდები" },
                                  
                                ].map((i, idx) => (
                                    <div key={idx} className="flex items-center">
                                        <i.icon className="w-5 h-5 mr-3 text-black" />
                                        <div>
                                            <div className="md:text-[18px] text-[16px] font-medium text-black">{i.title}</div>
                                            <div className="md:text-[18px] text-[16px] text-black">{i.desc}</div>
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
                                <div className="text-3xl font-bold text-black">{averageRating.toFixed(1)}</div>
                                <StarRating rating={Math.round(averageRating)} readonly size="lg" />
                                <div className="md:text-[18px] text-[16px] text-black mt-1">{totalReviews} კომენტარი</div>
                            </div>
                        </div>

                        {/* Review Form */}
                        {session ? (
                            canReview ? (
                                <div className="mb-8 pb-8 border-b">
                                    <h3 className="text-lg font-semibold text-black mb-4">დაწერეთ კომენტარი</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-black md:text-[18px] text-[16px] font-medium text-black mb-2">
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
                                            <label className="block text-black md:text-[18px] text-[16px] font-medium text-black mb-2">
                                                კომენტარი
                                            </label>
                                            <textarea
                                                value={reviewComment}
                                                onChange={(e) => setReviewComment(e.target.value)}
                                                placeholder="დაწერეთ თქვენი კომენტარი..."
                                                className="w-full text-black px-4 py-3 border border-black rounded-lg "
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
                                        <p className="text-yellow-800 md:text-[18px] text-[16px]">
                                            კომენტარის დაწერა შეგიძლიათ მხოლოდ იმ პროდუქტებზე, რომლებიც იქირავეთ.
                                        </p>
                                    </div>
                                </div>
                            )
                        ) : (
                            <div className="mb-8 pb-8 border-b">
                                <div className="bg-black border border-gray-200 text-center rounded-lg p-4">
                                    <p className="text-white md:text-[18px] text-[16px]">
                                        კომენტარის დასაწერად გთხოვთ{' '}
                                        <Link href="/auth/signin" className="text-white font-semibold underline">
                                            შეხვიდეთ სისტემაში
                                        </Link>
                                        {' '}და იქირაოთ ან იყიდოთ პროდუქტი
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Reviews List */}
                        {loadingReviews ? (
                            <div className="text-center py-8">
                                <div className="w-8 h-8 border-4 border-black border-t-black rounded-full animate-spin mx-auto"></div>
                                <p className="text-black mt-2">იტვირთება...</p>
                            </div>
                        ) : reviews.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-black md:text-[18px] text-[16px]">ჯერ არ არის კომენტარები</p>
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
                                                    <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center overflow-hidden">
                                                        {review.user.image ? (
                                                            <Image
                                                                width={64}
                                                                height={64}
                                                                src={review.user.image}
                                                                alt={review.user.name || 'User'}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <span className="text-black font-semibold">
                                                                {review.user.name?.[0]?.toUpperCase() || 'U'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-black">
                                                            {review.user.name || 'ანონიმური მომხმარებელი'}
                                                        </div>
                                                        <div className=" text-black  text-[16px]">
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
                                                                    className="p-1 text-black hover:text-[#1B3729] transition-colors"
                                                                    title="რედაქტირება"
                                                                >
                                                                    <Edit className="w-5 h-5" />
                                                                </button>
                                                            )}
                                                            {(isOwnReview || isAdmin) && (
                                                                <button
                                                                    onClick={() => handleDeleteReview(review.id)}
                                                                    disabled={deletingReviewId === review.id}
                                                                    className="p-1 text-black hover:text-red-600 transition-colors disabled:opacity-50"
                                                                    title="წაშლა"
                                                                >
                                                                    <Trash2 className="w-5 h-5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {isEditing ? (
                                                <div className="mt-4 space-y-4 p-4 bg-black rounded-lg border">
                                                    <div>
                                                        <label className="block text-black md:text-[18px] text-[16px] font-medium text-black mb-2">
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
                                                        <label className="block text-black md:text-[18px] text-[16px] font-medium text-black mb-2">
                                                            კომენტარი
                                                        </label>
                                                        <textarea
                                                            value={editingComment}
                                                            onChange={(e) => setEditingComment(e.target.value)}
                                                            placeholder="დაწერეთ თქვენი კომენტარი..."
                                                            className="w-full px-4 placeholder:text-gray-500 text-black md:text-[18px] text-[16px] py-3 border border-black rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
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
                                                            className="px-4 py-2 bg-black text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            გაუქმება
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    {review.comment && (
                                                        <p className="text-black md:text-[18px] text-[16px] mt-3">{review.comment}</p>
                                                    )}

                                                    {/* Admin Reply Section */}
                                                    {isAdmin && !isReplying && (
                                                        <div className="mt-4">
                                                            {review.reply ? (
                                                                <div className="ml-6 pl-4 border-l-2 border-[#1B3729] bg-black rounded-lg p-4">
                                                                    <div className="flex items-start justify-between mb-2">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-[16px] font-semibold text-[#1B3729] bg-[#1B3729]/10 px-2 py-1 rounded">
                                                                                ადმინისტრატორი
                                                                            </span>
                                                                            <span className="text-black md:text-[18px] text-[16px]">
                                                                                {new Date(review.reply.createdAt).toLocaleDateString('ka-GE')}
                                                                            </span>
                                                                        </div>
                                                                        <button
                                                                            onClick={() => handleDeleteReply(review.id)}
                                                                            disabled={deletingReplyId === review.id}
                                                                            className="p-1 text-black hover:text-red-600 transition-colors disabled:opacity-50"
                                                                            title="პასუხის წაშლა"
                                                                        >
                                                                            <Trash2 className="w-3 h-3" />
                                                                        </button>
                                                                    </div>
                                                                    <p className="text-black md:text-[18px] text-[16px]">{review.reply.comment}</p>
                                                                    <button
                                                                        onClick={() => handleReplyToReview(review.id, { comment: review.reply!.comment })}
                                                                        className="mt-2 text-black md:text-[18px] text-[16px] text-[#1B3729] hover:underline"
                                                                    >
                                                                        რედაქტირება
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleReplyToReview(review.id)}
                                                                    className="mt-2 text-black md:text-[18px] text-[16px] text-[#1B3729] hover:underline font-medium"
                                                                >
                                                                    პასუხის გაცემა
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Reply Form */}
                                                    {isReplying && (
                                                        <div className="mt-4 ml-6 pl-4 border-l-2 border-[#1B3729] bg-black rounded-lg p-4">
                                                            <div className="mb-2">
                                                                <label className="block text-black md:text-[18px] text-[16px] font-medium text-black mb-2">
                                                                    პასუხი
                                                                </label>
                                                                <textarea
                                                                    value={replyComment}
                                                                    onChange={(e) => setReplyComment(e.target.value)}
                                                                    placeholder="დაწერეთ პასუხი..."
                                                                    className="w-full text-black px-4 text-black py-3 border border-black rounded-lg focus:ring-2 focus:ring-[#1B3729] focus:border-transparent"
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
                                                                    className="px-4 py-2 bg-black text-white md:text-[18px] text-[16px] rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

            {/* Chat Widget - Visible to buyer and product author */}
            {isChatOpen && chatRoomId && session?.user?.id && (
                (session.user.id === product?.user?.id) ||
                (chatRoomInfo && chatRoomInfo.userId === session.user.id && chatRoomInfo.adminId === product?.user?.id)
            ) && (
                    <div className="fixed bottom-4 right-4 w-96 h-[600px] bg-white rounded-lg shadow-2xl border border-gray-200 z-50 flex flex-col">
                        {/* Chat Header */}
                        <div className="bg-[#1B3729] text-white p-4 rounded-t-lg flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                {session?.user?.id === product?.user?.id ? (
                                    // Author view - show buyer
                                    buyerInfo?.image ? (
                                        <Image
                                            width={40}
                                            height={40}
                                            src={buyerInfo.image}
                                            alt={buyerInfo.name || "მომხმარებელი"}
                                            className="rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-white text-[#1B3729] flex items-center justify-center font-semibold">
                                            {buyerInfo?.name ? buyerInfo.name.charAt(0).toUpperCase() : "?"}
                                        </div>
                                    )
                                ) : (
                                    // Buyer view - show author
                                    product?.user?.image ? (
                                        <Image
                                            width={40}
                                            height={40}
                                            src={product.user.image}
                                            alt={product.user.name || "ავტორი"}
                                            className="rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-white text-[#1B3729] flex items-center justify-center font-semibold">
                                            {product?.user?.name ? product.user.name.charAt(0).toUpperCase() : "?"}
                                        </div>
                                    )
                                )}
                                <div>
                                    <h3 className="font-semibold md:text-[16px] text-[14px]">
                                        {session?.user?.id === product?.user?.id
                                            ? (buyerInfo?.name || buyerInfo?.email || "მომხმარებელი")
                                            : (product?.user?.name || "ავტორი")
                                        }
                                    </h3>
                                    <p className="text-xs text-gray-200">
                                        {session?.user?.id === product?.user?.id
                                            ? "პროდუქტის მყიდველი"
                                            : "პროდუქტის ავტორი"
                                        }
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsChatOpen(false)}
                                className="text-white hover:text-gray-200 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                            {loadingChatMessages && chatMessages.length === 0 ? (
                                <div className="text-center py-8">
                                    <div className="w-8 h-8 border-4 border-gray-300 border-t-[#1B3729] rounded-full animate-spin mx-auto mb-2"></div>
                                    <p className="text-black md:text-[14px] text-[12px]">იტვირთება...</p>
                                </div>
                            ) : chatMessages.length === 0 ? (
                                <div className="text-center py-8">
                                    <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                                    <p className="text-black md:text-[14px] text-[12px]">დაიწყეთ საუბარი!</p>
                                </div>
                            ) : (
                                chatMessages.map((message) => {
                                    // Determine message position and style
                                    const isCurrentUserAuthor = session?.user?.id === product?.user?.id

                                    // Check if message is from author (seller)
                                    const isFromAuthor = message.isFromAdmin

                                    // Check if message is from current user (buyer)
                                    const isFromBuyer = !message.isFromAdmin && message.userId === session?.user?.id

                                    // Determine position: author messages on right, buyer messages on left
                                    const isOnRight = isFromAuthor
                                    const isOnLeft = isFromBuyer

                                    return (
                                        <div
                                            key={message.id}
                                            className={`flex ${isOnRight ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div
                                                className={`max-w-[75%] rounded-lg px-4 py-2 ${isFromAuthor
                                                        ? 'bg-[#1B3729] text-white'
                                                        : 'bg-white text-black border border-gray-200'
                                                    }`}
                                            >
                                                <p className="md:text-[14px] text-[12px] break-words">{message.content}</p>
                                                <p className={`text-xs mt-1 ${isFromAuthor ? 'text-gray-300' : 'text-gray-500'
                                                    }`}>
                                                    {new Date(message.createdAt).toLocaleTimeString('ka-GE', {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                            <ChatTypingIndicator show={otherPartyTyping} align="start" />
                        </div>

                        {/* Message Input */}
                        <div className="p-4 border-t border-gray-200 bg-white rounded-b-lg">
                            <div className="flex space-x-2">
                                <input
                                    type="text"
                                    value={newChatMessage}
                                    onChange={(e) => {
                                        setNewChatMessage(e.target.value)
                                        notifyTyping(e.target.value)
                                    }}
                                    onBlur={stopTyping}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault()
                                            sendChatMessage()
                                        }
                                    }}
                                    placeholder="დაწერეთ შეტყობინება..."
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B3729] md:text-[14px] text-[12px]"
                                />
                                <button
                                    onClick={sendChatMessage}
                                    disabled={!newChatMessage.trim() || sendingChatMessage}
                                    className="px-4 py-2 bg-[#1B3729] text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity md:text-[14px] text-[12px] font-medium"
                                >
                                    {sendingChatMessage ? '...' : 'გაგზავნა'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
        </div>
    )
}

export default ProductPage
