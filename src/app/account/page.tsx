'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  accountSectionPath,
  buildAccountChatsPath,
  DEFAULT_ACCOUNT_SECTION,
  legacyTabToSection,
} from '@/lib/account-routes'

function AccountIndexRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const tab = legacyTabToSection(searchParams.get('tab'))
    const chatParam = searchParams.get('chat')
    const targetSection = tab ?? DEFAULT_ACCOUNT_SECTION

    if (targetSection === 'chats' || chatParam) {
      const chatId = chatParam ? parseInt(chatParam, 10) : NaN
      router.replace(buildAccountChatsPath(Number.isNaN(chatId) ? null : chatId))
      return
    }

    const params = new URLSearchParams()
    for (const key of ['vipSuccess', 'vipFailed', 'productId'] as const) {
      const value = searchParams.get(key)
      if (value) params.set(key, value)
    }

    const query = params.toString()
    router.replace(query ? `${accountSectionPath(targetSection)}?${query}` : accountSectionPath(targetSection))
  }, [router, searchParams])

  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-gray-300 border-t-[#1B3729] rounded-full animate-spin" />
    </div>
  )
}

export default function AccountIndexPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-gray-300 border-t-[#1B3729] rounded-full animate-spin" />
        </div>
      }
    >
      <AccountIndexRedirect />
    </Suspense>
  )
}
