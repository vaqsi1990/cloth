'use client'

import { Suspense } from 'react'
import AccountSectionContent from '@/components/account/AccountSectionContent'
import type { AccountSection } from '@/lib/account-routes'

export default function AccountSectionPage({ section }: { section: AccountSection }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-gray-300 border-t-[#1B3729] rounded-full animate-spin mx-auto mb-4" />
            <p className="text-black">იტვირთება...</p>
          </div>
        </div>
      }
    >
      <AccountSectionContent section={section} />
    </Suspense>
  )
}
