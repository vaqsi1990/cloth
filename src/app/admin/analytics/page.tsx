'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Activity } from 'lucide-react'

interface VisitAnalytics {
  pageViewsToday: number
  pageViewsWeek: number
  uniqueIpsToday: number
  uniqueIpsWeek: number
  uniqueIpsMonth: number
  recentVisitors: Array<{
    ip: string
    visits: number
    lastSeen: string
    country: string | null
  }>
}

export default function AdminAnalyticsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [visitAnalytics, setVisitAnalytics] = useState<VisitAnalytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated' || session?.user?.role !== 'ADMIN') return

    const fetchVisitAnalytics = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/admin/analytics/visits', {
          cache: 'no-store',
        })
        const result = await response.json()
        if (result.success && result.analytics) {
          setVisitAnalytics(result.analytics)
        }
      } catch (error) {
        console.error('Error fetching visit analytics:', error)
      } finally {
        setLoading(false)
      }
    }

    void fetchVisitAnalytics()
  }, [status, session?.user?.role])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-black">იტვირთება...</p>
        </div>
      </div>
    )
  }

  if (!session || session.user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">წვდომა აკრძალულია</h1>
          <Link href="/" className="text-blue-600 hover:text-blue-800">
            მთავარ გვერდზე დაბრუნება
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <button
              type="button"
              onClick={() => router.push('/admin')}
              className="flex items-center space-x-2 text-black hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 sm:w-7 sm:h-7 font-bold" />
              <span className="text-sm sm:text-base md:text-lg font-bold text-black">
                ადმინ პანელი
              </span>
            </button>
            <Link
              href="/admin/info"
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-gray-300 bg-white text-black hover:bg-gray-50 transition-colors text-sm sm:text-base font-medium"
            >
              შეკვეთების ინფორმაცია
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 mb-4 sm:mb-6">
          <div className="flex items-start gap-3 mb-6">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-500 rounded-lg flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-black">ანალიტიკა</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                უნიკალური IP-ები და ვიზიტები (cookie თანხმობის შემდეგ). დეტალური სტატისტიკა ასევე ჩანს Vercel Dashboard-ში.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : visitAnalytics ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="rounded-xl border border-gray-100 p-4">
                  <p className="text-sm text-gray-600">უნიკალური IP დღეს</p>
                  <p className="text-2xl font-bold text-black mt-1">
                    {visitAnalytics.uniqueIpsToday}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-100 p-4">
                  <p className="text-sm text-gray-600">უნიკალური IP 7 დღეში</p>
                  <p className="text-2xl font-bold text-black mt-1">
                    {visitAnalytics.uniqueIpsWeek}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-100 p-4">
                  <p className="text-sm text-gray-600">უნიკალური IP 30 დღეში</p>
                  <p className="text-2xl font-bold text-black mt-1">
                    {visitAnalytics.uniqueIpsMonth}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-100 p-4">
                  <p className="text-sm text-gray-600">ნახვები დღეს</p>
                  <p className="text-2xl font-bold text-black mt-1">
                    {visitAnalytics.pageViewsToday}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-black">
                      <th className="py-2 pr-4">IP</th>
                      <th className="py-2 pr-4">ქვეყანა</th>
                      <th className="py-2 pr-4">ნახვები (7 დღე)</th>
                      <th className="py-2">ბოლო ვიზიტი</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visitAnalytics.recentVisitors.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-gray-500">
                          ჯერ ვიზიტები არ ჩანს. მომხმარებლებმა უნდა მიიღონ analytics cookies.
                        </td>
                      </tr>
                    ) : (
                      visitAnalytics.recentVisitors.map((visitor) => (
                        <tr key={visitor.ip} className="border-b border-gray-100">
                          <td className="py-2 pr-4 font-mono text-black">{visitor.ip}</td>
                          <td className="py-2 pr-4 text-black">{visitor.country || '—'}</td>
                          <td className="py-2 pr-4 text-black">{visitor.visits}</td>
                          <td className="py-2 text-black">
                            {new Date(visitor.lastSeen).toLocaleString('ka-GE')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-gray-600">ანალიტიკის ჩატვირთვა ვერ მოხერხდა.</p>
          )}
        </div>
      </div>
    </div>
  )
}
