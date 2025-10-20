'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Plus, Edit, Trash2, Eye, Search, Filter, Package } from 'lucide-react'

interface Product {
  id: number
  name: string
  slug: string
  description?: string
  currentPrice: number
  originalPrice?: number
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
        setProducts(data.products)
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
                           <span>₾{product.currentPrice}</span>
                           {product.originalPrice && (
                             <span className="line-through">₾{product.originalPrice}</span>
                           )}
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
                           {product.user && (
                             <span className="text-xs text-gray-500">
                               {product.user.name}
                             </span>
                           )}
                         </div>
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
