'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Search,
  ShieldBan,
  Mail,
  Phone,
  User,
  Calendar,
  Package,
} from 'lucide-react'
import { showToast } from '@/utils/toast'
import { getBlacklistSourceLabel } from '@/lib/user-blacklist-labels'

type BlacklistRecord = {
  id: number
  userId: string
  userName: string | null
  userEmail: string | null
  userPhone: string | null
  personalId: string | null
  reason: string
  adminNotes: string | null
  source: 'MANUAL_BAN' | 'REVENUE_THRESHOLD'
  isActive: boolean
  createdAt: string
  resolvedAt: string | null
  user?: {
    id: string
    name: string | null
    email: string | null
    phone: string | null
    banned: boolean
    blocked: boolean
    verified: boolean
    _count: { products: number; orders: number }
  }
  createdBy?: { id: string; name: string | null; email: string | null } | null
  resolvedBy?: { id: string; name: string | null; email: string | null } | null
}

const AdminBlacklistPage = () => {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [records, setRecords] = useState<BlacklistRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'resolved'>(
    'active',
  )
  const [activeCount, setActiveCount] = useState(0)
  const [editingNotesId, setEditingNotesId] = useState<number | null>(null)
  const [notesDraft, setNotesDraft] = useState('')
  const [savingNotesId, setSavingNotesId] = useState<number | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        status: statusFilter,
        sync: 'true',
      })
      if (searchTerm.trim()) {
        params.set('search', searchTerm.trim())
      }

      const response = await fetch(`/api/admin/blacklist?${params}`)
      const data = await response.json()

      if (data.success) {
        setRecords(data.records)
        setActiveCount(data.activeCount ?? 0)
      }
    } catch (error) {
      console.error('Error fetching blacklist:', error)
      showToast('შავი სიის ჩატვირთვა ვერ მოხერხდა', 'error')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, searchTerm])

  useEffect(() => {
    if (
      status === 'authenticated' &&
      (session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPPORT')
    ) {
      fetchRecords()
    }
  }, [status, session?.user?.role, fetchRecords])

  const saveNotes = async (recordId: number) => {
    setSavingNotesId(recordId)
    try {
      const response = await fetch(`/api/admin/blacklist/${recordId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNotes: notesDraft }),
      })
      const data = await response.json()
      if (response.ok && data.success) {
        setRecords((prev) =>
          prev.map((record) =>
            record.id === recordId
              ? { ...record, adminNotes: data.record.adminNotes }
              : record,
          ),
        )
        setEditingNotesId(null)
        showToast('შენიშვნა შენახულია', 'success')
      } else {
        showToast(data.error || 'შეცდომა', 'error')
      }
    } catch {
      showToast('ქსელის შეცდომა', 'error')
    } finally {
      setSavingNotesId(null)
    }
  }

  const resolveRecord = async (recordId: number) => {
    if (!confirm('ნამდვილად გსურთ მომხმარებლის ბლოკის მოხსნა?')) return

    try {
      const response = await fetch(`/api/admin/blacklist/${recordId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolve: true }),
      })
      const data = await response.json()
      if (response.ok && data.success) {
        await fetchRecords()
        showToast('ბლოკი მოხსნილია', 'success')
      } else {
        showToast(data.error || 'შეცდომა', 'error')
      }
    } catch {
      showToast('ქსელის შეცდომა', 'error')
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session || !['ADMIN', 'SUPPORT'].includes(session.user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-black">წვდომა აკრძალულია</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex items-center space-x-2 text-black hover:text-gray-700"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm sm:text-base">ადმინ პანელი</span>
            </button>
            <div>
              <h1 className="text-base sm:text-lg md:text-[20px] font-bold text-black flex items-center gap-2">
                <ShieldBan className="w-5 h-5" />
                შავი სია
              </h1>
              <p className="text-xs sm:text-sm text-gray-600">
                აქტიური ჩანაწერები: {activeCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="ძებნა სახელით, ელფოსტით, ტელეფონით, პირადი ნომრით..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as 'all' | 'active' | 'resolved')
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black"
            >
              <option value="active">აქტიური</option>
              <option value="resolved">დახურული</option>
              <option value="all">ყველა</option>
            </select>
          </div>
        </div>

        {records.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
            <ShieldBan className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-black">შავ სიაში ჩანაწერები არ არის</p>
          </div>
        ) : (
          <div className="space-y-4">
            {records.map((record) => (
              <div
                key={record.id}
                className={`bg-white rounded-xl border p-4 sm:p-5 ${
                  record.isActive ? 'border-red-200' : 'border-gray-200'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-black text-base sm:text-lg">
                        {record.userName ||
                          record.user?.name ||
                          'უცნობი მომხმარებელი'}
                      </h3>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          record.isActive
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {record.isActive ? 'აქტიური' : 'დახურული'}
                      </span>
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-900 text-white">
                        {getBlacklistSourceLabel(record.source)}
                      </span>
                    </div>

                    <p className="text-sm text-red-800 font-medium">{record.reason}</p>

                    <div className="flex flex-wrap gap-3 text-xs sm:text-sm text-gray-700">
                      {(record.userEmail || record.user?.email) && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5" />
                          {record.userEmail || record.user?.email}
                        </span>
                      )}
                      {(record.userPhone || record.user?.phone) && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" />
                          {record.userPhone || record.user?.phone}
                        </span>
                      )}
                      {record.personalId && (
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          {record.personalId}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(record.createdAt).toLocaleString('ka-GE')}
                      </span>
                      {record.user?._count && (
                        <span className="flex items-center gap-1">
                          <Package className="w-3.5 h-3.5" />
                          {record.user._count.products} პროდუქტი
                        </span>
                      )}
                    </div>

                    {record.createdBy && (
                      <p className="text-xs text-gray-500">
                        დაამატა:{' '}
                        {record.createdBy.name || record.createdBy.email || 'ადმინი'}
                      </p>
                    )}

                    {record.resolvedAt && (
                      <p className="text-xs text-gray-500">
                        დახურულია:{' '}
                        {new Date(record.resolvedAt).toLocaleString('ka-GE')}
                        {record.resolvedBy &&
                          ` — ${record.resolvedBy.name || record.resolvedBy.email}`}
                      </p>
                    )}

                    {editingNotesId === record.id ? (
                      <div className="mt-3 space-y-2">
                        <textarea
                          value={notesDraft}
                          onChange={(e) => setNotesDraft(e.target.value)}
                          rows={3}
                          placeholder="ადმინისტრატორის შენიშვნები..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => saveNotes(record.id)}
                            disabled={savingNotesId === record.id}
                            className="px-3 py-1.5 bg-black text-white rounded text-sm disabled:opacity-50"
                          >
                            {savingNotesId === record.id ? 'ინახება...' : 'შენახვა'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingNotesId(null)}
                            className="px-3 py-1.5 border border-gray-300 rounded text-sm text-black"
                          >
                            გაუქმება
                          </button>
                        </div>
                      </div>
                    ) : (
                      record.adminNotes && (
                        <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm text-black border border-gray-200">
                          <strong>შენიშვნა:</strong> {record.adminNotes}
                        </div>
                      )
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 lg:flex-col lg:items-end">
                    <Link
                      href="/admin/users"
                      className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-black"
                    >
                      მომხმარებლები
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingNotesId(record.id)
                        setNotesDraft(record.adminNotes || '')
                      }}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-black"
                    >
                      შენიშვნა
                    </button>
                    {record.isActive && (
                      <button
                        type="button"
                        onClick={() => resolveRecord(record.id)}
                        className="px-3 py-2 text-sm bg-emerald-700 text-white rounded-lg hover:bg-emerald-800"
                      >
                        ბლოკის მოხსნა
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminBlacklistPage
