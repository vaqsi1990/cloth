'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Search, Filter, Users, Mail, Calendar, Package, ShoppingCart, Trash2, UserCheck, UserX, Phone, User } from 'lucide-react'
import { showToast } from '@/utils/toast'

interface User {
  personalId: string | null
  phone: string | null
  iban: string | null
  id: string
  name: string | null
  email: string | null
  role: string
  banned?: boolean
  banReason?: string | null
  bannedAt?: string | null
  blocked?: boolean
  verified?: boolean
  createdAt: string
  _count: {
    products: number
    orders: number
  }
  products?: Array<{
    id: number
    name: string
    currentPrice: number
    gender: string
    isNew: boolean
    discount?: number
    createdAt: string
    images: Array<{
      url: string
      alt?: string
    }>
  }>
  verification?: {
    status?: 'PENDING' | 'APPROVED' | 'REJECTED',
    identityStatus?: 'PENDING' | 'APPROVED' | 'REJECTED',
    entrepreneurStatus?: 'PENDING' | 'APPROVED' | 'REJECTED',
    idFrontUrl?: string | null,
    idBackUrl?: string | null,
    entrepreneurCertificateUrl?: string | null,
    comment?: string | null,
    identityComment?: string | null,
    entrepreneurComment?: string | null,
    createdAt?: string,
    updatedAt?: string
  };
}

const SupportUsersPage = () => {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('ALL')
  const [expandedUser, setExpandedUser] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/users')
      const data = await response.json()
      
      if (data.success) {
        setUsers(data.users)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role === 'SUPPORT') {
      fetchUsers()
    }
  }, [status, session?.user?.role, fetchUsers])

  const fetchUserProducts = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/products`)
      const data = await response.json()
      
      if (data.success) {
        setUsers(users.map(user => 
          user.id === userId ? { ...user, products: data.products } : user
        ))
      }
    } catch (error) {
      console.error('Error fetching user products:', error)
    }
  }

  const toggleUserExpansion = (userId: string) => {
    if (expandedUser === userId) {
      setExpandedUser(null)
    } else {
      setExpandedUser(userId)
      const user = users.find(u => u.id === userId)
      if (user && !user.products) {
        fetchUserProducts(userId)
      }
    }
  }

  const handleChangeRole = async (userId: string, newRole: string) => {
    const user = users.find(u => u.id === userId)
    if (!user) return
    
    if (!confirm(`ნამდვილად გსურთ მომხმარებლის როლის შეცვლა ${user.role === 'ADMIN' ? 'ადმინისტრატორიდან' : user.role === 'SUPPORT' ? 'საფორთიდან' : 'მომხმარებლიდან'} ${newRole === 'ADMIN' ? 'ადმინისტრატორად' : newRole === 'SUPPORT' ? 'საფორთად' : 'მომხმარებლად'}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setUsers(users.map(u => 
          u.id === userId ? { ...u, role: newRole } : u
        ))
        showToast('როლი წარმატებით შეიცვალა', 'success')
      } else {
        showToast(data.error || 'შეცდომა როლის შეცვლისას', 'error')
      }
    } catch (error) {
      console.error('Error updating role:', error)
      showToast('შეცდომა როლის შეცვლისას', 'error')
    }
  }

  const filteredUsers = users.filter(user => {
    if (searchTerm === '') {
      const matchesRole = filterRole === 'ALL' || user.role === filterRole
      return matchesRole
    }
    
    const searchLower = searchTerm.toLowerCase()
    const nameMatch = user.name ? user.name.toLowerCase().includes(searchLower) : false
    const emailMatch = user.email ? user.email.toLowerCase().includes(searchLower) : false
    const personalIdMatch = user.personalId ? user.personalId.toLowerCase().includes(searchLower) : false
    const phoneMatch = user.phone ? user.phone.toLowerCase().includes(searchLower) : false
    
    const matchesSearch = nameMatch || emailMatch || personalIdMatch || phoneMatch
    const matchesRole = filterRole === 'ALL' || user.role === filterRole
    
    return matchesSearch && matchesRole
  })

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!session || session.user.role !== 'SUPPORT') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-black mb-4">Access Denied</h1>
          <p className="text-black mb-6">You don&apos;t have permission to access this page.</p>
          <Link
            href="/"
            className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
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
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <button
                type="button"
                onClick={() => router.push('/support')}
                className="flex items-center space-x-2 text-black hover:text-black transition-colors"
              >
                <ArrowLeft className="w-5 h-5 sm:w-7 sm:h-7 font-bold" />
                <span className="text-sm sm:text-base">საფორთის პანელი</span>
              </button>
              <div>
                <h1 className="text-base sm:text-lg md:text-[20px] font-bold text-black">მომხმარებლების მართვა</h1>
               
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Filters */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 mb-6 sm:mb-8 space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-black" />
              <input
                type="text"
                placeholder="მომხმარებლის ძებნა..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 placeholder:text-gray-500 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>

            {/* Role Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-black" />
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="w-full pl-10 pr-4 py-3 placeholder:text-gray-500 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent appearance-none"
              >
                <option value="ALL">ყველა როლი</option>
                <option value="USER">მომხმარებელი</option>
                <option value="ADMIN">ადმინისტრატორი</option>
                <option value="SUPPORT">საფორთი</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users List */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-black">
              მომხმარებლები ({filteredUsers.length})
            </h2>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-black mx-auto mb-4" />
              <p className="md:text-[18px] text-[16px] text-black mb-4">
                {searchTerm || filterRole !== 'ALL'
                  ? 'ფილტრის შედეგები ვერ მოიძებნა'
                  : 'ჯერ არ არის მომხმარებლები'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {filteredUsers.map((user) => (
                <div key={user.id} className="border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                  {/* User Card */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 gap-3 sm:gap-4">
                    {/* User Info */}
                    <div className="flex items-start sm:items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                        <Users className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-semibold text-black text-sm sm:text-base md:text-[18px] break-words">
                            {user.name || (user.personalId ? `წაშლილი მომხმარებელი (${user.personalId})` : 'წაშლილი მომხმარებელი')}
                          </h3>
                          <span className={`px-2 py-1 text-xs sm:text-sm md:text-[16px] font-bold rounded-full whitespace-nowrap ${
                            user.role === 'ADMIN' 
                              ? 'text-red-800' 
                              : user.role === 'SUPPORT'
                              ? 'text-blue-800'
                              : 'text-green-500'
                          }`}>
                            {user.role === 'ADMIN' ? 'ადმინისტრატორი' : user.role === 'SUPPORT' ? 'საფორთი' : 'მომხმარებელი'}
                          </span>
                          {(!user.name || !user.email) && (
                            <span className="px-2 py-1 text-xs rounded-full bg-gray-200 text-black whitespace-nowrap">
                              წაშლილი
                            </span>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm md:text-[16px] text-black">
                          {user.email && user.name && (
                            <div className="flex items-center space-x-1 min-w-0">
                              <Mail className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                              <span className="truncate">{user.email}</span>
                            </div>
                          )}
                          <div className="flex items-center space-x-1 whitespace-nowrap">
                            <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                            <span>{new Date(user.createdAt).toLocaleDateString('ka-GE')}</span>
                          </div>
                          {user.personalId && (
                            <div className="flex items-center space-x-1 whitespace-nowrap">
                              <User className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                              <span>{user.personalId}</span>
                            </div>
                          )}
                          {user.phone && (
                            <div className="flex items-center space-x-1 whitespace-nowrap">
                              <Phone className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                              <span>{user.phone}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm md:text-[16px] text-black mt-1">
                          <div className="flex items-center space-x-1 whitespace-nowrap">
                            <Package className="w-3 h-3 flex-shrink-0" />
                            <span>{user._count.products} პროდუქტი</span>
                          </div>
                          <div className="flex items-center space-x-1 whitespace-nowrap">
                            <ShoppingCart className="w-3 h-3 flex-shrink-0" />
                            <span>{user._count.orders} შეკვეთა</span>
                          </div>
                          <button
                            onClick={() => toggleUserExpansion(user.id)}
                            className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm md:text-[18px] font-medium whitespace-nowrap"
                          >
                            {expandedUser === user.id ? 'დეტალების დამალვა' : 'დეტალების ნახვა'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Actions - Only show for non-deleted users */}
                    {user.name && user.email && (
                      <div className="flex flex-col text-black sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2 flex-shrink-0">
                        {/* Role Change Dropdown */}
                        {session.user.id !== user.id && (
                          <div className="flex items-center gap-2">
                            <select
                              value={user.role}
                              onChange={(e) => handleChangeRole(user.id, e.target.value)}
                              className="px-3 py-2 border border-gray-300 rounded text-xs sm:text-sm md:text-[16px] bg-white focus:ring-2 focus:ring-black focus:border-transparent"
                            >
                              <option value="USER">მომხმარებელი</option>
                              <option value="ADMIN">ადმინისტრატორი</option>
                              <option value="SUPPORT">საფორთი</option>
                            </select>
                          </div>
                        )}
                        {/* Ban status badge */}
                        {user.banned && (
                          <span className="px-2 py-1 bg-red-600 text-white rounded text-xs sm:text-sm md:text-[18px] text-center whitespace-nowrap">დაბლოკილი</span>
                        )}
                        {/* Ban/Unban buttons */}
                        <div className="flex items-center gap-2">
                          {!user.banned ? (
                            <BanUserInline user={user} setUsers={setUsers} />
                          ) : (
                            <button
                              className="px-3 py-2 bg-gray-200 text-black rounded text-xs sm:text-sm md:text-[18px] hover:bg-gray-300 whitespace-nowrap"
                              onClick={async () => {
                                const res = await fetch(`/api/admin/users/${user.id}/ban`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ banned: false })
                                })
                                if (res.ok) {
                                  setUsers(prev => prev.map(u => u.id === user.id ? { ...u, banned: false, banReason: null, bannedAt: null } : u))
                                }
                              }}
                            >გაუქმება</button>
                          )}
                        </div>
                        {user.banned && user.banReason && (
                          <div className="text-red-700 bg-red-50 border border-red-200 rounded p-2 text-xs sm:text-sm md:text-[18px]">მიზეზი: {user.banReason}</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* User Expansion Section */}
                  {expandedUser === user.id && (
                    <div className="px-3 sm:px-4 pb-3 sm:pb-4 border-t border-gray-200">
                      {/* User Products */}
                      {user.products && user.products.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-sm sm:text-base md:text-[18px] font-semibold text-black mb-3">პროდუქტები:</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                            {user.products.map((product) => (
                              <div key={product.id} className="border border-gray-200 rounded-lg p-3">
                                <div className="relative w-full h-32 sm:h-40 mb-2">
                                  {product.images && product.images.length > 0 ? (
                                    <Image
                                      src={product.images[0].url}
                                      alt={product.images[0].alt || product.name}
                                      fill
                                      className="object-cover rounded"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-gray-200 rounded flex items-center justify-center">
                                      <Package className="w-8 h-8 text-gray-400" />
                                    </div>
                                  )}
                                </div>
                                <h5 className="font-semibold text-black text-sm sm:text-base mb-1">{product.name}</h5>
                                <p className="text-xs sm:text-sm text-black">₾{product.currentPrice}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SupportUsersPage

function BanUserInline({ user, setUsers }: { user: User; setUsers: React.Dispatch<React.SetStateAction<User[]>> }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const handleDeleteUser = async (userId: string) => {
    if (!confirm('ნამდვილად გსურთ მომხმარებლის წაშლა? ეს ქმედება შეუქცევადია.')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setUsers(prev => prev.filter(u => u.id !== userId))
      } else {
        showToast('შეცდომა მომხმარებლის წაშლისას', 'error')
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      showToast('შეცდომა მომხმარებლის წაშლისას', 'error')
    }
  }

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
      <button
        className="px-3 py-2 font-bold bg-red-600 rounded-lg text-white text-xs sm:text-sm md:text-[18px] hover:bg-red-700 whitespace-nowrap"
        onClick={() => setOpen(v => !v)}
      >ბანი</button>
      {open && (
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            setLoading(true)
            const res = await fetch(`/api/admin/users/${user.id}/ban`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ banned: true, reason })
            })
            setLoading(false)
            if (res.ok) {
              setUsers(prev => prev.map(u => u.id === user.id ? { ...u, banned: true, banReason: reason, bannedAt: new Date().toISOString() } : u))
              setOpen(false)
              setReason('')
            }
          }}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1"
        >
          <input
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="ბანის მიზეზი"
            className="border px-2 py-1 rounded text-xs sm:text-sm md:text-[18px] flex-1"
            required
            disabled={loading}
          />
          <button
            type="submit"
            className="px-3 py-2 bg-red-700 text-white rounded text-xs sm:text-sm md:text-[18px] whitespace-nowrap"
            disabled={loading || !reason.trim()}
          >დადასტურება</button>
        </form>
      )}
       <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="flex items-center justify-center sm:justify-start space-x-1 px-2 sm:px-3 py-2 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-red-500" />
                            
                          </button>
    </div>
  )
}

