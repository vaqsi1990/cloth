'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  Ticket,
  X,
  Save,
  Check,
  XCircle,
  Send,
  Search,
  Copy,
} from 'lucide-react'
import { showToast } from '@/utils/toast'

interface Voucher {
  id: number
  code: string
  discountAmount: number
  minOrderAmount: number | null
  usageLimit: number | null
  usedCount: number
  perUserLimit: number
  startsAt: string | null
  expiresAt: string | null
  isActive: boolean
  note: string | null
  createdAt: string
}

interface ReceivedVoucher {
  id: number
  voucherId: number
  code: string
  discountAmount: number
  minOrderAmount: number | null
  expiresAt: string | null
  message: string | null
  isUsed: boolean
  isExpired: boolean
  isAvailable: boolean
  receivedAt: string
}

interface SendUser {
  id: string
  name: string | null
  email: string
  role: string
}

type SendUserFilter = 'all' | 'admin' | 'user'

const emptyForm = {
  code: '',
  discountAmount: '',
  minOrderAmount: '',
  usageLimit: '',
  perUserLimit: '1',
  expiresAt: '',
  isActive: true,
  note: '',
}

const AdminVouchersPage = () => {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [loading, setLoading] = useState(true)
  const [showInactive, setShowInactive] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState(emptyForm)
  const [sendVoucher, setSendVoucher] = useState<Voucher | null>(null)
  const [sendUsers, setSendUsers] = useState<SendUser[]>([])
  const [sendUsersLoading, setSendUsersLoading] = useState(false)
  const [sendSearch, setSendSearch] = useState('')
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())
  const [sendMessage, setSendMessage] = useState('')
  const [sendExpiresAt, setSendExpiresAt] = useState('')
  const [sending, setSending] = useState(false)
  const [receivedVouchers, setReceivedVouchers] = useState<ReceivedVoucher[]>([])
  const [loadingReceived, setLoadingReceived] = useState(true)
  const [sendUserFilter, setSendUserFilter] = useState<SendUserFilter>('all')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  const fetchVouchers = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/admin/vouchers?includeInactive=${showInactive}`,
      )
      const data = await response.json()

      if (data.success) {
        setVouchers(data.vouchers)
      } else {
        showToast(data.error || 'შეცდომა ვაუჩერების ჩატვირთვისას', 'error')
      }
    } catch {
      showToast('შეცდომა ვაუჩერების ჩატვირთვისას', 'error')
    } finally {
      setLoading(false)
    }
  }, [showInactive])

  const fetchReceivedVouchers = useCallback(async () => {
    try {
      setLoadingReceived(true)
      const response = await fetch('/api/user/vouchers')
      const data = await response.json()
      if (data.success) {
        setReceivedVouchers(data.vouchers || [])
      }
    } catch {
      showToast('მიღებული ვაუჩერების ჩატვირთვა ვერ მოხერხდა', 'error')
    } finally {
      setLoadingReceived(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role === 'ADMIN') {
      fetchVouchers()
      fetchReceivedVouchers()
    }
  }, [status, session?.user?.role, fetchVouchers, fetchReceivedVouchers])

  const handleCreate = () => {
    setIsCreating(true)
    setEditingId(null)
    setFormData(emptyForm)
  }

  const handleEdit = (voucher: Voucher) => {
    setEditingId(voucher.id)
    setIsCreating(false)
    setFormData({
      code: voucher.code,
      discountAmount: voucher.discountAmount.toString(),
      minOrderAmount: voucher.minOrderAmount?.toString() || '',
      usageLimit: voucher.usageLimit?.toString() || '',
      perUserLimit: voucher.perUserLimit.toString(),
      expiresAt: voucher.expiresAt
        ? new Date(voucher.expiresAt).toISOString().slice(0, 10)
        : '',
      isActive: voucher.isActive,
      note: voucher.note || '',
    })
  }

  const handleCancel = () => {
    setIsCreating(false)
    setEditingId(null)
    setFormData(emptyForm)
  }

  const handleSave = async () => {
    if (!formData.code.trim()) {
      showToast('კოდი აუცილებელია', 'error')
      return
    }

    const discountAmount = parseFloat(formData.discountAmount)
    if (isNaN(discountAmount) || discountAmount <= 0) {
      showToast('ბალანსი უნდა იყოს დადებითი რიცხვი (₾)', 'error')
      return
    }

    if (!formData.expiresAt) {
      showToast('ვაუჩერის ვადა აუცილებელია', 'error')
      return
    }

    const payload = {
      code: formData.code.trim(),
      discountAmount,
      minOrderAmount: formData.minOrderAmount
        ? parseFloat(formData.minOrderAmount)
        : null,
      usageLimit: formData.usageLimit ? parseInt(formData.usageLimit, 10) : null,
      // Balance vouchers are multi-use until amount/expiry; keep DB default.
      perUserLimit: 999,
      expiresAt: formData.expiresAt,
      isActive: formData.isActive,
      note: formData.note.trim() || null,
    }

    try {
      const response = await fetch('/api/admin/vouchers', {
        method: isCreating ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isCreating ? payload : { id: editingId, ...payload },
        ),
      })

      const data = await response.json()

      if (data.success) {
        showToast(
          isCreating ? 'ვაუჩერი შეიქმნა' : 'ვაუჩერი განახლდა',
          'success',
        )
        handleCancel()
        fetchVouchers()
      } else {
        showToast(data.error || 'შეცდომა', 'error')
      }
    } catch {
      showToast('შეცდომა შენახვისას', 'error')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('ნამდვილად გსურთ ვაუჩერის წაშლა?')) return

    try {
      const response = await fetch(`/api/admin/vouchers?id=${id}`, {
        method: 'DELETE',
      })
      const data = await response.json()

      if (data.success) {
        showToast('ვაუჩერი წაიშალა', 'success')
        fetchVouchers()
      } else {
        showToast(data.error || 'შეცდომა', 'error')
      }
    } catch {
      showToast('შეცდომა წაშლისას', 'error')
    }
  }

  const openSendModal = async (
    voucher: Voucher,
    options?: { filter?: SendUserFilter; message?: string },
  ) => {
    setSendVoucher(voucher)
    setSendSearch('')
    setSelectedUserIds(new Set())
    setSendMessage(options?.message || '')
    setSendExpiresAt(
      voucher.expiresAt
        ? new Date(voucher.expiresAt).toISOString().slice(0, 10)
        : '',
    )
    setSendUserFilter(options?.filter || 'all')
    setSendUsersLoading(true)

    try {
      const response = await fetch('/api/admin/users?limit=200')
      const data = await response.json()
      if (data.success) {
        setSendUsers(
          data.users
            .filter((u: SendUser) => u.id !== session?.user?.id)
            .map((u: SendUser) => ({
              id: u.id,
              name: u.name,
              email: u.email,
              role: u.role,
            })),
        )
      }
    } catch {
      showToast('მიმღებების ჩატვირთვა ვერ მოხერხდა', 'error')
    } finally {
      setSendUsersLoading(false)
    }
  }

  const openSendModalFromReceived = (rv: ReceivedVoucher) => {
    openSendModal(
      {
        id: rv.voucherId,
        code: rv.code,
        discountAmount: rv.discountAmount,
        minOrderAmount: rv.minOrderAmount,
        usageLimit: null,
        usedCount: 0,
        perUserLimit: 1,
        startsAt: null,
        expiresAt: rv.expiresAt,
        isActive: true,
        note: null,
        createdAt: rv.receivedAt,
      },
      { filter: 'admin' },
    )
  }

  const copyVoucherCode = (code: string) => {
    navigator.clipboard.writeText(code)
    showToast('კოდი დაკოპირდა', 'success')
  }

  const closeSendModal = () => {
    setSendVoucher(null)
    setSendSearch('')
    setSelectedUserIds(new Set())
    setSendMessage('')
    setSendExpiresAt('')
    setSendUsers([])
    setSendUserFilter('all')
  }

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) {
        next.delete(userId)
      } else {
        next.add(userId)
      }
      return next
    })
  }

  const handleSendVoucher = async () => {
    if (!sendVoucher) return

    if (selectedUserIds.size === 0) {
      showToast('აირჩიეთ მინიმუმ ერთი მომხმარებელი', 'error')
      return
    }

    if (!sendExpiresAt && !sendVoucher.expiresAt) {
      showToast('აირჩიეთ ვაუჩერის ვადა', 'error')
      return
    }

    setSending(true)
    try {
      const response = await fetch('/api/admin/vouchers/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voucherId: sendVoucher.id,
          userIds: Array.from(selectedUserIds),
          message: sendMessage.trim() || null,
          expiresAt: sendExpiresAt || sendVoucher.expiresAt,
        }),
      })
      const data = await response.json()

      if (data.success) {
        showToast(data.message || 'ვაუჩერი გაიგზავნა', 'success')
        closeSendModal()
        fetchReceivedVouchers()
      } else {
        showToast(data.error || 'შეცდომა', 'error')
      }
    } catch {
      showToast('შეცდომა გაგზავნისას', 'error')
    } finally {
      setSending(false)
    }
  }

  const filteredSendUsers = sendUsers.filter((user) => {
    if (sendUserFilter === 'admin' && user.role !== 'ADMIN' && user.role !== 'SUPPORT') {
      return false
    }
    if (sendUserFilter === 'user' && user.role !== 'USER') {
      return false
    }
    if (!sendSearch.trim()) return true
    const q = sendSearch.toLowerCase()
    return (
      (user.name && user.name.toLowerCase().includes(q)) ||
      user.email.toLowerCase().includes(q)
    )
  })

  const roleLabel = (role: string) => {
    if (role === 'ADMIN') return 'ადმინი'
    if (role === 'SUPPORT') return 'საპორტი'
    return 'მომხმარებელი'
  }

  const toggleActive = async (voucher: Voucher) => {
    try {
      const response = await fetch('/api/admin/vouchers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: voucher.id, isActive: !voucher.isActive }),
      })
      const data = await response.json()
      if (data.success) {
        fetchVouchers()
      }
    } catch {
      showToast('შეცდომა', 'error')
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session || session.user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>წვდომა აკრძალულია</p>
      </div>
    )
  }

  const showForm = isCreating || editingId !== null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Link
                href="/admin"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  ვაუჩერების მართვა
                </h1>
                <p className="text-gray-600 text-sm mt-1">
                  შექმენით, გაუგზავნეთ და გადააგზავნეთ ვაუჩერები მომხმარებლებსა და ადმინებზე
                </p>
              </div>
            </div>
            {!showForm && (
              <button
                onClick={handleCreate}
                className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
              >
                <Plus className="w-4 h-4" />
                ახალი ვაუჩერი
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
            <h2 className="text-lg font-bold mb-4">
              {isCreating ? 'ახალი ვაუჩერი' : 'ვაუჩერის რედაქტირება'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  კოდი *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                  placeholder="SUMMER10"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 uppercase"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ბალანსი (₾) *
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={formData.discountAmount}
                  onChange={(e) =>
                    setFormData({ ...formData, discountAmount: e.target.value })
                  }
                  placeholder="50"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  მრავალჯერადი: იხარჯება ნაშთამდე ან ვადის ამოწურვამდე
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  მინ. ჯამი (₾)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.minOrderAmount}
                  onChange={(e) =>
                    setFormData({ ...formData, minOrderAmount: e.target.value })
                  }
                  placeholder="ოფციონალური"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  გლობალური გამოყენების ლიმიტი
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.usageLimit}
                  onChange={(e) =>
                    setFormData({ ...formData, usageLimit: e.target.value })
                  }
                  placeholder="შეუზღუდავი"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  ყველა მომხმარებლის ჯამური redeem-ების მაქს. რაოდენობა
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ვადის გასვლა *
                </label>
                <input
                  type="date"
                  value={formData.expiresAt}
                  onChange={(e) =>
                    setFormData({ ...formData, expiresAt: e.target.value })
                  }
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  მოქმედებს ბალანსის ამოწურვამდე ან ამ თარიღამდე
                </p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  შენიშვნა
                </label>
                <input
                  type="text"
                  value={formData.note}
                  onChange={(e) =>
                    setFormData({ ...formData, note: e.target.value })
                  }
                  placeholder="ოფციონალური"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">
                  აქტიური
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
              >
                <Save className="w-4 h-4" />
                შენახვა
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <X className="w-4 h-4" />
                გაუქმება
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">ჩემი ვაუჩერები</h2>
          <p className="text-sm text-gray-600 mb-4">
            თქვენთან მიღებული ვაუჩერები — შეგიძლიათ გადააგზავნოთ სხვა ადმინზე ან მომხმარებელზე
          </p>

          {loadingReceived ? (
            <div className="text-center py-8 text-gray-500 text-sm">იტვირთება...</div>
          ) : receivedVouchers.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-gray-200 rounded-lg">
              <Ticket className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">ჯერ არ გაქვთ მიღებული ვაუჩერები</p>
            </div>
          ) : (
            <div className="space-y-3">
              {receivedVouchers.map((voucher) => (
                <div
                  key={voucher.id}
                  className={`border rounded-lg p-4 flex items-start justify-between gap-4 flex-wrap ${
                    voucher.isAvailable
                      ? 'border-green-300 bg-green-50'
                      : 'border-gray-200 bg-gray-50 opacity-80'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-lg">{voucher.code}</span>
                      {voucher.isAvailable && (
                        <button
                          onClick={() => copyVoucherCode(voucher.code)}
                          className="p-1.5 hover:bg-green-100 rounded-lg text-green-700"
                          title="კოდის კოპირება"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <p className="text-green-700 font-semibold mt-0.5">
                      -₾{voucher.discountAmount.toFixed(2)}
                    </p>
                    {voucher.message && (
                      <p className="text-sm text-gray-600 mt-1 italic">{voucher.message}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      მიღებული:{' '}
                      {new Date(voucher.receivedAt).toLocaleDateString('ka-GE')}
                      {voucher.expiresAt &&
                        ` · ვადა: ${new Date(voucher.expiresAt).toLocaleDateString('ka-GE')}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        voucher.isAvailable
                          ? 'bg-green-200 text-green-800'
                          : voucher.isUsed
                            ? 'bg-gray-200 text-gray-600'
                            : voucher.isExpired
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {voucher.isAvailable
                        ? 'აქტიური'
                        : voucher.isUsed
                          ? 'გამოყენებული'
                          : voucher.isExpired
                            ? 'ვადაგასული'
                            : 'არააქტიური'}
                    </span>
                    {voucher.isAvailable && (
                      <button
                        onClick={() => openSendModalFromReceived(voucher)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                        title="გადაგზავნა"
                      >
                        <Send className="w-3.5 h-3.5" />
                        გადაგზავნა
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <h2 className="text-lg font-bold text-gray-900 mb-4">ვაუჩერების მართვა</h2>

        <div className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            id="showInactive"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="w-4 h-4"
          />
          <label htmlFor="showInactive" className="text-sm text-gray-600">
            არააქტიურების ჩვენება
          </label>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">იტვირთება...</div>
        ) : vouchers.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border">
            <Ticket className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">ვაუჩერები ჯერ არ არის შექმნილი</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">
                    კოდი
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">
                    ბალანსი
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700 hidden md:table-cell">
                    გამოყენება
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700 hidden md:table-cell">
                    ვადა
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">
                    სტატუსი
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700">
                    მოქმედება
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {vouchers.map((voucher) => (
                  <tr key={voucher.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold">{voucher.code}</span>
                      {voucher.note && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {voucher.note}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-green-700">
                      -₾{voucher.discountAmount.toFixed(2)}
                      {voucher.minOrderAmount && (
                        <p className="text-xs text-gray-500 font-normal">
                          მინ. ₾{voucher.minOrderAmount.toFixed(2)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm hidden md:table-cell">
                      {voucher.usedCount}
                      {voucher.usageLimit !== null
                        ? ` / ${voucher.usageLimit}`
                        : ' / ∞'}
                    </td>
                    <td className="px-4 py-3 text-sm hidden md:table-cell">
                      {voucher.expiresAt
                        ? new Date(voucher.expiresAt).toLocaleDateString('ka-GE')
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(voucher)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          voucher.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {voucher.isActive ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        {voucher.isActive ? 'აქტიური' : 'არააქტიური'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {voucher.isActive && (
                          <button
                            onClick={() => openSendModal(voucher)}
                            className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg"
                            title="გაგზავნა"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(voucher)}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                          title="რედაქტირება"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(voucher.id)}
                          className="p-2 hover:bg-red-50 text-red-600 rounded-lg"
                          title="წაშლა"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {sendVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h2 className="text-lg font-bold">ვაუჩერის გაგზავნა</h2>
                <p className="text-sm text-gray-600 mt-0.5">
                  <span className="font-mono font-bold">{sendVoucher.code}</span>
                  {' — '}
                  <span className="text-green-700 font-semibold">
                    -₾{sendVoucher.discountAmount.toFixed(2)}
                  </span>
                </p>
              </div>
              <button
                onClick={closeSendModal}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ვადა *
                </label>
                <input
                  type="date"
                  value={sendExpiresAt}
                  onChange={(e) => setSendExpiresAt(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  მიმღები იყენებს ბალანსის ამოწურვამდე ან ამ ვადამდე
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  შეტყობინება (ოფციონალური)
                </label>
                <textarea
                  value={sendMessage}
                  onChange={(e) => setSendMessage(e.target.value)}
                  placeholder="შეტყობინება მომხმარებლის დეშბორდზე..."
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  მიმღების არჩევა
                </label>
                <div className="flex gap-2 mb-2">
                  {(
                    [
                      ['all', 'ყველა'],
                      ['admin', 'ადმინები'],
                      ['user', 'მომხმარებლები'],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSendUserFilter(value)}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                        sendUserFilter === value
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={sendSearch}
                    onChange={(e) => setSendSearch(e.target.value)}
                    placeholder="სახელი ან ელ-ფოსტა..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>

                {sendUsersLoading ? (
                  <div className="text-center py-6 text-gray-500 text-sm">
                    იტვირთება...
                  </div>
                ) : filteredSendUsers.length === 0 ? (
                  <div className="text-center py-6 text-gray-500 text-sm">
                    მიმღები ვერ მოიძებნა
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto divide-y">
                    {filteredSendUsers.map((user) => (
                      <label
                        key={user.id}
                        className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedUserIds.has(user.id)}
                          onChange={() => toggleUserSelection(user.id)}
                          className="w-4 h-4 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">
                              {user.name || 'უცნობი'}
                            </p>
                            {user.role !== 'USER' && (
                              <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-semibold uppercase rounded bg-purple-100 text-purple-700">
                                {roleLabel(user.role)}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 truncate">
                            {user.email}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                {selectedUserIds.size > 0 && (
                  <p className="text-[15px] text-black mt-2">
                    არჩეული: {selectedUserIds.size} მიმღები
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3 p-5 border-t">
              <button
                onClick={handleSendVoucher}
                disabled={sending || selectedUserIds.size === 0}
                className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                {sending ? 'იგზავნება...' : 'გაგზავნა'}
              </button>
              <button
                onClick={closeSendModal}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                გაუქმება
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminVouchersPage
