'use client'

import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Save,
  User,
  Mail,
  Lock,
  Phone,
  Eye,
  EyeOff,
} from 'lucide-react'
import { showToast } from '@/utils/toast'
import { isCourier } from '@/lib/roles'

const CourierSettingsPage = () => {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [showPasswords, setShowPasswords] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  })
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    iban: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    const fetchProfile = async () => {
      if (!session?.user?.id || !isCourier(session.user.role)) return
      try {
        const response = await fetch('/api/user/profile')
        const data = await response.json()
        if (data.success && data.user) {
          setProfileData((prev) => ({
            ...prev,
            name: data.user.name || '',
            email: data.user.email || '',
            phone: data.user.phone || '',
            iban: data.user.iban || '',
          }))
        }
      } catch (error) {
        console.error('Error fetching courier profile:', error)
      }
    }
    fetchProfile()
  }, [session])

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileData.name,
          email: profileData.email,
          phone: profileData.phone,
          iban: profileData.iban || undefined,
        }),
      })
      const data = await response.json()
      if (response.ok && data.success) {
        await update({
          name: profileData.name,
          phone: profileData.phone,
          iban: data.user?.iban ?? profileData.iban,
        })
        showToast('პროფილი განახლდა', 'success')
      } else {
        showToast(data.error || 'შეცდომა', 'error')
      }
    } catch {
      showToast('ქსელის შეცდომა', 'error')
    } finally {
      setLoading(false)
    }
  }

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (profileData.newPassword !== profileData.confirmPassword) {
      showToast('პაროლები არ ემთხვევა', 'error')
      return
    }
    setPasswordLoading(true)
    try {
      const response = await fetch('/api/courier/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: profileData.currentPassword,
          newPassword: profileData.newPassword,
        }),
      })
      const data = await response.json()
      if (response.ok && data.success) {
        setProfileData((prev) => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        }))
        showToast('პაროლი შეიცვალა', 'success')
      } else {
        showToast(data.error || 'შეცდომა', 'error')
      }
    } catch {
      showToast('ქსელის შეცდომა', 'error')
    } finally {
      setPasswordLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
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
              <h1 className="text-2xl font-bold text-gray-900">პარამეტრები</h1>
              <p className="text-gray-600 mt-1">პროფილი და პაროლი</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        <form
          onSubmit={saveProfile}
          className="bg-white rounded-xl border border-gray-200 p-6 space-y-4"
        >
          <h2 className="text-lg font-semibold text-gray-900">პროფილი</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">სახელი</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={profileData.name}
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ელფოსტა</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={profileData.email}
                readOnly
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ტელეფონი</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={profileData.phone}
                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="iban" className="block text-sm font-medium text-gray-700 mb-1">
              ბანკის IBAN
            </label>
            <input
              type="text"
              id="iban"
              name="iban"
              value={profileData.iban}
              onChange={(e) =>
                setProfileData({
                  ...profileData,
                  iban: e.target.value.replace(/\s+/g, '').toUpperCase(),
                })
              }
              placeholder="მაგ: GE00TB0000000000000000"
              className="w-full uppercase px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black font-mono"
            />
            <p className="text-sm text-gray-500 mt-1">
              გამოიყენეთ ქართული (GE) IBAN ანგარიშზე ჩასარიცხად.
            </p>
            {profileData.iban.startsWith('GE') && profileData.iban.length >= 22 && (
              <p className="text-sm text-green-600 mt-1">IBAN ფორმატი სწორია</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-lg font-medium disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            {loading ? 'ინახება...' : 'შენახვა'}
          </button>
        </form>

        <form
          onSubmit={savePassword}
          className="bg-white rounded-xl border border-gray-200 p-6 space-y-4"
        >
          <h2 className="text-lg font-semibold text-gray-900">პაროლის შეცვლა</h2>

          {(['currentPassword', 'newPassword', 'confirmPassword'] as const).map((field) => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field === 'currentPassword'
                  ? 'მიმდინარე პაროლი'
                  : field === 'newPassword'
                    ? 'ახალი პაროლი'
                    : 'გაიმეორე პაროლი'}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPasswords[field] ? 'text' : 'password'}
                  value={profileData[field]}
                  onChange={(e) =>
                    setProfileData({ ...profileData, [field]: e.target.value })
                  }
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black"
                  required={field !== 'confirmPassword' || profileData.newPassword.length > 0}
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }))
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPasswords[field] ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))}

          <button
            type="submit"
            disabled={passwordLoading}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-700 text-white rounded-lg font-medium disabled:opacity-60"
          >
            <Lock className="w-4 h-4" />
            {passwordLoading ? 'ინახება...' : 'პაროლის შეცვლა'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default CourierSettingsPage
