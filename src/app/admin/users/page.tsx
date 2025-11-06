'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Search, Filter, Users, Mail, Calendar, Package, ShoppingCart, Trash2, UserCheck, UserX, Phone, User } from 'lucide-react'

interface User {
  personalId: string | null
  phone: string | null
  id: string
  name: string | null
  email: string | null
  role: string
  banned?: boolean
  banReason?: string | null
  bannedAt?: string | null
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
    hasSale: boolean
    createdAt: string
    images: Array<{
      url: string
      alt?: string
    }>
  }>
  verification?: {
    status: 'PENDING' | 'APPROVED' | 'REJECTED',
    idFrontUrl?: string | null,
    idBackUrl?: string | null,
    comment?: string | null,
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
  }, [status, router])

  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      fetchUsers()
    }
  }, [session])

  const fetchUsers = async () => {
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
  }

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
        alert('შეცდომა მომხმარებლის წაშლისას')
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('შეცდომა მომხმარებლის წაშლისას')
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
        alert('შეცდომა როლის შეცვლისას')
      }
    } catch (error) {
      console.error('Error updating role:', error)
      alert('შეცდომა როლის შეცვლისას')
    }
  }

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
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">You don&apos;t have permission to access this page.</p>
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
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>ადმინ პანელი</span>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">მომხმარებლების მართვა</h1>
                <p className="text-gray-600 mt-1">მართე ყველა მომხმარებელი</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Filters */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
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
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
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
        </div>

        {/* Users List */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              მომხმარებლები ({filteredUsers.length})
            </h2>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">
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
                        <Users className="w-6 h-6 text-gray-600" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-1">
                          <h3 className="font-semibold text-gray-900">
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
                            <span className="px-2 py-1 text-xs rounded-full bg-gray-200 text-gray-700">
                              წაშლილი
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
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
                        
                        <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
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
                            {expandedUser === user.id ? 'პროდუქტების დამალვა' : 'პროდუქტების ნახვა'}
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
                        {/* Ban/Unban buttons */}
                        <div className="flex items-center gap-2 mt-2">
                          {!user.banned ? (
                            <BanUserInline user={user} setUsers={setUsers} />
                          ) : (
                            <button
                              className="px-3 py-2 bg-gray-200 text-gray-800 rounded text-[18px] hover:bg-gray-300"
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

                  {/* User Expansion Section */}
                  {expandedUser === user.id && (
                    <div className="px-4 pb-4 border-t border-gray-200">
                      {/* User Verification Section */}
                      {user.verification && (
                        <div className="mb-6">
                          <h4 className="text-sm font-semibold text-gray-900 mt-4 mb-2">ვერიფიკაცია (პირადობის სურათები)</h4>
                          <div className="flex flex-col md:flex-row gap-4 mb-2">
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
                          </div>
                          <div className="flex items-center space-x-3 mb-2">
                            <span className={`px-2 py-1 rounded-full text-[18px] font-semibold text-white bg-${
                              user.verification.status === 'APPROVED' ? 'green-600' : user.verification.status === 'REJECTED' ? 'red-600' : 'yellow-500'
                            }`}>
                              {user.verification.status === 'PENDING' && 'მიმდინარეობს გადამოწმება'}
                              {user.verification.status === 'APPROVED' && 'დამოწმებულია'}
                              {user.verification.status === 'REJECTED' && 'უარყოფილია'}
                            </span>
                            {user.verification.updatedAt && (
                              <span className="text-[18px] text-gray-500">{new Date(user.verification.updatedAt).toLocaleDateString('ka-GE')}</span>
                            )}
                          </div>
                          {user.verification.comment && (
                            <div className="bg-red-50 text-red-800 p-2 rounded mb-2 text-[18px]">
                              {user.verification.comment}
                            </div>
                          )}
                          {/* ADMIN CONTROLS for verification */}
                          {session.user.role === 'ADMIN' && user.verification && ['PENDING', 'REJECTED'].includes(user.verification.status) && (
                            <div className="flex flex-col md:flex-row items-stretch gap-2 mb-2">
                              <button
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-[18px]"
                                onClick={async () => {
                                  const res = await fetch('/api/admin/users', {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ userId: user.id, status: 'APPROVED' })
                                  });
                                  if (res.ok) {
                                    const data = await res.json();
                                    setUsers((users: User[]) => users.map((u: User) => u.id === user.id ? { ...u, verification: data.verification } : u));
                                  }
                                }}
                                disabled={user.verification?.status === 'APPROVED'}
                              >დამტკიცება</button>
                              <RejectVerificationButton user={user} setUsers={setUsers} />
                            </div>
                          )}
                        </div>
                      )}
                      {/* User Products Section */}
                      <h4 className="text-sm font-semibold text-gray-900 mb-3 mt-4">მომხმარებლის პროდუქტები</h4>
                      {user.products ? (
                        user.products.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {user.products.map((product) => (
                              <div key={product.id} className="border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow">
                                <div className="flex items-start space-x-3">
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
                                    <h5 className="font-medium text-gray-900 text-sm mb-1 truncate">
                                      {product.name}
                                    </h5>
                                    
                                    <div className="text-sm text-gray-600 mb-2">
                                      <span className="font-semibold">₾{product.currentPrice}</span>
                                      <span className="ml-2 text-[18px]">{product.gender}</span>
                                    </div>
                                    
                                    <div className="flex items-center space-x-2 mb-2">
                                      {product.isNew && (
                                        <span className="px-2 py-1 bg-green-100 text-green-800 text-[18px] rounded-full">
                                          ახალი
                                        </span>
                                      )}
                                      {product.hasSale && (
                                        <span className="px-2 py-1 bg-red-100 text-red-800 text-[18px] rounded-full">
                                          ფასდაკლება
                                        </span>
                                      )}
                                    </div>
                                    
                                    <p className="text-[18px] text-gray-500">
                                      დამატებული: {new Date(product.createdAt).toLocaleDateString('ka-GE')}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4 text-[18px] text-gray-500">
                            <Package className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                            <p className="text-[18px]">მომხმარებელს არ აქვს პროდუქტები</p>
                          </div>
                        )
                      ) : (
                        <div className="text-center py-4">
                          <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin mx-auto mb-2"></div>
                          <p className="text-[18px] text-gray-500">პროდუქტების ჩატვირთვა...</p>
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

function RejectVerificationButton({ user, setUsers }: { user: User; setUsers: React.Dispatch<React.SetStateAction<User[]>> }) {
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
            const res = await fetch('/api/admin/users', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: user.id, status: 'REJECTED', comment })
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
