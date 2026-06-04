'use client'

import React, { useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import RentalInquiriesPanel from '@/components/RentalInquiriesPanel'
import { isAdminOrSupport } from '@/lib/roles'

export default function AdminInquiriesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated' && !isAdminOrSupport(session?.user?.role)) {
      router.push('/')
    }
  }, [status, session, router])

  if (status === 'loading' || !session) {
    return <div className="min-h-screen flex items-center justify-center">იტვირთება...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-black">ქირავების მოთხოვნები</h1>
          <Link href="/admin" className="px-4 py-2 bg-black text-white rounded-lg text-sm">
            ადმინ პანელი
          </Link>
        </div>
      </div>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <RentalInquiriesPanel scope="all" title="ყველა მოთხოვნა" />
      </div>
    </div>
  )
}
