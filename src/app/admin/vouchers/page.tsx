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

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role === 'ADMIN') {
      fetchVouchers()
    }
  }, [status, session?.user?.role, fetchVouchers])

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
      showToast('ფასდაკლება უნდა იყოს დადებითი რიცხვი (₾)', 'error')
      return
    }

    const payload = {
      code: formData.code.trim(),
      discountAmount,
      minOrderAmount: formData.minOrderAmount
        ? parseFloat(formData.minOrderAmount)
        : null,
      usageLimit: formData.usageLimit ? parseInt(formData.usageLimit, 10) : null,
      perUserLimit: parseInt(formData.perUserLimit, 10) || 1,
      expiresAt: formData.expiresAt || null,
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
                  შექმენით ფასდაკლების კოდები ლარში (₾)
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
                  ფასდაკლება (₾) *
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={formData.discountAmount}
                  onChange={(e) =>
                    setFormData({ ...formData, discountAmount: e.target.value })
                  }
                  placeholder="10"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
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
                  გამოყენების ლიმიტი (სულ)
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
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ერთ მომხმარებელზე
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.perUserLimit}
                  onChange={(e) =>
                    setFormData({ ...formData, perUserLimit: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ვადის გასვლა
                </label>
                <input
                  type="date"
                  value={formData.expiresAt}
                  onChange={(e) =>
                    setFormData({ ...formData, expiresAt: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
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
                    ფასდაკლება
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
    </div>
  )
}

export default AdminVouchersPage
