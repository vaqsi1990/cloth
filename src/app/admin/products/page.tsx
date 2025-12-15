'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Plus, Edit, Trash2, Eye, Search, Filter, Package, Calendar, Clock, Barcode } from 'lucide-react'
import { showToast } from '@/utils/toast'

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
    size: string
    stock: number
    price: number
  }>
  rentalStatus?: {[size: string]: RentalPeriod[]}
  status?: 'AVAILABLE' | 'RENTED' | 'RESERVED' | 'MAINTENANCE'
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

const AdminProductsPage = () => {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterGender, setFilterGender] = useState('ALL')
  const [filterCategory, setFilterCategory] = useState('ALL')
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
      const response = await fetch('/api/products')
      const data = await response.json()
      
      if (data.success) {
        // Fetch rental status for each product
        const productsWithRentalStatus = await Promise.all(
          data.products.map(async (product: Product) => {
            try {
              const rentalResponse = await fetch(`/api/products/${product.id}/rental-status`)
              const rentalData = await rentalResponse.json()
              if (rentalData.success) {
                const statusMap: {[size: string]: RentalPeriod[]} = {}
                rentalData.variants.forEach((variant: { size: string; activeRentals?: RentalPeriod[] }) => {
                  statusMap[variant.size] = variant.activeRentals || []
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
    if (status === 'authenticated' && session?.user?.role === 'ADMIN') {
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
      const product = products.find(p => p.id === productId)
      if (!product) return

      // Include existing rental price tiers to preserve them
      const existingTiers = (product.rentalPriceTiers || []).map((tier) => ({
        minDays: tier.minDays,
        pricePerDay: tier.pricePerDay
      }))

      const requestBody = {
        name: product.name,
        slug: product.slug,
        description: product.description || '',
        stock: 0,
        gender: product.gender as 'MEN' | 'WOMEN' | 'CHILDREN' | 'UNISEX',
        color: product.color || '',
        location: product.location || '',
        isNew: product.isNew,
        discount: product.discount,
        rating: product.rating || 0,
        categoryId: product.category?.id,
        isRentable: product.isRentable || false,
        pricePerDay: product.pricePerDay || undefined,
        maxRentalDays: product.maxRentalDays || undefined,
        status: newStatus,
        variants: (product.variants || []).map((v) => ({
          size: v.size,
          stock: v.stock,
          price: v.price
        })),
        imageUrls: product.images.map(img => img.url),
        rentalPriceTiers: existingTiers
      }

      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })
      
      const result = await response.json()
      
      if (response.ok && result.success) {
        setProducts(products.map(p => 
          p.id === productId ? { ...p, status: newStatus as 'AVAILABLE' | 'RENTED' | 'RESERVED' | 'MAINTENANCE' } : p
        ))
      } else {
        showToast(result.message || 'შეცდომა სტატუსის შეცვლისას', 'error')
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ka-GE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusLabel = (status?: string) => {
    const statusMap: { [key: string]: string } = {
      'AVAILABLE': 'თავისუფალია',
      'RENTED': 'გაქირავებულია',
      'RESERVED': 'დაჯავშნილია',
      'MAINTENANCE': 'რესტავრაციაზე'
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

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!session || session.user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-black mb-4">Access Denied</h1>
          <p className="text-black mb-6">You don&apos;t have permission to access this page.</p>
          <Link
            href="/"
            className="px-6 py-2 bg-[#1B3729] text-white rounded-lg font-bold uppercase tracking-wide  transition-colors"
          >
            Go Home
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
            <div>
              <h1 className="text-base sm:text-lg md:text-[20px] font-bold text-black">პროდუქტების მართვა</h1>
              
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:gap-4">
              <Link
                href="/admin/products/sku"
                className="px-3 sm:px-4 py-2 bg-[#1B3729] text-xs sm:text-sm md:text-[20px] text-white rounded-lg font-bold uppercase tracking-wide transition-colors whitespace-nowrap"
              >
               
                <span>ძიება კოდის მიხედვით</span>
              </Link>
              <Link
                href="/admin"
                className="px-3 sm:px-4 py-2 bg-[#1B3729] text-xs sm:text-sm md:text-[20px] text-white rounded-lg font-bold uppercase tracking-wide transition-colors whitespace-nowrap"
              >
                ადმინ პანელი
              </Link>
              <Link
                href="/admin/products/new"
                className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-[#1B3729] text-white rounded-lg text-xs sm:text-sm md:text-[20px] font-bold uppercase tracking-wide transition-colors whitespace-nowrap"
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
                href="/admin/products/new"
                className="inline-block px-4 sm:px-6 py-2 bg-[#1B3729] text-white rounded-lg font-bold uppercase tracking-wide text-xs sm:text-sm transition-colors"
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
                         
                         {/* SKU Code - Always show */}
                         <div className="mb-2">
                           <span className={`text-xs sm:text-sm md:text-[18px] font-mono px-2 py-1 rounded break-all ${
                             product.sku 
                               ? 'text-black ' 
                               : 'text-orange-600 '
                           }`}>
                             კოდი: {product.sku || 'არ არის მინიჭებული'}
                           </span>
                         </div>

                         <div className="mb-2">
                           <span className={`text-xs sm:text-sm md:text-[18px] font-mono px-2 py-1 rounded break-all ${
                             product.user?.name 
                               ? 'text-black ' 
                               : 'text-orange-600 '
                           }`}>
                             ავტორი: {product.user?.name || 'არ არის მინიჭებული'}
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
                             href={`/admin/products/${product.id}/edit`}
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

export default AdminProductsPage
