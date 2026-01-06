'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Plus, Edit, Trash2, Eye, Search, Filter, Package, Calendar, Clock, Barcode, MessageSquare, ChevronDown, ChevronUp, Star, X } from 'lucide-react'
import { showToast } from '@/utils/toast'
import { isSupport } from '@/lib/roles'

interface RentalPeriod {
  startDate: string
  endDate: string
  status: string
}

interface Product {
  id: number
  name: string
  slug: string
  sku?: string
  description?: string
  gender: string
  color?: string
  location?: string
  isNew: boolean
  discount?: number
  rating?: number
  createdAt: string
  updatedAt: string
  category?: {
    id: number
    name: string
  }
  user?: {
    id: string
    name: string
    email: string
  }
  images: Array<{
    id: number
    url: string
    alt?: string
  }>
  variants?: Array<{
    id: number
    price: number
  }>
  rentalStatus?: {[key: string]: RentalPeriod[]}
  status?: 'AVAILABLE' | 'RENTED' | 'RESERVED' | 'MAINTENANCE' | 'DAMAGED'
  isRentable?: boolean
  pricePerDay?: number
  maxRentalDays?: number
  rentalPriceTiers?: Array<{
    id: number
    minDays: number
    pricePerDay: number
  }>
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED'
  rejectionReason?: string | null
}

interface Review {
  id: number
  rating: number
  comment: string | null
  createdAt: string
  userId: string
  user: {
    id: string
    name: string | null
    image: string | null
  }
  reply?: {
    id: number
    comment: string
    createdAt: string
    userId: string
    user: {
      id: string
      name: string | null
      image: string | null
    }
  } | null
}

const SupportProductsPage = () => {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterGender, setFilterGender] = useState('ALL')
  const [filterCategory, setFilterCategory] = useState('ALL')
  const [expandedProductId, setExpandedProductId] = useState<number | null>(null)
  const [productReviews, setProductReviews] = useState<Record<number, Review[]>>({})
  const [loadingReviews, setLoadingReviews] = useState<Record<number, boolean>>({})
  const [replyingToReviewId, setReplyingToReviewId] = useState<number | null>(null)
  const [replyComment, setReplyComment] = useState('')
  const [submittingReply, setSubmittingReply] = useState(false)
  const [deletingReviewId, setDeletingReviewId] = useState<number | null>(null)
  const [deletingReplyId, setDeletingReplyId] = useState<number | null>(null)
  const [approvalUpdatingId, setApprovalUpdatingId] = useState<number | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true)
      // Fetch all products, including unapproved ones, for SUPPORT role
      const response = await fetch('/api/products?includeUnapproved=true')
      const data = await response.json()
      
      if (data.success) {
        // Fetch rental status for each product
        const productsWithRentalStatus = await Promise.all(
          data.products.map(async (product: Product) => {
            try {
              const rentalResponse = await fetch(`/api/products/${product.id}/rental-status`)
              const rentalData = await rentalResponse.json()
              if (rentalData.success) {
                const statusMap: {[key: string]: RentalPeriod[]} = {}
                rentalData.variants.forEach((variant: { variantId: number; activeRentals?: RentalPeriod[] }) => {
                  statusMap[`variant_${variant.variantId}`] = variant.activeRentals || []
                })
                return { ...product, rentalStatus: statusMap }
              }
              return product
            } catch (error) {
              console.error(`Error fetching rental status for product ${product.id}:`, error)
              return product
            }
          })
        )
        setProducts(productsWithRentalStatus)
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'authenticated' && isSupport(session?.user?.role)) {
      fetchProducts()
    }
  }, [status, session?.user?.role, fetchProducts])

  const handleDeleteProduct = async (productId: number) => {
    if (!confirm('ნამდვილად გსურთ პროდუქტის წაშლა?')) {
      return
    }

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setProducts(products.filter(p => p.id !== productId))
        showToast('პროდუქტი წარმატებით წაიშალა', 'success')
      } else {
        showToast('შეცდომა პროდუქტის წაშლისას', 'error')
      }
    } catch (error) {
      console.error('Error deleting product:', error)
      showToast('შეცდომა პროდუქტის წაშლისას', 'error')
    }
  }

  const handleStatusChange = async (productId: number, newStatus: string) => {
    try {
      console.log('Changing status to:', newStatus, 'for product:', productId)
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus })
      })
      
      const result = await response.json()
      console.log('Response status:', response.status, 'Response data:', result)
      
      if (response.ok && result.success) {
        setProducts(products.map(p => 
          p.id === productId ? { ...p, status: newStatus as 'AVAILABLE' | 'RENTED' | 'RESERVED' | 'MAINTENANCE' | 'DAMAGED' } : p
        ))
        showToast('სტატუსი წარმატებით განახლდა', 'success')
      } else {
        console.error('Status change failed:', result)
        showToast(result.message || result.error || 'შეცდომა სტატუსის შეცვლისას', 'error')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      showToast('შეცდომა სტატუსის შეცვლისას', 'error')
    }
  }

  // Helper functions for rental status
  const hasActiveRentals = (product: Product) => {
    return product.rentalStatus && Object.keys(product.rentalStatus).some(size => 
      product.rentalStatus![size] && product.rentalStatus![size].length > 0
    )
  }

  const getRentalPeriods = (product: Product, size: string) => {
    return product.rentalStatus?.[size] || []
  }

  const formatDate = (dateString: string, includeTime: boolean = false) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ka-GE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...(includeTime && { hour: '2-digit', minute: '2-digit' })
    })
  }

  const getStatusLabel = (status?: string) => {
    const statusMap: { [key: string]: string } = {
      'AVAILABLE': 'თავისუფალია',
      'RENTED': 'გაქირავებულია',
      'RESERVED': 'დაჯავშნილია',
      'MAINTENANCE': 'რესტავრაციაზე',
      'DAMAGED': 'დაზიანებულია'
    }
    return statusMap[status || ''] || 'თავისუფალია'
  }

  const getApprovalStatusLabel = (status?: 'PENDING' | 'APPROVED' | 'REJECTED') => {
    const map = {
      PENDING: 'ველოდებით დამტკიცებას',
      APPROVED: 'დამტკიცებულია',
      REJECTED: 'უარყოფილია'
    } as const
    return map[status || 'PENDING']
  }

  const handleApprovalAction = async (
    productId: number,
    status: 'APPROVED' | 'REJECTED'
  ) => {
    let reason: string | undefined

    if (status === 'REJECTED') {
      const rejectionInput = prompt('გთხოვთ მიუთითოთ უარყოფის მიზეზი:')?.trim()
      if (!rejectionInput) {
        showToast('უარყოფის მიზეზი სავალდებულოა', 'warning')
        return
      }
      reason = rejectionInput
    }

    try {
      setApprovalUpdatingId(productId)
      const response = await fetch(`/api/admin/products/${productId}/approval`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status, reason })
      })
      const data = await response.json()

      if (response.ok && data.success) {
        setProducts(prev =>
          prev.map(product =>
            product.id === productId
              ? {
                  ...product,
                  approvalStatus: data.product.approvalStatus,
                  rejectionReason: data.product.rejectionReason
                }
              : product
          )
        )
        showToast(
          status === 'APPROVED'
            ? 'პროდუქტი წარმატებით დამტკიცდა'
            : 'პროდუქტი უარყოფილია',
          'success'
        )
      } else {
        showToast(data.error || 'სტატუსის განახლება ვერ მოხერხდა', 'error')
      }
    } catch (error) {
      console.error('Error updating approval status:', error)
      showToast('სტატუსის განახლება ვერ მოხერხდა', 'error')
    } finally {
      setApprovalUpdatingId(null)
    }
  }

  // Helper to get rental price from tier[0] (first tier with minimum days)
  const getRentalPrice = (product: Product): number => {
    if (!product.isRentable || !product.rentalPriceTiers || product.rentalPriceTiers.length === 0) {
      return 0
    }
    // Sort tiers by minDays to get the first tier (lowest minDays)
    const sortedTiers = [...product.rentalPriceTiers].sort((a, b) => a.minDays - b.minDays)
    const tier0 = sortedTiers[0]
    return tier0.pricePerDay * tier0.minDays
  }

  // Get display price (buy price or rental price if buy price is 0)
  const getDisplayPrice = (product: Product): number => {
    // First check if product has variants with prices
    if (product.variants && product.variants.length > 0) {
      const prices = product.variants.map(v => v.price).filter(p => p > 0)
      // If all prices are 0 or no positive prices, check rental
      if (prices.length === 0) {
        return getRentalPrice(product)
      }
      const minBuyPrice = Math.min(...prices)
      // If min buy price is 0, show rental price instead
      if (minBuyPrice === 0) {
        const rentalPrice = getRentalPrice(product)
        return rentalPrice > 0 ? rentalPrice : 0
      }
      return minBuyPrice
    }
    // If no variants, check if it's rentable
    return getRentalPrice(product)
  }

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesGender = filterGender === 'ALL' || product.gender === filterGender
    const matchesCategory = filterCategory === 'ALL' || product.category?.name === filterCategory
    
    return matchesSearch && matchesGender && matchesCategory
  })

  const getPanelTitle = () => {
    return 'საფორთის პანელი'
  }

  const fetchReviews = async (productId: number) => {
    try {
      setLoadingReviews(prev => ({ ...prev, [productId]: true }))
      const response = await fetch(`/api/products/${productId}/reviews`)
      const data = await response.json()
      if (data.success) {
        setProductReviews(prev => ({ ...prev, [productId]: data.reviews }))
      }
    } catch (error) {
      console.error('Error fetching reviews:', error)
      showToast('შეცდომა კომენტარების მიღებისას', 'error')
    } finally {
      setLoadingReviews(prev => ({ ...prev, [productId]: false }))
    }
  }

  const handleToggleReviews = (productId: number) => {
    if (expandedProductId === productId) {
      setExpandedProductId(null)
    } else {
      setExpandedProductId(productId)
      if (!productReviews[productId]) {
        fetchReviews(productId)
      }
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

  const handleSubmitReply = async (productId: number) => {
    if (!replyingToReviewId || !replyComment.trim()) {
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
        await fetchReviews(productId)
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

  const handleDeleteReply = async (productId: number, reviewId: number) => {
    if (!confirm('ნამდვილად გსურთ პასუხის წაშლა?')) {
      return
    }
    try {
      setDeletingReplyId(reviewId)
      const response = await fetch(`/api/products/${productId}/reviews/reply?reviewId=${reviewId}`, {
        method: 'DELETE',
      })
      const data = await response.json()

      if (data.success) {
        await fetchReviews(productId)
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

  const handleDeleteReview = async (productId: number, reviewId: number) => {
    if (!confirm('ნამდვილად გსურთ კომენტარის წაშლა?')) {
      return
    }
    try {
      setDeletingReviewId(reviewId)
      const response = await fetch(`/api/products/${productId}/reviews?reviewId=${reviewId}`, {
        method: 'DELETE',
      })
      const data = await response.json()

      if (data.success) {
        await fetchReviews(productId)
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


  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!session || !isSupport(session.user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-black mb-4">Access Denied</h1>
          <p className="text-black mb-6">You don&apos;t have permission to access this page.</p>
          <Link
            href="/"
            className="px-6 py-2 bg-black text-white rounded-lg font-bold uppercase tracking-wide  transition-colors"
          >
            მთავარ გვერდზე დაბრუნება
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex items-center space-x-2 text-black hover:text-black transition-colors"
              >
                <ArrowLeft className="w-5 h-5 sm:w-7 sm:h-7 font-bold" />
                <span className="text-sm sm:text-base">{getPanelTitle()}</span>
              </button>
              <div>
                <h1 className="text-base sm:text-lg md:text-[20px] font-bold text-black">პროდუქტების მართვა</h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:gap-4">
              <Link
                href="/support/products/sku"
                className="px-3 sm:px-4 py-2 bg-black text-xs sm:text-sm md:text-[20px] text-white rounded-lg font-bold uppercase tracking-wide transition-colors whitespace-nowrap"
              >
                <span>ძიება კოდის მიხედვით</span>
              </Link>
              <Link
                href="/support"
                className="px-3 sm:px-4 py-2 bg-black text-xs sm:text-sm md:text-[20px] text-white rounded-lg font-bold uppercase tracking-wide transition-colors whitespace-nowrap"
              >
                საფორთის პანელი
              </Link>
              <Link
                href="/support/products/new"
                className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-black text-white rounded-lg text-xs sm:text-sm md:text-[20px] font-bold uppercase tracking-wide transition-colors whitespace-nowrap"
              >
                <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>ახალი პროდუქტი</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Filters */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 mb-6 sm:mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-black" />
              <input
                type="text"
                placeholder="პროდუქტის ძებნა..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 text-black border placeholder:text-gray-500 border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>

            {/* Gender Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-black" />
              <select
                value={filterGender}
                onChange={(e) => setFilterGender(e.target.value)}
                className="w-full pl-10 pr-4 py-3 text-black  border placeholder:text-gray-500 border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent appearance-none"
              >
                <option value="ALL">ყველა გენდერი</option>
                <option value="MEN">კაცი</option>
                <option value="WOMEN">ქალი</option>
                <option value="CHILDREN">ბავშვი</option>
                <option value="UNISEX">უნისექსი</option>
              </select>
            </div>

            {/* Category Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-black" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full pl-10 pr-4 py-3 text-black  border placeholder:text-gray-500 border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent appearance-none"
              >
                <option value="ALL">ყველა კატეგორია</option>
                <option value="dresses">კაბები</option>
                <option value="tops">ტოპები</option>
                <option value="bottoms">ქვედა ნაწილი</option>
                <option value="outerwear">ზედა ტანსაცმელი</option>
                <option value="accessories">აქსესუარები</option>
              </select>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-base sm:text-lg md:text-[20px] font-bold text-black">
              პროდუქტები ({filteredProducts.length})
            </h2>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <Package className="w-10 h-10 sm:w-12 sm:h-12 text-black mx-auto mb-3 sm:mb-4" />
              <p className="text-sm sm:text-base text-black mb-3 sm:mb-4">
                {searchTerm || filterGender !== 'ALL' || filterCategory !== 'ALL'
                  ? 'ფილტრის შედეგები ვერ მოიძებნა'
                  : 'ჯერ არ არის პროდუქტები'
                }
              </p>
              <Link
                href="/support/products/new"
                className="inline-block px-4 sm:px-6 py-2 bg-black text-white rounded-lg font-bold uppercase tracking-wide text-xs sm:text-sm transition-colors"
              >
                პირველი პროდუქტის დამატება
              </Link>
            </div>
           ) : (
             <div className="space-y-3 sm:space-y-4">
               {filteredProducts.map((product) => (
                 <div key={product.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                   {/* Product Image */}
                   <div className="w-full sm:w-16 sm:h-20 h-62 bg-gray-200 rounded-lg relative flex-shrink-0">
                     {product.images.length > 0 ? (
                       <Image
                         src={product.images[0].url}
                         alt={product.images[0].alt || product.name}
                         fill
                         sizes="(max-width: 640px) 100vw, 64px"
                         className="object-cover rounded-lg"
                       />
                     ) : (
                       <div className="w-full h-full flex items-center justify-center">
                         <Package className="w-6 h-6 sm:w-6 sm:h-6 text-black" />
                       </div>
                     )}
                   </div>

                   {/* Product Info */}
                   <div className="flex-1 min-w-0">
                     <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                       <div className="flex-1 min-w-0">
                         <h3 className="font-semibold text-sm sm:text-base md:text-[18px] text-black mb-1 break-words">
                           {product.name}
                         </h3>
                         
                         {/* SKU Code */}
                         {product.sku && (
                           <div className="mb-2">
                             <span className="text-xs sm:text-sm md:text-[18px] font-mono px-2 py-1 rounded break-all text-black">
                               კოდი: {product.sku}
                             </span>
                           </div>
                         )}

                         {/* Author */}
                         <div className="mb-2">
                           <span className={`text-xs sm:text-sm md:text-[18px] font-mono px-2 py-1 rounded break-all ${
                             product.user?.name 
                               ? 'text-black ' 
                               : 'text-orange-600 '
                           }`}>
                             ავტორი: {product.user?.name || product.user?.email || 'არ არის მინიჭებული'}
                           </span>
                         </div>
                       
                        <div className="flex items-center space-x-2 mb-2">
                          <select
                            value={product.status || 'AVAILABLE'}
                            onChange={(e) => handleStatusChange(product.id, e.target.value)}
                            className="text-xs sm:text-sm md:text-[18px] border border-gray-300 rounded px-2 py-1 text-black focus:outline-none focus:ring-1 focus:ring-black w-full sm:w-auto"
                          >
                            <option value="AVAILABLE">თავისუფალია</option>
                            <option value="RENTED">გაქირავებულია</option>
                            <option value="RESERVED">დაჯავშნილია</option>
                            <option value="MAINTENANCE">რესტავრაციაზე</option>
                            <option value="DAMAGED">დაზიანებულია</option>
                          </select>
                         
                        </div>
                         <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm md:text-[16px] text-black mb-2">
                           <span className="whitespace-nowrap">₾{getDisplayPrice(product).toFixed(2)}</span>
                           <span className="whitespace-nowrap">{product.gender}</span>
                           {product.category && (
                             <span className="whitespace-nowrap">{product.category.name}</span>
                           )}
                         </div>
                         
                         <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span
                            className={`px-2 py-1 rounded-full font-bold text-xs sm:text-sm md:text-[18px] whitespace-nowrap ${
                              product.approvalStatus === 'APPROVED'
                                ? 'text-green-500'
                                : product.approvalStatus === 'REJECTED'
                                  ? 'text-red-500'
                                  : 'text-yellow-500'
                            }`}
                          >
                            {getApprovalStatusLabel(product.approvalStatus)}
                          </span>
                          {product.approvalStatus === 'REJECTED' && product.rejectionReason && (
                            <span className="text-xs sm:text-sm md:text-[16px] text-red-700 break-words">
                              მიზეზი: {product.rejectionReason}
                            </span>
                          )}
                          {product.discount && product.discount > 0 && (
                            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs sm:text-sm md:text-[16px] rounded-full whitespace-nowrap">
                              -₾{product.discount.toFixed(2)}
                            </span>
                          )}
                           {hasActiveRentals(product) && (
                             <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs sm:text-sm md:text-[16px] rounded-full flex items-center whitespace-nowrap">
                               <Clock className="w-3 h-3 mr-1" />
                               გაქირავებული
                             </span>
                           )}
                          
                         </div>
                         
                         {/* Rental Status Details */}
                         {hasActiveRentals(product) && (
                           <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs sm:text-sm md:text-[16px]">
                             <div className="flex items-center text-orange-800 font-medium mb-1">
                               <Calendar className="w-3 h-3 mr-1 flex-shrink-0" />
                               <span>აქტიური გაქირავებები:</span>
                             </div>
                             <div className="space-y-1">
                               {Object.keys(product.rentalStatus || {}).map(size => {
                                 const periods = getRentalPeriods(product, size)
                                 if (periods.length === 0) return null
                                 
                                 return (
                                   <div key={size} className="text-orange-700 break-words">
                                     <span className="font-medium">{size}:</span>
                                     {periods.map((period, index) => (
                                       <span key={index} className="ml-2 block sm:inline">
                                         {formatDate(period.startDate)}-{formatDate(period.endDate)}
                                         
                                         <span className={`ml-1 px-1 py-0.5 rounded font-bold text-xs sm:text-sm md:text-[18px] ${
                                           period.status === 'ACTIVE' 
                                             ? 'text-green-500' 
                                             : 'text-blue-500'
                                         }`}>
                                           {period.status === 'ACTIVE' ? 'აქტიური' : 'დაჯავშნული'}
                                         </span>
                                       </span>
                                     ))}
                                   </div>
                                 )
                               })}
                             </div>
                           </div>
                         )}
                       </div>

                       {/* Actions */}
                       <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2 sm:ml-4">
                        <div className="flex flex-row sm:flex-col sm:space-y-2 gap-2 sm:mr-4">
                          {product.approvalStatus !== 'APPROVED' && (
                            <>
                              <button
                                onClick={() => handleApprovalAction(product.id, 'APPROVED')}
                                disabled={approvalUpdatingId === product.id}
                                className="px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-xs sm:text-sm md:text-[18px] disabled:opacity-50 whitespace-nowrap"
                              >
                                {approvalUpdatingId === product.id ? 'დამტკიცება...' : 'დამტკიცება'}
                              </button>
                              <button
                                onClick={() => handleApprovalAction(product.id, 'REJECTED')}
                                disabled={approvalUpdatingId === product.id}
                                className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-xs sm:text-sm md:text-[18px] disabled:opacity-50 whitespace-nowrap"
                              >
                                {approvalUpdatingId === product.id ? 'უარყოფა...' : 'უარყოფა'}
                              </button>
                            </>
                          )}
                        </div>
                         <div className="flex flex-row sm:flex-col gap-2 sm:gap-2">
                           <Link
                             href={`/product/${product.id}`}
                             className="flex items-center justify-center space-x-1 px-3 py-2 bg-gray-100 text-black rounded-lg hover:bg-gray-200 transition-colors text-xs sm:text-sm md:text-[18px] whitespace-nowrap"
                           >
                             <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                             <span className='font-bold'>ნახვა</span>
                           </Link>
                           
                           <Link
                             href={`/support/products/${product.id}/edit`}
                             className="flex items-center justify-center space-x-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-xs sm:text-sm md:text-[18px] whitespace-nowrap"
                           >
                             <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                             <span className='font-bold'>რედაქტირება</span>
                           </Link>
                           
                           <button
                             onClick={() => handleDeleteProduct(product.id)}
                             className="flex items-center justify-center space-x-1 px-3 py-2 rounded-lg transition-colors text-xs sm:text-sm md:text-[18px]"
                           >
                             <Trash2 className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-red-500" />
                           </button>
                         </div>
                       </div>
                     </div>
                     
                     {/* Reviews Section */}
                     <div className="mt-4 pt-4 border-t border-gray-200">
                       <button
                         onClick={() => handleToggleReviews(product.id)}
                         className="flex items-center justify-between w-full text-left"
                       >
                         <div className="flex items-center space-x-2">
                           <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-black" />
                           <span className="text-xs sm:text-sm md:text-[16px] font-semibold text-black">
                             კომენტარები ({productReviews[product.id]?.length || 0})
                           </span>
                         </div>
                         {expandedProductId === product.id ? (
                           <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-black" />
                         ) : (
                           <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-black" />
                         )}
                       </button>

                       {expandedProductId === product.id && (
                         <div className="mt-4 space-y-4">
                           {loadingReviews[product.id] ? (
                             <div className="text-center py-4">
                               <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto"></div>
                             </div>
                           ) : productReviews[product.id] && productReviews[product.id].length > 0 ? (
                             productReviews[product.id].map((review) => (
                               <div key={review.id} className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200">
                                 {/* Review Header */}
                                 <div className="flex items-start justify-between mb-2">
                                   <div className="flex items-center space-x-2 flex-1">
                                     <div className="flex items-center space-x-1">
                                       {[...Array(5)].map((_, i) => (
                                         <Star
                                           key={i}
                                           className={`w-3 h-3 sm:w-4 sm:h-4 ${
                                             i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                                           }`}
                                         />
                                       ))}
                                     </div>
                                     <span className="text-xs sm:text-sm text-gray-600">
                                       {review.user.name || 'უცნობი მომხმარებელი'}
                                     </span>
                                     <span className="text-xs text-gray-400">
                                       {formatDate(review.createdAt, true)}
                                     </span>
                                   </div>
                                   <button
                                     onClick={() => handleDeleteReview(product.id, review.id)}
                                     disabled={deletingReviewId === review.id}
                                     className="text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
                                   >
                                     <Trash2 className="w-4 h-4" />
                                   </button>
                                 </div>

                                 {/* Review Comment */}
                                 {review.comment && (
                                   <p className="text-xs sm:text-sm text-black mb-3">{review.comment}</p>
                                 )}

                                 {/* Reply Section */}
                                 {review.reply ? (
                                   <div className="mt-3 pl-3 sm:pl-4 border-l-2 border-blue-300 bg-blue-50 rounded p-2 sm:p-3">
                                     <div className="flex items-start justify-between mb-2">
                                       <div className="flex items-center space-x-2">
                                         <span className="text-xs sm:text-sm font-semibold text-blue-800">
                                           საფორთი
                                         </span>
                                         <span className="text-xs text-gray-500">
                                           {formatDate(review.reply.createdAt, true)}
                                         </span>
                                       </div>
                                       <button
                                         onClick={() => handleDeleteReply(product.id, review.id)}
                                         disabled={deletingReplyId === review.id}
                                         className="text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
                                       >
                                         <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                       </button>
                                     </div>
                                     <p className="text-xs sm:text-sm text-black">{review.reply.comment}</p>
                                     <button
                                       onClick={() => handleReplyToReview(review.id, review.reply || undefined)}
                                       className="mt-2 text-xs text-blue-600 hover:text-blue-800"
                                     >
                                       რედაქტირება
                                     </button>
                                   </div>
                                 ) : (
                                   <div className="mt-3">
                                     {replyingToReviewId === review.id ? (
                                       <div className="space-y-2">
                                         <textarea
                                           value={replyComment}
                                           onChange={(e) => setReplyComment(e.target.value)}
                                           placeholder="დაწერეთ პასუხი..."
                                           className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                                           rows={3}
                                         />
                                         <div className="flex items-center space-x-2">
                                           <button
                                             onClick={() => handleSubmitReply(product.id)}
                                             disabled={submittingReply || !replyComment.trim()}
                                             className="px-3 py-1 bg-blue-600 text-white text-xs sm:text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                           >
                                             {submittingReply ? 'იგზავნება...' : 'პასუხის გაგზავნა'}
                                           </button>
                                           <button
                                             onClick={handleCancelReply}
                                             className="px-3 py-1 bg-gray-200 text-black text-xs sm:text-sm rounded-lg hover:bg-gray-300"
                                           >
                                             გაუქმება
                                           </button>
                                         </div>
                                       </div>
                                     ) : (
                                       <button
                                         onClick={() => handleReplyToReview(review.id)}
                                         className="text-xs sm:text-sm text-blue-600 hover:text-blue-800"
                                       >
                                         პასუხის გაცემა
                                       </button>
                                     )}
                                   </div>
                                 )}
                               </div>
                             ))
                           ) : (
                             <div className="text-center py-4 text-xs sm:text-sm text-gray-500">
                               კომენტარები არ არის
                             </div>
                           )}
                         </div>
                       )}
                     </div>
                   </div>
                 </div>
               ))}
             </div>
           )}
        </div>
      </div>
    </div>
  )
}

export default SupportProductsPage

