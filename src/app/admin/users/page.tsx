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
    status?: 'PENDING' | 'APPROVED' | 'REJECTED', // Legacy field
    identityStatus?: 'PENDING' | 'APPROVED' | 'REJECTED',
    entrepreneurStatus?: 'PENDING' | 'APPROVED' | 'REJECTED',
    idFrontUrl?: string | null,
    idBackUrl?: string | null,
    entrepreneurCertificateUrl?: string | null,
    comment?: string | null, // Legacy field
    identityComment?: string | null,
    entrepreneurComment?: string | null,
    createdAt?: string,
    updatedAt?: string
  };
}

const AdminUsersPage = () => {
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
    if (status === 'authenticated' && session?.user?.role === 'ADMIN') {
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

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('ნამდვილად გსურთ მომხმარებლის წაშლა? ეს ქმედება შეუქცევადია.')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setUsers(users.filter(u => u.id !== userId))
      } else {
        showToast('შეცდომა მომხმარებლის წაშლისას', 'error')
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      showToast('შეცდომა მომხმარებლის წაშლისას', 'error')
    }
  }

  const handleToggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'USER' ? 'ADMIN' : 'USER'
    
    if (!confirm(`ნამდვილად გსურთ მომხმარებლის როლის შეცვლა ${currentRole}-დან ${newRole}-ზე?`)) {
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
      
      if (response.ok) {
        setUsers(users.map(u => 
          u.id === userId ? { ...u, role: newRole } : u
        ))
      } else {
        showToast('შეცდომა როლის შეცვლისას', 'error')
      }
    } catch (error) {
      console.error('Error updating role:', error)
      showToast('შეცდომა როლის შეცვლისას', 'error')
    }
  }

  const blockedSellers = users.filter(
    user => user.blocked && user._count.products > 0
  )

  const sellersNeedingVerification = blockedSellers.filter(
    user => !user.verified
  )

  const filteredUsers = users.filter(user => {
    if (searchTerm === '') {
      // If no search term, show all users
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

  if (!session || session.user.role !== 'ADMIN') {
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
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/admin"
                className="flex items-center space-x-2 text-black hover:text-black transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>ადმინ პანელი</span>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-black">მომხმარებლების მართვა</h1>
                <p className="text-black mt-1">მართე ყველა მომხმარებელი</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Filters */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-black" />
              <input
                type="text"
                placeholder="მომხმარებლის ძებნა..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>

            {/* Role Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-black" />
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent appearance-none"
              >
                <option value="ALL">ყველა როლი</option>
                <option value="USER">მომხმარებელი</option>
                <option value="ADMIN">ადმინისტრატორი</option>
              </select>
            </div>
          </div>

          {blockedSellers.length > 0 && (
            <div className="border border-red-200 rounded-xl bg-red-50 p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-red-900">
                    დაბლოკილი პროდუქტის ავტორები ({blockedSellers.length})
                  </h3>
                  <p className="text-sm text-red-700">
                    ეს მომხმარებლები დაბლოკილნი არიან შემოსავლის ზღვრის გადაჭარბების გამო. ადმინისტრატორი ხედავს მათ მონაცემებს.
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto rounded-lg border border-red-100 bg-white">
                <table className="min-w-full divide-y divide-red-100">
                  <thead className="bg-red-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-red-800 uppercase tracking-wider">სახელი</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-red-800 uppercase tracking-wider">ელფოსტა</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-red-800 uppercase tracking-wider">პროდუქტები</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-red-800 uppercase tracking-wider">სტატუსი</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100">
                    {blockedSellers.map((seller) => (
                      <tr key={seller.id}>
                        <td className="px-4 py-2 text-sm text-black">{seller.name || 'უცნობი მომხმარებელი'}</td>
                        <td className="px-4 py-2 text-sm text-black">{seller.email || '---'}</td>
                        <td className="px-4 py-2 text-sm text-black">{seller._count.products}</td>
                        <td className="px-4 py-2 text-sm">
                          {seller.verified ? (
                            <span className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-semibold">დამოწმებული</span>
                          ) : (
                            <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-semibold">ველოდებით დოკუმენტებს</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <button
                            onClick={() => toggleUserExpansion(seller.id)}
                            className="text-sm text-red-600 hover:text-red-800 font-semibold"
                          >
                            დეტალები
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {sellersNeedingVerification.length > 0 && (
            <div className="border border-orange-200 rounded-xl bg-orange-50 p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-orange-900">
                    ვერიფიკაცია სჭირდება გამყიდველებს ({sellersNeedingVerification.length})
                  </h3>
                  <p className="text-sm text-orange-700">
                    ამ მომხმარებლების შემოსავალი 2₾-ს აღემატება და საჭიროა დოკუმენტების გადამოწმება.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {sellersNeedingVerification.map(seller => (
                  <button
                    key={seller.id}
                    onClick={() => toggleUserExpansion(seller.id)}
                    className="flex items-center justify-between bg-white border border-orange-200 rounded-lg px-4 py-3 text-left hover:shadow-sm transition-shadow"
                  >
                    <div>
                      <p className="font-semibold text-black">{seller.name || seller.email || 'უცნობი მომხმარებელი'}</p>
                      <p className="text-sm text-gray-600">
                        {seller.email || 'ელფოსტა უცნობია'}
                      </p>
                    </div>
                    <span className="px-3 py-1 text-sm bg-orange-100 text-orange-800 rounded-full">
                      პროდუქტები: {seller._count.products}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Users List */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-black">
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
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <div key={user.id} className="border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                  {/* User Card */}
                  <div className="flex items-center justify-between p-4">
                    {/* User Info */}
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                        <Users className="w-6 h-6 text-black" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-1">
                          <h3 className="font-semibold text-black md:text-[18px] text-[16px]">
                            {user.name || (user.personalId ? `წაშლილი მომხმარებელი (${user.personalId})` : 'წაშლილი მომხმარებელი')}
                          </h3>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            user.role === 'ADMIN' 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {user.role === 'ADMIN' ? 'ადმინისტრატორი' : 'მომხმარებელი'}
                          </span>
                          {(!user.name || !user.email) && (
                            <span className="px-2 py-1 text-xs rounded-full bg-gray-200 text-black">
                              წაშლილი
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-4 text-[16px] text-black">
                          {user.email && user.name && (
                            <div className="flex items-center space-x-1">
                              <Mail className="w-4 h-4" />
                              <span>{user.email}</span>
                            </div>
                          )}
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(user.createdAt).toLocaleDateString('ka-GE')}</span>
                          </div>
                          {user.personalId && (
                            <div className="flex items-center space-x-1">
                              <User className="w-4 h-4" />
                              <span>{user.personalId}</span>
                            </div>
                          )}
                          {user.phone && (
                            <div className="flex items-center space-x-1">
                              <Phone className="w-4 h-4" />
                              <span>{user.phone}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-4 text-[16px] text-black mt-1">
                          <div className="flex items-center space-x-1">
                            <Package className="w-3 h-3" />
                            <span>{user._count.products} პროდუქტი</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <ShoppingCart className="w-3 h-3" />
                            <span>{user._count.orders} შეკვეთა</span>
                          </div>
                          <button
                            onClick={() => toggleUserExpansion(user.id)}
                            className="text-blue-600 hover:text-blue-800 text-[18px] font-medium"
                          >
                            {expandedUser === user.id ? 'დეტალების დამალვა' : 'დეტალების ნახვა'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Actions - Only show for non-deleted users */}
                    {user.name && user.email && (
                      <>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleToggleRole(user.id, user.role)}
                            className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-[18px] transition-colors ${
                              user.role === 'ADMIN'
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            {user.role === 'ADMIN' ? (
                              <>
                                <UserX className="w-4 h-4" />
                                <span>მომხმარებლად</span>
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-4 h-4" />
                                <span>ადმინად</span>
                              </>
                            )}
                          </button>
                          
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="flex items-center space-x-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-[18px]"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>წაშლა</span>
                          </button>
                        </div>

                        {/* Ban status badge */}
                        {user.banned && (
                          <span className="ml-2 px-2 py-1 bg-red-600 text-white rounded text-[18px]">დაბლოკილი</span>
                        )}
                        {/* Blocked status badge (for revenue threshold) */}
                        {user.blocked && !user.verified && user._count.products > 0 && (
                          <span className="ml-2 px-2 py-1 bg-orange-600 text-white rounded text-[18px]">ვერიფიკაცია საჭიროა</span>
                        )}
                        {/* Ban/Unban buttons */}
                        <div className="flex items-center gap-2 mt-2">
                          {!user.banned ? (
                            <BanUserInline user={user} setUsers={setUsers} />
                          ) : (
                            <button
                              className="px-3 py-2 bg-gray-200 text-black rounded text-[18px] hover:bg-gray-300"
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
                          <div className="mt-2 text-red-700 bg-red-50 border border-red-200 rounded p-2 text-[18px]">მიზეზი: {user.banReason}</div>
                        )}
                      </>
                    )}
                  </div>

                  {/* პირადობის დოკუმენტების გადამოწმების სექცია - დამოუკიდებელი */}
                  {user.verification && (user.verification.idFrontUrl || user.verification.idBackUrl) && 
                   (user.verification.identityStatus === 'PENDING' || user.verification.identityStatus === 'REJECTED' || 
                    (!user.verification.identityStatus && (user.verification.status === 'PENDING' || user.verification.status === 'REJECTED'))) && (
                    <div className="px-4 pb-4 border-t border-gray-50">
                      <div className="mb-4 pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="text-[18px] font-bold text-blue-800">
                              პირადობის დოკუმენტების გადამოწმება
                            </h4>
                            <p className="text-sm text-blue-700">
                              გთხოვთ გადაამოწმოთ მომხმარებლის პირადობის დოკუმენტები
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          {user.verification.idFrontUrl && (
                            <div className="flex flex-col items-center">
                              <span className="text-[16px] font-semibold mb-2 text-black">დოკუმენტის წინა მხარე</span>
                              <div className="w-full max-w-[500px] h-[400px] relative border-2 border-blue-300 rounded-lg overflow-hidden shadow-lg">
                                <Image
                                  src={user.verification.idFrontUrl}
                                  alt="ID Front"
                                  fill
                                  className="object-contain"
                                />
                              </div>
                            </div>
                          )}
                          {user.verification.idBackUrl && (
                            <div className="flex flex-col items-center">
                              <span className="text-[16px] font-semibold mb-2 text-black">დოკუმენტის უკანა მხარე</span>
                              <div className="w-full max-w-[500px] h-[400px] relative border-2 border-blue-300 rounded-lg overflow-hidden shadow-lg">
                                <Image
                                  src={user.verification.idBackUrl}
                                  alt="ID Back"
                                  fill
                                  className="object-contain"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-3 mb-3">
                          <span className={`px-3 py-1 rounded-full text-[16px] font-semibold text-white ${
                            (user.verification.identityStatus === 'REJECTED' || (!user.verification.identityStatus && user.verification.status === 'REJECTED')) ? 'bg-red-600' : 'bg-yellow-500'
                          }`}>
                            {(user.verification.identityStatus === 'PENDING' || (!user.verification.identityStatus && user.verification.status === 'PENDING')) && 'მიმდინარეობს გადამოწმება'}
                            {(user.verification.identityStatus === 'REJECTED' || (!user.verification.identityStatus && user.verification.status === 'REJECTED')) && 'უარყოფილია'}
                          </span>
                          {user.verification.updatedAt && (
                            <span className="text-[16px] text-black">განახლებულია: {new Date(user.verification.updatedAt).toLocaleDateString('ka-GE')}</span>
                          )}
                        </div>
                        {(user.verification.identityComment || (!user.verification.identityComment && user.verification.comment)) && (
                          <div className="bg-red-50 text-red-800 p-3 rounded mb-3 text-[16px] border border-red-200">
                            <strong>კომენტარი:</strong> {user.verification.identityComment || user.verification.comment}
                          </div>
                        )}
                        {/* ADMIN CONTROLS for identity verification */}
                        {session.user.role === 'ADMIN' && user.verification && 
                         (user.verification.identityStatus === 'PENDING' || user.verification.identityStatus === 'REJECTED' || 
                          (!user.verification.identityStatus && (user.verification.status === 'PENDING' || user.verification.status === 'REJECTED'))) && (
                          <div className="flex flex-col md:flex-row items-stretch gap-3">
                            <button
                              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[18px] font-semibold shadow-md transition-colors"
                              onClick={async () => {
                                const res = await fetch(`/api/admin/users/${user.id}/identity`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ status: 'APPROVED' })
                                });
                                if (res.ok) {
                                  const data = await res.json();
                                  setUsers((users: User[]) => users.map((u: User) => u.id === user.id ? { ...u, verification: data.verification, verified: true } : u));
                                  showToast('პირადობის დოკუმენტები დამტკიცებულია', 'success');
                                }
                              }}
                            >
                              ✓ პირადობის დამტკიცება
                            </button>
                            <RejectVerificationButton user={user} setUsers={setUsers} verificationType="identity" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ინდმეწარმის საბუთის გადამოწმების სექცია - დამოუკიდებელი, მხოლოდ როცა blocked */}
                  {user.blocked && !user.verified && user._count.products > 0 && user.verification?.entrepreneurCertificateUrl && (
                    <div className="px-4 pb-4 border-t border-gray-200 bg-orange-50">
                      <div className="mb-4 pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="text-[18px] font-bold text-orange-800">
                              ინდმეწარმის საბუთის გადამოწმება
                            </h4>
                            <p className="text-sm text-orange-700">
                              გამყიდველი დაბლოკილია, რადგან მისი შემოსავალი 100₾-ს აღემატება
                            </p>
                          </div>
                          <div className="text-right">
                            {user.role === 'ADMIN' ? (
                              <span className="px-3 py-1 bg-blue-600 text-white rounded text-[16px] font-semibold">
                                ადმინი – ბლოკი არ მოქმედებს
                              </span>
                            ) : (
                              <span className="px-3 py-1 bg-orange-600 text-white rounded text-[16px] font-semibold">
                                შემოსავალი ≥ 100₾
                              </span>
                            )}
                          </div>
                        </div>
                        {user.role === 'ADMIN' ? (
                          <p className="text-[16px] text-orange-700 mb-4">
                            ეს არის ადმინისტრატორული ანგარიში – ბლოკი მხოლოდ სიგნალის სახით გვაჩვენებს,
                            რომ გადამოწმდეს გამყიდველის ინდმეწარმის საბუთი.
                          </p>
                        ) : (
                          <p className="text-[16px] text-orange-700 mb-4">
                            გამყიდველი დაბლოკილია, რადგან მისი შემოსავალი 100₾-ს აღემატება. გთხოვთ გადაამოწმოთ ინდმეწარმის საბუთი და დაამტკიცოთ.
                          </p>
                        )}
                        <div className="grid grid-cols-1 gap-4 mb-4">
                          {user.verification.entrepreneurCertificateUrl && (
                            <div className="flex flex-col items-center">
                              <span className="text-[16px] font-semibold mb-2 text-black">ინდმეწარმის საბუთი</span>
                              <div className="w-full max-w-[500px] h-[400px] relative border-2 border-orange-300 rounded-lg overflow-hidden shadow-lg">
                                <Image
                                  src={user.verification.entrepreneurCertificateUrl}
                                  alt="Entrepreneur Certificate"
                                  fill
                                  className="object-contain"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-3 mb-3">
                          <span className={`px-3 py-1 rounded-full text-[16px] font-semibold text-white ${
                            (user.verification.entrepreneurStatus === 'REJECTED' || (!user.verification.entrepreneurStatus && user.verification.status === 'REJECTED')) ? 'bg-red-600' : 'bg-yellow-500'
                          }`}>
                            {(user.verification.entrepreneurStatus === 'PENDING' || (!user.verification.entrepreneurStatus && user.verification.status === 'PENDING')) && 'მიმდინარეობს გადამოწმება'}
                            {(user.verification.entrepreneurStatus === 'REJECTED' || (!user.verification.entrepreneurStatus && user.verification.status === 'REJECTED')) && 'უარყოფილია'}
                          </span>
                          {user.verification.updatedAt && (
                            <span className="text-[16px] text-black">განახლებულია: {new Date(user.verification.updatedAt).toLocaleDateString('ka-GE')}</span>
                          )}
                        </div>
                        {(user.verification.entrepreneurComment || (!user.verification.entrepreneurComment && user.verification.comment)) && (
                          <div className="bg-red-50 text-red-800 p-3 rounded mb-3 text-[16px] border border-red-200">
                            <strong>კომენტარი:</strong> {user.verification.entrepreneurComment || user.verification.comment}
                          </div>
                        )}
                        {/* ADMIN CONTROLS for entrepreneur certificate */}
                        {session.user.role === 'ADMIN' && user.verification && 
                         (user.verification.entrepreneurStatus === 'PENDING' || user.verification.entrepreneurStatus === 'REJECTED' || 
                          (!user.verification.entrepreneurStatus && (user.verification.status === 'PENDING' || user.verification.status === 'REJECTED'))) && (
                          <div className="flex flex-col md:flex-row items-stretch gap-3">
                            <button
                              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[18px] font-semibold shadow-md transition-colors"
                              onClick={async () => {
                                const res = await fetch(`/api/admin/users/${user.id}/entrepreneur`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ status: 'APPROVED' })
                                });
                                if (res.ok) {
                                  const data = await res.json();
                                  setUsers((users: User[]) => users.map((u: User) => u.id === user.id ? { ...u, verification: data.verification, blocked: false } : u));
                                  showToast('ინდმეწარმის საბუთი დამტკიცებულია და მომხმარებელი განბლოკილია', 'success');
                                }
                              }}
                            >
                              ✓ ინდმეწარმის საბუთის დამტკიცება და განბლოკვა
                            </button>
                            <RejectVerificationButton user={user} setUsers={setUsers} verificationType="entrepreneur" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* User Expansion Section */}
                  {expandedUser === user.id && (
                    <div className="px-4 pb-4 border-t border-gray-200">
                      {/* User Verification Section */}
                      {user.verification && !(user.blocked && !user.verified) && (
                        <div className="mb-6">
                          <h4 className="text-[16px] font-semibold text-black mt-4 mb-2">ვერიფიკაცია (პირადობის სურათები)</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                            {user.verification.idFrontUrl && (
                              <div className="flex flex-col items-center">
                                <span className="text-[18px] mb-1">წინა მხარე</span>
                                <div className="w-[400px] h-[400px] relative border rounded overflow-hidden">
                                  <Image
                                    src={user.verification.idFrontUrl}
                                    alt="ID Front"
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                              </div>
                            )}
                            {user.verification.idBackUrl && (
                              <div className="flex flex-col items-center">
                                <span className="text-[18px] mb-1">უკანა მხარე</span>
                                <div className="w-[400px] h-[400px] relative border rounded overflow-hidden">
                                  <Image
                                    src={user.verification.idBackUrl}
                                    alt="ID Back"
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                              </div>
                            )}
                            {user.verification.entrepreneurCertificateUrl && (
                              <div className="flex flex-col items-center">
                                <span className="text-[18px] mb-1">ინდმეწარმის საბუთი</span>
                                <div className="w-[400px] h-[400px] relative border rounded overflow-hidden">
                                  <Image
                                    src={user.verification.entrepreneurCertificateUrl}
                                    alt="Entrepreneur Certificate"
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                          {/* IBAN Display */}
                          {user.iban && (
                            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                              <h5 className="text-[18px] font-semibold text-black mb-2">ბანკის IBAN:</h5>
                              <p className="text-[20px] font-mono text-blue-800">{user.iban}</p>
                            </div>
                          )}
                          <div className="flex items-center space-x-3 mb-2">
                            {/* Identity Status */}
                            {user.verification.idFrontUrl && user.verification.idBackUrl && (
                              <div className="flex items-center space-x-2">
                                <span className="text-[16px] font-semibold text-black">პირადობა:</span>
                                <span className={`px-2 py-1 rounded-full text-[18px] font-semibold text-white ${
                                  (user.verification.identityStatus === 'APPROVED' || (!user.verification.identityStatus && user.verification.status === 'APPROVED')) ? 'bg-green-600' : 
                                  (user.verification.identityStatus === 'REJECTED' || (!user.verification.identityStatus && user.verification.status === 'REJECTED')) ? 'bg-red-600' : 'bg-yellow-500'
                                }`}>
                                  {(user.verification.identityStatus === 'PENDING' || (!user.verification.identityStatus && user.verification.status === 'PENDING')) && 'მიმდინარეობს გადამოწმება'}
                                  {(user.verification.identityStatus === 'APPROVED' || (!user.verification.identityStatus && user.verification.status === 'APPROVED')) && 'დამოწმებულია'}
                                  {(user.verification.identityStatus === 'REJECTED' || (!user.verification.identityStatus && user.verification.status === 'REJECTED')) && 'უარყოფილია'}
                                </span>
                              </div>
                            )}
                            {/* Entrepreneur Status */}
                            {user.verification.entrepreneurCertificateUrl && (
                              <div className="flex items-center space-x-2">
                                <span className="text-[16px] font-semibold text-black">ინდმეწარმი:</span>
                                <span className={`px-2 py-1 rounded-full text-[18px] font-semibold text-white ${
                                  (user.verification.entrepreneurStatus === 'APPROVED' || (!user.verification.entrepreneurStatus && user.verification.status === 'APPROVED')) ? 'bg-green-600' : 
                                  (user.verification.entrepreneurStatus === 'REJECTED' || (!user.verification.entrepreneurStatus && user.verification.status === 'REJECTED')) ? 'bg-red-600' : 'bg-yellow-500'
                                }`}>
                                  {(user.verification.entrepreneurStatus === 'PENDING' || (!user.verification.entrepreneurStatus && user.verification.status === 'PENDING')) && 'მიმდინარეობს გადამოწმება'}
                                  {(user.verification.entrepreneurStatus === 'APPROVED' || (!user.verification.entrepreneurStatus && user.verification.status === 'APPROVED')) && 'დამოწმებულია'}
                                  {(user.verification.entrepreneurStatus === 'REJECTED' || (!user.verification.entrepreneurStatus && user.verification.status === 'REJECTED')) && 'უარყოფილია'}
                                </span>
                              </div>
                            )}
                            {user.verification.updatedAt && (
                              <span className="text-[18px] text-black">{new Date(user.verification.updatedAt).toLocaleDateString('ka-GE')}</span>
                          )}
                        </div>
                        {/* IBAN Display */}
                        {user.iban && (
                          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <h5 className="text-[18px] font-semibold text-black mb-2">ბანკის IBAN:</h5>
                            <p className="text-[20px] font-mono text-blue-800">{user.iban}</p>
                          </div>
                        )}
                        {user.verification.identityComment && (
                            <div className="bg-red-50 text-red-800 p-2 rounded mb-2 text-[18px]">
                              <strong>პირადობის კომენტარი:</strong> {user.verification.identityComment}
                            </div>
                          )}
                          {user.verification.entrepreneurComment && (
                            <div className="bg-red-50 text-red-800 p-2 rounded mb-2 text-[18px]">
                              <strong>ინდმეწარმის კომენტარი:</strong> {user.verification.entrepreneurComment}
                            </div>
                          )}
                          {!user.verification.identityComment && !user.verification.entrepreneurComment && user.verification.comment && (
                            <div className="bg-red-50 text-red-800 p-2 rounded mb-2 text-[18px]">
                              {user.verification.comment}
                            </div>
                          )}
                          {/* ADMIN CONTROLS for verification */}
                          {session.user.role === 'ADMIN' && user.verification && (
                            <div className="flex flex-col md:flex-row items-stretch gap-2 mb-2">
                              {/* Determine verification type: if identity docs exist and not verified, it's identity; otherwise check if blocked */}
                              {user.verification.idFrontUrl && user.verification.idBackUrl && 
                               (user.verification.identityStatus === 'PENDING' || user.verification.identityStatus === 'REJECTED' || 
                                (!user.verification.identityStatus && !user.verified)) && (
                                <>
                                  <button
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-[18px]"
                                    onClick={async () => {
                                      const res = await fetch(`/api/admin/users/${user.id}/identity`, {
                                        method: 'PATCH',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ status: 'APPROVED' })
                                      });
                                      if (res.ok) {
                                        const data = await res.json();
                                        setUsers((users: User[]) => users.map((u: User) => u.id === user.id ? { ...u, verification: data.verification, verified: true } : u));
                                      }
                                    }}
                                    disabled={user.verified}
                                  >პირადობის დამტკიცება</button>
                                  <RejectVerificationButton user={user} setUsers={setUsers} verificationType="identity" />
                                </>
                              )}
                              {user.verification.entrepreneurCertificateUrl && 
                               (user.verification.entrepreneurStatus === 'PENDING' || user.verification.entrepreneurStatus === 'REJECTED' || 
                                (!user.verification.entrepreneurStatus && user.blocked)) && (
                                <>
                                  <button
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-[18px]"
                                    onClick={async () => {
                                      const res = await fetch(`/api/admin/users/${user.id}/entrepreneur`, {
                                        method: 'PATCH',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ status: 'APPROVED' })
                                      });
                                      if (res.ok) {
                                        const data = await res.json();
                                        setUsers((users: User[]) => users.map((u: User) => u.id === user.id ? { ...u, verification: data.verification, blocked: false } : u));
                                      }
                                    }}
                                    disabled={!user.blocked}
                                  >ინდმეწარმის საბუთის დამტკიცება</button>
                                  <RejectVerificationButton user={user} setUsers={setUsers} verificationType="entrepreneur" />
                                </>
                              )}
                            </div>
                          )}
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

export default AdminUsersPage

function RejectVerificationButton({ user, setUsers, verificationType }: { user: User; setUsers: React.Dispatch<React.SetStateAction<User[]>>; verificationType?: 'identity' | 'entrepreneur' }) {
  const [comment, setComment] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [loading, setLoading] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <button
        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-[18px]"
        disabled={user.verification?.status === 'REJECTED'}
        onClick={() => setShowInput(v => !v)}
        >უარყოფა</button>
      {showInput && (
        <form
          onSubmit={async (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            setLoading(true);
            const endpoint = verificationType === 'entrepreneur' 
              ? `/api/admin/users/${user.id}/entrepreneur`
              : `/api/admin/users/${user.id}/identity`;
            const res = await fetch(endpoint, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'REJECTED', comment })
            });
            setLoading(false);
            if (res.ok) {
              const data = await res.json();
              setUsers((users: User[]) => users.map((u: User) => u.id === user.id ? { ...u, verification: data.verification } : u));
              setShowInput(false);
              setComment('');
            }
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={comment}
            disabled={loading}
            onChange={e => setComment(e.target.value)}
            placeholder="მიუთითეთ უარყოფის მიზეზი"
            className="border px-2 py-1 text-[18px] rounded"
            required
          />
          <button
            type="submit"
            className="px-3 py-1 bg-red-700 text-white font-bold rounded text-[18px]"
            disabled={loading || !comment.trim()}
          >დადასტურება</button>
        </form>
      )}
    </div>
  );
}

function BanUserInline({ user, setUsers }: { user: User; setUsers: React.Dispatch<React.SetStateAction<User[]>> }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  return (
    <div className="flex items-center gap-2">
      <button
        className="px-3 py-2 bg-red-600 text-white rounded text-[18px] hover:bg-red-700"
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
          className="flex items-center gap-2"
        >
          <input
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="ბანის მიზეზი"
            className="border px-2 py-1 rounded text-[18px]"
            required
            disabled={loading}
          />
          <button
            type="submit"
            className="px-3 py-2 bg-red-700 text-white rounded text-[18px]"
            disabled={loading || !reason.trim()}
          >დადასტურება</button>
        </form>
      )}
    </div>
  )
}
