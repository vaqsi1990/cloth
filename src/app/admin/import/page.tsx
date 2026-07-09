'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from '@/component/AppImage'
import {
  ArrowLeft,
  Search,
  Users,
  Package,
  ArrowRight,
  CheckSquare,
  Square,
  Loader2,
} from 'lucide-react'
import { showToast } from '@/utils/toast'

interface AdminUser {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  role: string
  _count: {
    products: number
    orders: number
  }
}

interface UserProduct {
  id: number
  name: string
  slug: string
  sku?: string | null
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED'
  deletedAt?: string | null
  createdAt: string
  images: Array<{
    url: string
    alt?: string | null
  }>
  category?: {
    name: string
  } | null
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}

function UserPicker({
  label,
  description,
  selectedUser,
  onSelect,
  excludeUserId,
}: {
  label: string
  description: string
  selectedUser: AdminUser | null
  onSelect: (user: AdminUser | null) => void
  excludeUserId?: string | null
}) {
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(false)
  const debouncedSearch = useDebouncedValue(search, 300)

  const fetchUsers = useCallback(async (term: string) => {
    if (!term.trim()) {
      setUsers([])
      return
    }

    try {
      setLoading(true)
      const response = await fetch(
        `/api/admin/users?search=${encodeURIComponent(term.trim())}&limit=20`,
      )
      const data = await response.json()
      if (data.success) {
        setUsers(
          (data.users as AdminUser[]).filter((user) => user.id !== excludeUserId),
        )
      }
    } catch (error) {
      console.error('Error searching users:', error)
    } finally {
      setLoading(false)
    }
  }, [excludeUserId])

  useEffect(() => {
    fetchUsers(debouncedSearch)
  }, [debouncedSearch, fetchUsers])

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-1">
        <Users className="w-5 h-5 text-gray-600" />
        <h2 className="text-lg font-semibold text-gray-900">{label}</h2>
      </div>
      <p className="text-sm text-gray-500 mb-4">{description}</p>

      {selectedUser ? (
        <div className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div>
            <p className="font-medium text-gray-900">
              {selectedUser.name || 'უსახელო'}
            </p>
            <p className="text-sm text-gray-500">
              {selectedUser.email || selectedUser.phone || selectedUser.id}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {selectedUser._count.products} პროდუქტი
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="text-sm text-red-600 hover:text-red-700 font-medium"
          >
            შეცვლა
          </button>
        </div>
      ) : (
        <>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="სახელი, ელფოსტა, ტელეფონი ან ID..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              ძებნა...
            </div>
          )}

          {!loading && debouncedSearch.trim() && users.length === 0 && (
            <p className="text-sm text-gray-500 py-2">მომხმარებელი ვერ მოიძებნა</p>
          )}

          <div className="space-y-2 max-h-56 overflow-y-auto">
            {users.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => {
                  onSelect(user)
                  setSearch('')
                  setUsers([])
                }}
                className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-black hover:bg-gray-50 transition-colors"
              >
                <p className="font-medium text-gray-900">
                  {user.name || 'უსახელო'}
                </p>
                <p className="text-sm text-gray-500">
                  {user.email || user.phone || user.id}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {user._count.products} პროდუქტი
                </p>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

const ImportPage = () => {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [sourceUser, setSourceUser] = useState<AdminUser | null>(null)
  const [targetUser, setTargetUser] = useState<AdminUser | null>(null)
  const [products, setProducts] = useState<UserProduct[]>([])
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [transferring, setTransferring] = useState(false)
  const [productSearch, setProductSearch] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  const fetchSourceProducts = useCallback(async (userId: string) => {
    try {
      setProductsLoading(true)
      const response = await fetch(`/api/admin/users/${userId}/products`)
      const data = await response.json()
      if (data.success) {
        setProducts(data.products)
        setSelectedProductIds([])
      } else {
        showToast(data.error || 'პროდუქტების ჩატვირთვა ვერ მოხერხდა', 'error')
      }
    } catch (error) {
      console.error('Error fetching products:', error)
      showToast('პროდუქტების ჩატვირთვისას მოხდა შეცდომა', 'error')
    } finally {
      setProductsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (sourceUser) {
      fetchSourceProducts(sourceUser.id)
    } else {
      setProducts([])
      setSelectedProductIds([])
      setProductSearch('')
    }
  }, [sourceUser, fetchSourceProducts])

  const filteredProducts = useMemo(() => {
    const term = productSearch.trim().toLowerCase()
    if (!term) return products
    return products.filter((product) => {
      return (
        product.name.toLowerCase().includes(term) ||
        product.slug.toLowerCase().includes(term) ||
        (product.sku?.toLowerCase().includes(term) ?? false)
      )
    })
  }, [products, productSearch])

  const visibleSelectedCount = filteredProducts.filter((product) =>
    selectedProductIds.includes(product.id),
  ).length

  const allVisibleSelected =
    filteredProducts.length > 0 &&
    visibleSelectedCount === filteredProducts.length

  const toggleProduct = (productId: number) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId],
    )
  }

  const toggleAllVisible = () => {
    const visibleIds = filteredProducts.map((product) => product.id)
    if (allVisibleSelected) {
      setSelectedProductIds((prev) =>
        prev.filter((id) => !visibleIds.includes(id)),
      )
    } else {
      setSelectedProductIds((prev) => [...new Set([...prev, ...visibleIds])])
    }
  }

  const handleTransfer = async () => {
    if (!sourceUser || !targetUser) {
      showToast('აირჩიეთ წყარო და სამიზნე მომხმარებელი', 'error')
      return
    }

    if (selectedProductIds.length === 0) {
      showToast('აირჩიეთ მინიმუმ ერთი პროდუქტი', 'error')
      return
    }

    const confirmed = confirm(
      `ნამდვილად გსურთ ${selectedProductIds.length} პროდუქტის გადატანა "${sourceUser.name || 'წყარო'}"-დან "${targetUser.name || 'სამიზნე'}"-ზე?`,
    )
    if (!confirmed) return

    try {
      setTransferring(true)
      const response = await fetch('/api/admin/import/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceUserId: sourceUser.id,
          targetUserId: targetUser.id,
          productIds: selectedProductIds,
        }),
      })
      const data = await response.json()

      if (response.ok && data.success) {
        showToast(data.message || 'პროდუქტები წარმატებით გადაეცა', 'success')
        await fetchSourceProducts(sourceUser.id)
        setSelectedProductIds([])
      } else {
        showToast(data.error || 'გადატანა ვერ მოხერხდა', 'error')
      }
    } catch (error) {
      console.error('Error transferring products:', error)
      showToast('გადატანისას მოხდა შეცდომა', 'error')
    } finally {
      setTransferring(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (session?.user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">წვდომა აკრძალულია</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">პროდუქტების იმპორტი</h1>
              <p className="text-gray-600 mt-1">
                გადაიტანეთ პროდუქტები ერთი მომხმარებლიდან მეორეში და შეცვალეთ ავტორი
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <UserPicker
            label="წყარო მომხმარებელი"
            description="აირჩიეთ მომხმარებელი, რომლის პროდუქტებიც გადაიტანება"
            selectedUser={sourceUser}
            onSelect={setSourceUser}
            excludeUserId={targetUser?.id}
          />
          <UserPicker
            label="ახალი ავტორი"
            description="აირჩიეთ მომხმარებელი, ვისაც გადაეცემა პროდუქტები"
            selectedUser={targetUser}
            onSelect={setTargetUser}
            excludeUserId={sourceUser?.id}
          />
        </div>

        {sourceUser && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-gray-600" />
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    პროდუქტები ({products.length})
                  </h2>
                  <p className="text-sm text-gray-500">
                    მონიშნეთ გადასატანი პროდუქტები
                  </p>
                </div>
              </div>

              <div className="relative w-full md:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="ძებნა პროდუქტებში..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>

            {productsLoading ? (
              <div className="flex items-center justify-center py-12 text-gray-500 gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                პროდუქტების ჩატვირთვა...
              </div>
            ) : products.length === 0 ? (
              <p className="text-center py-12 text-gray-500">
                ამ მომხმარებელს პროდუქტები არ აქვს
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3 mb-4 pb-4 border-b border-gray-100">
                  <button
                    type="button"
                    onClick={toggleAllVisible}
                    className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-black"
                  >
                    {allVisibleSelected ? (
                      <CheckSquare className="w-5 h-5" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                    {allVisibleSelected ? 'ყველას მოხსნა' : 'ყველას მონიშვნა'}
                  </button>
                  <span className="text-sm text-gray-500">
                    არჩეულია {selectedProductIds.length}
                  </span>
                </div>

                <div className="space-y-2 max-h-[32rem] overflow-y-auto">
                  {filteredProducts.map((product) => {
                    const isSelected = selectedProductIds.includes(product.id)
                    const imageUrl = product.images[0]?.url

                    return (
                      <label
                        key={product.id}
                        className={`flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected
                            ? 'border-black bg-gray-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleProduct(product.id)}
                          className="sr-only"
                        />
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-black shrink-0" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400 shrink-0" />
                        )}

                        <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                          {imageUrl ? (
                            <Image
                              src={imageUrl}
                              alt={product.images[0]?.alt || product.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {product.name}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {product.sku || product.slug}
                            {product.category?.name ? ` · ${product.category.name}` : ''}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {product.approvalStatus && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                {product.approvalStatus}
                              </span>
                            )}
                            {product.deletedAt && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                                წაშლილი
                              </span>
                            )}
                          </div>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="text-sm text-gray-600">
              {sourceUser && targetUser ? (
                <span className="inline-flex items-center gap-2 flex-wrap">
                  <span>{sourceUser.name || 'წყარო'}</span>
                  <ArrowRight className="w-4 h-4" />
                  <span>{targetUser.name || 'სამიზნე'}</span>
                  <span className="text-gray-400">·</span>
                  <span>{selectedProductIds.length} პროდუქტი</span>
                </span>
              ) : (
                'აირჩიეთ ორივე მომხმარებელი და მონიშნეთ პროდუქტები'
              )}
            </div>

            <button
              type="button"
              onClick={handleTransfer}
              disabled={
                transferring ||
                !sourceUser ||
                !targetUser ||
                selectedProductIds.length === 0
              }
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {transferring ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  გადატანა...
                </>
              ) : (
                <>
                  <ArrowRight className="w-4 h-4" />
                  პროდუქტების გადატანა
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ImportPage
