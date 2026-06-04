'use client'

import React from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import RentalInquiriesPanel from '@/components/RentalInquiriesPanel'

export default function AccountInquiriesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">იტვირთება...</div>
  }

  if (!session) {
    router.push('/auth/signin')
    return null
  }

  const isSeller = session.user.role !== 'SUPPORT'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-black">ქირავების მოთხოვნები</h1>
          <Link
            href="/account"
            className="px-4 py-2 bg-[#1B3729] text-white rounded-lg text-sm font-medium"
          >
            ანგარიში
          </Link>
        </div>
      </div>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {isSeller && (
          <div className="mb-10">
            <RentalInquiriesPanel scope="seller" title="ჩემს პროდუქტებზე მიღებული მოთხოვნები" />
          </div>
        )}
        <RentalInquiriesPanel scope="buyer" title="ჩემი გაგზავნილი მოთხოვნები" />
      </div>
    </div>
  )
}
