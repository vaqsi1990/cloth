'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from '@/component/AppImage'
import {
  ArrowLeft,
  MapPin,
  Package,
  Phone,
  Truck,
  Loader2,
  CheckCircle2,
  HandMetal,
} from 'lucide-react'
import { showToast } from '@/utils/toast'
import { isCourier } from '@/lib/roles'
import { getCourierStatusLabel } from '@/lib/courier-delivery'

interface CourierPickup {
  itemId: number
  productName: string
  image: string | null
  quantity: number
  sellerName: string
  sellerPhone: string | null
  pickupAddress: string
}

interface CourierDelivery {
  orderId: number
  orderStatus: string
  courierStatus: 'PENDING' | 'PICKED_UP' | 'DELIVERED' | null
  courierId: string | null
  assignedToMe: boolean
  isUnassigned: boolean
  createdAt: string
  total: number
  customer: {
    name: string
    phone: string
    email: string | null
  }
  delivery: {
    address: string
    note: string | null
  }
  pickups: CourierPickup[]
  courierNote: string | null
}

const CourierDeliveriesPage = () => {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [scope, setScope] = useState<'active' | 'completed'>('active')
  const [deliveries, setDeliveries] = useState<CourierDelivery[]>([])
  const [loading, setLoading] = useState(true)
  const [actionOrderId, setActionOrderId] = useState<number | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  const fetchDeliveries = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/courier/deliveries?scope=${scope}`)
      const data = await response.json()
      if (data.success) {
        setDeliveries(data.deliveries)
      } else {
        showToast(data.error || 'მიტანების ჩატვირთვა ვერ მოხერხდა', 'error')
      }
    } catch (error) {
      console.error('Error fetching courier deliveries:', error)
      showToast('მიტანების ჩატვირთვისას მოხდა შეცდომა', 'error')
    } finally {
      setLoading(false)
    }
  }, [scope])

  useEffect(() => {
    if (status === 'authenticated' && isCourier(session?.user?.role)) {
      fetchDeliveries()
    }
  }, [status, session?.user?.role, fetchDeliveries])

  const runAction = async (
    orderId: number,
    action: 'claim' | 'pickup' | 'deliver' | 'release',
  ) => {
    try {
      setActionOrderId(orderId)
      const response = await fetch(`/api/courier/deliveries/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await response.json()
      if (response.ok && data.success) {
        showToast(data.message || 'განახლდა', 'success')
        await fetchDeliveries()
      } else {
        showToast(data.error || 'ოპერაცია ვერ მოხერხდა', 'error')
      }
    } catch (error) {
      console.error('Courier action error:', error)
      showToast('ოპერაციისას მოხდა შეცდომა', 'error')
    } finally {
      setActionOrderId(null)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!session || !isCourier(session.user.role)) {
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
            <Link href="/courier" className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">მიტანები</h1>
              <p className="text-gray-600 mt-1">აღების და მიტანის მისამართები</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setScope('active')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              scope === 'active'
                ? 'bg-black text-white'
                : 'bg-white border border-gray-300 text-gray-700'
            }`}
          >
            აქტიური
          </button>
          <button
            type="button"
            onClick={() => setScope('completed')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              scope === 'completed'
                ? 'bg-black text-white'
                : 'bg-white border border-gray-300 text-gray-700'
            }`}
          >
            დასრულებული
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-500 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            იტვირთება...
          </div>
        ) : deliveries.length === 0 ? (
          <div className="bg-white rounded-xl border p-10 text-center text-gray-500">
            {scope === 'active' ? 'აქტიური მიტანები არ არის' : 'დასრულებული მიტანები არ არის'}
          </div>
        ) : (
          <div className="space-y-4">
            {deliveries.map((delivery) => (
              <div
                key={delivery.orderId}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              >
                <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-semibold text-lg text-gray-900">
                        შეკვეთა #{delivery.orderId}
                      </h2>
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 text-xs text-gray-700">
                        {getCourierStatusLabel(delivery.courierStatus)}
                      </span>
                      {delivery.isUnassigned && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-xs text-amber-800">
                          თავისუფალი
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(delivery.createdAt).toLocaleString('ka-GE')}
                    </p>
                  </div>

                  {scope === 'active' && (
                    <div className="flex flex-wrap gap-2">
                      {delivery.isUnassigned && (
                        <button
                          type="button"
                          disabled={actionOrderId === delivery.orderId}
                          onClick={() => runAction(delivery.orderId, 'claim')}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white rounded-lg text-sm font-medium disabled:opacity-60"
                        >
                          <HandMetal className="w-4 h-4" />
                          ავიღო
                        </button>
                      )}
                      {delivery.assignedToMe && delivery.courierStatus === 'PENDING' && (
                        <button
                          type="button"
                          disabled={actionOrderId === delivery.orderId}
                          onClick={() => runAction(delivery.orderId, 'pickup')}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-60"
                        >
                          <Package className="w-4 h-4" />
                          ავიღე ნივთი
                        </button>
                      )}
                      {delivery.assignedToMe &&
                        (delivery.courierStatus === 'PENDING' ||
                          delivery.courierStatus === 'PICKED_UP') && (
                          <button
                            type="button"
                            disabled={actionOrderId === delivery.orderId}
                            onClick={() => runAction(delivery.orderId, 'deliver')}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium disabled:opacity-60"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            მიტანილია
                          </button>
                        )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:divide-x divide-gray-100">
                  <div className="p-4 sm:p-5">
                    <div className="flex items-center gap-2 mb-3 text-emerald-800">
                      <Package className="w-4 h-4" />
                      <h3 className="font-semibold">საიდან აიღო</h3>
                    </div>
                    <div className="space-y-3">
                      {delivery.pickups.map((pickup) => (
                        <div
                          key={pickup.itemId}
                          className="rounded-lg border border-gray-200 p-3 bg-gray-50"
                        >
                          <div className="flex gap-3">
                            <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-gray-200 shrink-0">
                              {pickup.image ? (
                                <Image
                                  src={pickup.image}
                                  alt={pickup.productName}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package className="w-5 h-5 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-gray-900">{pickup.productName}</p>
                              <p className="text-sm text-gray-600">
                                {pickup.sellerName}
                                {pickup.sellerPhone ? ` · ${pickup.sellerPhone}` : ''}
                              </p>
                              <p className="text-sm text-gray-800 mt-2 flex items-start gap-1">
                                <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>{pickup.pickupAddress}</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 sm:p-5">
                    <div className="flex items-center gap-2 mb-3 text-blue-800">
                      <Truck className="w-4 h-4" />
                      <h3 className="font-semibold">სად მიიტანო</h3>
                    </div>
                    <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 space-y-3">
                      <p className="font-medium text-gray-900">{delivery.customer.name}</p>
                      <p className="text-sm text-gray-700 flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        {delivery.customer.phone}
                      </p>
                      <p className="text-sm text-gray-800 flex items-start gap-2">
                        <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{delivery.delivery.address}</span>
                      </p>
                      {delivery.delivery.note && (
                        <p className="text-sm text-gray-600">
                          შენიშვნა: {delivery.delivery.note}
                        </p>
                      )}
                    </div>
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

export default CourierDeliveriesPage
