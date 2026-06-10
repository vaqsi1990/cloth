'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Check, MessageCircle, Trash2, X } from 'lucide-react'
import { showToast } from '@/utils/toast'

type Inquiry = {
  id: number
  productId: number
  startDate: string
  endDate: string
  size: string | null
  estimatedTotal: number
  status: string
  onSiteAvailable: boolean | null
  buyerMessage: string | null
  sellerNote: string | null
  chatRoomId: number | null
  expiresAt: string
  product: { id: number; name: string; slug: string; location: string | null }
  buyer: { id: string; name: string | null; email: string | null; phone: string | null }
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-emerald-100 text-emerald-800',
  REJECTED: 'bg-red-100 text-red-800',
  EXPIRED: 'bg-gray-100 text-gray-600',
  BOOKED: 'bg-blue-100 text-blue-800',
  CANCELLED: 'bg-gray-100 text-gray-500',
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'მოლოდინში',
  APPROVED: 'დადასტურებული',
  REJECTED: 'უარყოფილი',
  EXPIRED: 'ვადაგასული',
  BOOKED: 'დაჯავშნილი',
  CANCELLED: 'გაუქმებული',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ka-GE')
}

type RentalInquiriesPanelProps = {
  scope: 'buyer' | 'seller' | 'all'
  title: string
}

export default function RentalInquiriesPanel({ scope, title }: RentalInquiriesPanelProps) {
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<number | null>(null)
  const [sellerNotes, setSellerNotes] = useState<Record<number, string>>({})

  const fetchInquiries = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/rental-inquiries?scope=${scope}`)
      const data = await res.json()
      if (data.success) {
        setInquiries(data.inquiries || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [scope])

  useEffect(() => {
    fetchInquiries()
  }, [fetchInquiries])

  const handleSellerAction = async (
    id: number,
    status: 'APPROVED' | 'REJECTED',
    onSiteAvailable: boolean,
  ) => {
    setActingId(id)
    try {
      const res = await fetch(`/api/rental-inquiries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          onSiteAvailable,
          sellerNote: sellerNotes[id] || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        showToast(data.message, 'success')
        fetchInquiries()
      } else {
        showToast(data.message || 'შეცდომა', 'error')
      }
    } catch {
      showToast('შეცდომა', 'error')
    } finally {
      setActingId(null)
    }
  }

  const handleCancel = async (id: number) => {
    setActingId(id)
    try {
      const res = await fetch(`/api/rental-inquiries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      })
      const data = await res.json()
      if (data.success) {
        showToast('მოთხოვნა გაუქმდა', 'success')
        fetchInquiries()
      } else {
        showToast(data.message || 'შეცდომა', 'error')
      }
    } catch {
      showToast('შეცდომა', 'error')
    } finally {
      setActingId(null)
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('ნამდვილად გსურთ მოთხოვნის წაშლა?')) {
      return
    }

    setActingId(id)
    try {
      const res = await fetch(`/api/rental-inquiries/${id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (data.success) {
        showToast('მოთხოვნა წაიშალა', 'success')
        setInquiries((prev) => prev.filter((inq) => inq.id !== id))
      } else {
        showToast(data.message || 'შეცდომა', 'error')
      }
    } catch {
      showToast('შეცდომა', 'error')
    } finally {
      setActingId(null)
    }
  }

  if (loading) {
    return <p className="text-black">იტვირთება...</p>
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-black">{title}</h2>

      {inquiries.length === 0 ? (
        <p className="text-gray-600">მოთხოვნები არ არის.</p>
      ) : (
        <div className="space-y-4">
          {inquiries.map((inq) => (
            <div
              key={inq.id}
              className="bg-white border border-gray-200 rounded-xl p-4 md:p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <Link
                    href={`/product/${inq.productId}`}
                    className="text-lg font-semibold text-black hover:underline"
                  >
                    {inq.product.name}
                  </Link>
                  {scope !== 'buyer' && inq.buyer && (
                    <p className="text-sm text-gray-600 mt-1">
                      {inq.buyer.name || inq.buyer.email}
                      {inq.buyer.phone ? ` · ${inq.buyer.phone}` : ''}
                    </p>
                  )}
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    STATUS_STYLES[inq.status] || 'bg-gray-100'
                  }`}
                >
                  {STATUS_LABELS[inq.status] || inq.status}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-black mb-4">
                <p>
                  <span className="font-medium">თარიღები: </span>
                  {formatDate(inq.startDate)} — {formatDate(inq.endDate)}
                </p>
                {inq.size && (
                  <p>
                    <span className="font-medium">ზომა: </span>
                    {inq.size}
                  </p>
                )}
                {inq.product.location && (
                  <p>
                    <span className="font-medium">ლოკაცია: </span>
                    {inq.product.location}
                  </p>
                )}
                <p>
                  <span className="font-medium">ფასი: </span>₾{inq.estimatedTotal.toFixed(2)}
                </p>
              </div>

              {inq.buyerMessage && (
                <p className="text-sm text-gray-700 mb-3 bg-gray-50 p-3 rounded-lg">
                  {inq.buyerMessage}
                </p>
              )}

              {scope !== 'buyer' && inq.status === 'PENDING' && (
                <div className="space-y-3">
                  <textarea
                    value={sellerNotes[inq.id] || ''}
                    onChange={(e) =>
                      setSellerNotes((prev) => ({ ...prev, [inq.id]: e.target.value }))
                    }
                    placeholder="შენიშვნა მყიდველისთვის (არასავალდებულო)"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black text-sm"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={actingId === inq.id}
                      onClick={() => handleSellerAction(inq.id, 'APPROVED', true)}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      ადგილზე არის — დაადასტურე
                    </button>
                    <button
                      type="button"
                      disabled={actingId === inq.id}
                      onClick={() => handleSellerAction(inq.id, 'REJECTED', false)}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                      არ არის ხელმისაწვდომი
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 mt-2">
                {scope === 'buyer' && inq.status === 'PENDING' && (
                  <button
                    type="button"
                    disabled={actingId === inq.id}
                    onClick={() => handleCancel(inq.id)}
                    className="text-sm text-red-600 underline disabled:opacity-50"
                  >
                    მოთხოვნის გაუქმება
                  </button>
                )}

                <button
                  type="button"
                  disabled={actingId === inq.id}
                  onClick={() => handleDelete(inq.id)}
                  className="inline-flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  წაშლა
                </button>
              </div>

              {scope === 'buyer' && inq.status === 'APPROVED' && (
                <Link
                  href={`/product/${inq.productId}`}
                  className="inline-block mt-2 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium"
                >
                  დაჯავშნა
                </Link>
              )}

              {inq.chatRoomId && (
                <Link
                  href={scope === 'buyer' ? '/account?tab=chats' : '/account?tab=chats'}
                  className="inline-flex items-center gap-2 mt-3 text-sm text-[#1B3729] font-medium"
                >
                  <MessageCircle className="w-4 h-4" />
                  ჩათი
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
