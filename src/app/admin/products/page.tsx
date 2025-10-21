'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Plus, Edit, Trash2, Eye, Search, Filter, Package, Calendar, Clock } from 'lucide-react'

interface RentalPeriod {
  startDate: string
  endDate: string
  status: string
}

interface Product {
  id: number
  name: string
  slug: string
  description?: string
  gender: string
  isNew: boolean
  hasSale: boolean
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
}

const AdminProductsPage = () => {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterGender, setFilterGender] = useState('ALL')
  const [filterCategory, setFilterCategory] = useState('ALL')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      fetchProducts()
    }
  }, [session])

  const fetchProducts = async () => {
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
  }

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
        alert('შეცდომა პროდუქტის წაშლისას')
      }
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('შეცდომა პროდუქტის წაშლისას')
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

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">You don&apos;t have permission to access this page.</p>
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
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">პროდუქტების მართვა</h1>
              <p className="text-gray-600 mt-1">მართე ყველა პროდუქტი</p>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/admin"
                className="px-4 py-2 bg-[#1B3729] text-white rounded-lg font-bold uppercase tracking-wide  transition-colors"
              >
                ადმინ პანელი
              </Link>
              <Link
                href="/admin/products/new"
                className="flex items-center space-x-2 px-4 py-2 bg-[#1B3729] text-white rounded-lg font-bold uppercase tracking-wide  transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>ახალი პროდუქტი</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Filters */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="პროდუქტის ძებნა..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>

            {/* Gender Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={filterGender}
                onChange={(e) => setFilterGender(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent appearance-none"
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
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent appearance-none"
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
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              პროდუქტები ({filteredProducts.length})
            </h2>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">
                {searchTerm || filterGender !== 'ALL' || filterCategory !== 'ALL'
                  ? 'ფილტრის შედეგები ვერ მოიძებნა'
                  : 'ჯერ არ არის პროდუქტები'
                }
              </p>
              <Link
                href="/admin/products/new"
                className="inline-block px-6 py-2 bg-[#1B3729] text-white rounded-lg font-bold uppercase tracking-wide  transition-colors"
              >
                პირველი პროდუქტის დამატება
              </Link>
            </div>
           ) : (
             <div className="space-y-4">
               {filteredProducts.map((product) => (
                 <div key={product.id} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                   {/* Product Image */}
                   <div className="w-16 h-20 bg-gray-200 rounded-lg relative flex-shrink-0">
                     {product.images.length > 0 ? (
                       <Image
                         src={product.images[0].url}
                         alt={product.images[0].alt || product.name}
                         fill
                         className="object-cover rounded-lg"
                       />
                     ) : (
                       <div className="w-full h-full flex items-center justify-center">
                         <Package className="w-6 h-6 text-gray-400" />
                       </div>
                     )}
                   </div>

                   {/* Product Info */}
                   <div className="flex-1 min-w-0">
                     <div className="flex items-start justify-between">
                       <div className="flex-1">
                         <h3 className="font-semibold text-gray-900 mb-1 truncate">
                           {product.name}
                         </h3>
                         
                         <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                           <span>₾{product.variants?.[0]?.price || 0}</span>
                           <span>{product.gender}</span>
                           {product.category && (
                             <span>{product.category.name}</span>
                           )}
                         </div>
                         
                         <div className="flex items-center space-x-2">
                           {product.isNew && (
                             <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                               ახალი
                             </span>
                           )}
                           {product.hasSale && (
                             <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                               ფასდაკლება
                             </span>
                           )}
                           {hasActiveRentals(product) && (
                             <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full flex items-center">
                               <Clock className="w-3 h-3 mr-1" />
                               გაქირავებული
                             </span>
                           )}
                           {product.user && (
                             <span className="text-xs text-gray-500">
                               {product.user.name}
                             </span>
                           )}
                         </div>
                         
                         {/* Rental Status Details */}
                         {hasActiveRentals(product) && (
                           <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs">
                             <div className="flex items-center text-orange-800 font-medium mb-1">
                               <Calendar className="w-3 h-3 mr-1" />
                               აქტიური გაქირავებები:
                             </div>
                             <div className="space-y-1">
                               {Object.keys(product.rentalStatus || {}).map(size => {
                                 const periods = getRentalPeriods(product, size)
                                 if (periods.length === 0) return null
                                 
                                 return (
                                   <div key={size} className="text-orange-700">
                                     <span className="font-medium">{size}:</span>
                                     {periods.map((period, index) => (
                                       <span key={index} className="ml-2">
                                         {formatDate(period.startDate)}-{formatDate(period.endDate)}
                                         <span className={`ml-1 px-1 py-0.5 rounded text-xs ${
                                           period.status === 'ACTIVE' 
                                             ? 'bg-green-100 text-green-800' 
                                             : 'bg-blue-100 text-blue-800'
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
                       <div className="flex items-center space-x-2 ml-4">
                         <Link
                           href={`/product/${product.slug}`}
                           className="flex items-center space-x-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                         >
                           <Eye className="w-4 h-4" />
                           <span>ნახვა</span>
                         </Link>
                         
                         <Link
                           href={`/admin/products/${product.id}/edit`}
                           className="flex items-center space-x-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                         >
                           <Edit className="w-4 h-4" />
                           <span>რედაქტირება</span>
                         </Link>
                         
                         <button
                           onClick={() => handleDeleteProduct(product.id)}
                           className="flex items-center space-x-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
                         >
                           <Trash2 className="w-4 h-4" />
                           <span>წაშლა</span>
                         </button>
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
