'use client'

import React, { useEffect, useState } from 'react'
import { getSession, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Phone } from 'lucide-react'
import { showToast } from '@/utils/toast'
import { isValidPhone } from '@/lib/phone'
import { userHasRequiredPhone } from '@/lib/user-phone-required'

function getRedirectPath(role?: string | null): string {
  if (role === 'ADMIN') return '/admin'
  if (role === 'SUPPORT') return '/support'
  return '/'
}

export default function CompletePhonePage() {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (
      status === 'authenticated' &&
      userHasRequiredPhone({
        role: session?.user?.role,
        phone: session?.user?.phone,
      })
    ) {
      window.location.replace(getRedirectPath(session?.user?.role))
    }
  }, [status, session?.user?.phone, session?.user?.role])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!isValidPhone(phone)) {
      setError('ტელეფონის ნომერი არასწორია. მაგ: 555123456 ან +995555123456')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/user/phone', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.error || 'შეცდომა ტელეფონის შენახვისას')
        setIsSaving(false)
        return
      }

      await update({ phone: data.phone })

      const freshSession = await getSession()
      const savedPhone = freshSession?.user?.phone ?? data.phone

      if (
        !userHasRequiredPhone({
          role: freshSession?.user?.role ?? session?.user?.role,
          phone: savedPhone,
        })
      ) {
        setError('ტელეფონის ნომერი შენახულია, მაგრამ სესია ვერ განახლდა. სცადეთ ხელახლა.')
        setIsSaving(false)
        return
      }

      showToast('ტელეფონის ნომერი წარმატებით შენახულია', 'success')
      window.location.replace(getRedirectPath(freshSession?.user?.role ?? session?.user?.role))
    } catch {
      setError('შეცდომა ტელეფონის შენახვისას')
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex justify-center py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="text-[16px] text-black text-center md:text-[20px] font-semibold uppercase tracking-widest">
            ტელეფონის ნომერი
          </h2>
          <p className="mt-3 text-center text-lg text-black">
            Google-ით შესვლის შემდეგ ტელეფონის ნომრის მითითება სავალდებულოა.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-[16px]">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="phone" className="block md:text-[18px] text-[16px] font-medium text-black mb-2">
              ტელეფონის ნომერი
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-black" />
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value)
                  setError('')
                }}
                className="w-full pl-10 pr-4 py-3 text-black placeholder:text-gray-500 border border-black rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-300"
                placeholder="მაგ: 555123456"
              />
            </div>
            <p className="mt-2 text-sm text-black">ფორმატი: 555123456 ან +995555123456</p>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full md:text-[18px] font-bold text-[16px] bg-[#1B3729] cursor-pointer text-white py-3 px-6 rounded-lg hover:bg-gray-800 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isSaving ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>შენახვა...</span>
              </>
            ) : (
              <span>გაგრძელება</span>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
