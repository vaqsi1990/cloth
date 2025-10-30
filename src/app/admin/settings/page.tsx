'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, User, Mail, Lock, AlertTriangle, Eye, EyeOff, Camera } from 'lucide-react'
import ImageUpload from '@/component/CloudinaryUploader'

const AdminSettingsPage = () => {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [showPasswords, setShowPasswords] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false
  })
  
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user?.role === 'ADMIN' && session.user) {
      setProfileData({
        name: session.user.name || '',
        email: session.user.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
      setProfileImage(session.user.image || null)
    }
  }, [session])

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }))
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileData({
      ...profileData,
      [e.target.name]: e.target.value
    })
    setError(null)
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: profileData.name,
          email: profileData.email,
          image: profileImage
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // Update the session with new profile data
        await update({
          name: profileData.name,
          email: profileData.email,
          image: profileImage
        })
        
        setIsSubmitted(true)
        setTimeout(() => setIsSubmitted(false), 3000)
      } else {
        setError(data.error || 'შეცდომა პროფილის განახლებისას')
      }
    } catch {
      setError('ქსელის შეცდომა. გთხოვთ, სცადოთ მოგვიანებით.')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (profileData.newPassword !== profileData.confirmPassword) {
      setError('ახალი პაროლები არ ემთხვევა')
      setLoading(false)
      return
    }

    if (profileData.newPassword.length < 6) {
      setError('ახალი პაროლი მინიმუმ 6 სიმბოლო უნდა იყოს')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/admin/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: profileData.currentPassword,
          newPassword: profileData.newPassword
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setIsSubmitted(true)
        setProfileData({
          ...profileData,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        })
        setTimeout(() => setIsSubmitted(false), 3000)
      } else {
        setError(data.error || 'შეცდომა პაროლის შეცვლისას')
      }
    } catch {
      setError('ქსელის შეცდომა. გთხოვთ, სცადოთ მოგვიანებით.')
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (urls: string[]) => {
    if (urls.length === 0) return
    
    setIsUploadingImage(true)
    try {
      console.log('Uploading image:', urls[0])
      const response = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          name: profileData.name,
          email: profileData.email,
          image: urls[0] || null
        }),
      })

      const result = await response.json()
      console.log('Profile update response:', result)

      if (response.ok && result.success) {
        setProfileImage(urls[0])
        
        // Update the session with new image
        await update({
          image: urls[0],
          name: profileData.name,
          email: profileData.email
        })
        
        alert('პროფილის სურათი წარმატებით განახლდა!')
        setIsEditingProfile(false)
      } else {
        console.error('Profile update failed:', result)
        alert(`შეცდომა სურათის ატვირთვისას: ${result.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      alert('შეცდომა სურათის ატვირთვისას')
    } finally {
      setIsUploadingImage(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!session || session.user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">You don&apos;t have permission to access this page.</p>
          <Link
            href="/"
            className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/admin"
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>ადმინ პანელი</span>
              </Link>
              
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Profile Settings */}
          <div className="w-full flex justify-center lg:col-span-2">
            <div className="bg-white w-full max-w-xl rounded-2xl p-8 shadow-sm border border-gray-100">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">პროფილის ინფორმაცია</h2>
              </div>

              {/* Profile Image Section */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="relative">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                      {profileImage ? (
                        <img
                          src={profileImage}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-8 h-8 text-gray-600" />
                      )}
                    </div>
                    <button
                      onClick={() => setIsEditingProfile(!isEditingProfile)}
                      className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors"
                    >
                      <Camera className="w-3 h-3" />
                    </button>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">პროფილის სურათი</h3>
                    <p className="text-sm text-gray-600">ატვირთეთ თქვენი პროფილის სურათი</p>
                  </div>
                </div>

                {isEditingProfile && (
                  <div className="mt-4">
                    <ImageUpload
                      value={profileImage ? [profileImage] : []}
                      onChange={handleImageUpload}
                    />
                    {isUploadingImage && (
                      <p className="text-sm text-gray-600 mt-2">სურათი იტვირთება...</p>
                    )}
                    <div className="mt-3 flex space-x-2">
                      <button
                        onClick={() => setIsEditingProfile(false)}
                        className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                      >
                        გაუქმება
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {isSubmitted && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 font-medium">
                    ✅ პროფილი წარმატებით განახლდა!
                  </p>
                </div>
              )}

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 font-medium">{error}</p>
                </div>
              )}

              <form onSubmit={handleProfileUpdate} className="space-y-6">
                {/* Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    სახელი
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={profileData.name}
                      onChange={handleChange}
                      required
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-300"
                      placeholder="შეიყვანეთ თქვენი სახელი"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    ელფოსტა
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={profileData.email}
                      onChange={handleChange}
                      required
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-300"
                      placeholder="შეიყვანეთ თქვენი ელფოსტა"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-black text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-800 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>იგზავნება...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      <span>პროფილის განახლება</span>
                    </>
                  )}
                </button>
              </form>
              <div className="text-center mt-2">
                <Link href="/auth/forgot-password" className="text-[16px] text-blue-700 underline hover:text-blue-900">
                  დაგავიწყდა პაროლი? აღადგინე
                </Link>
              </div>
            </div>
          </div>

          {/* Password Settings */}
          
        </div>
      </div>
    </div>
  )
}

export default AdminSettingsPage
