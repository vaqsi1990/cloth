'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react'

const SignUpPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '', // ტელეფონის ნომერი
    location: '', // ადგილმდებარეობა
    personalId: '', // პირადობის ნომერი
    email: '',
    password: '',
    confirmPassword: '',
    code: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('')
    setSuccess('')
  }

  const handleSendCode = async () => {
    setError('')
    setSuccess('')
    if (!formData.email) {
      setError('გთხოვთ შეიყვანეთ ელფოსტა')
      return
    }
    setIsSendingCode(true)
    try {
      const res = await fetch('/api/auth/send-registration-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email })
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'వერიფიკაციის კოდის გაგზავნა ვერ მოხერხდა')
        return
      }
      setCodeSent(true)
      setSuccess('ვერიფიკაციის კოდი გაიგზავნა ელფოსტაზე')
    } catch {
      setError('შეცდომა კოდის გაგზავნისას')
    } finally {
      setIsSendingCode(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccess('')

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('პაროლები არ ემთხვევა')
      setIsLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError('პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო')
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          location: formData.location,
          personalId: formData.personalId,
          email: formData.email,
          password: formData.password,
          code: formData.code,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('ანგარიში წარმატებით შეიქმნა! ახლა შეგიძლიათ შეხვიდეთ.')
        setTimeout(() => {
          router.push('/auth/signin')
        }, 2000)
      } else {
        setError(data.error || 'შეცდომა ანგარიშის შექმნისას')
      }
    } catch {
      setError('შეცდომა სერვერთან კავშირისას')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex  justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="text-[20px] text-center md:text-[30px] font-semibold uppercase tracking-widesttext-black">
            რეგისტრაცია
          </h2>
          <p className="mt-2 text-center text-sm text-black">
            ან{' '}
            <Link
              href="/auth/signin"
              className="font-medium text-black"
            >
              შედით თქვენს ანგარიშში
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 text-sm">{success}</p>
            </div>
          )}

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                სახელი
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-300"
                  placeholder="შეიყვანეთ სახელი"
                />
              </div>
            </div>
            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                ტელეფონის ნომერი
              </label>
              <div className="relative">
                <input
                  id="phone"
                  name="phone"
                  type="text"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full pl-4 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-300"
                  placeholder="შეიყვანეთ ტელეფონის ნომერი"
                />
              </div>
            </div>
            {/* Location */}
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                ადგილმდებარეობა
              </label>
              <div className="relative">
                <input
                  id="location"
                  name="location"
                  type="text"
                  required
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full pl-4 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-300"
                  placeholder="შეიყვანეთ ადგილმდებარეობა"
                />
              </div>
            </div>
            {/* Personal ID */}
            <div>
              <label htmlFor="personalId" className="block text-sm font-medium text-gray-700 mb-2">
                პირადობის ნომერი
              </label>
              <div className="relative">
                <input
                  id="personalId"
                  name="personalId"
                  type="text"
                  required
                  value={formData.personalId}
                  onChange={handleChange}
                  className="w-full pl-4 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-300"
                  placeholder="შეიყვანეთ პირადობის ნომერი"
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
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-300"
                  placeholder="შეიყვანეთ ელფოსტა"
                />
              </div>
            </div>

          {/* Verification Code */}
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
              ვერიფიკაციის კოდი
            </label>
            <div className="relative">
              <input
                id="code"
                name="code"
                type="text"
                inputMode="numeric"
                pattern="[A-Za-z0-9]{6}"
                maxLength={6}
                value={formData.code}
                onChange={handleChange}
                className="w-full pl-4 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-300"
                placeholder="შეიყვანეთ 6-ნიშნა კოდი"
              />
            </div>
          </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                პაროლი
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-300"
                  placeholder="შეიყვანეთ პაროლი"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                პაროლის დადასტურება
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-300"
                  placeholder="დაადასტურეთ პაროლი"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {(!formData.code || !/^[A-Za-z0-9]{6}$/.test(formData.code)) && (
              <button
                type="button"
                onClick={handleSendCode}
                disabled={isSendingCode}
                className="w-full bg-black cursor-pointer text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-800 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isSendingCode ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>იგზავნება...</span>
                  </>
                ) : (
                  <span>ერთჯერადი კოდის გაგზავნა</span>
                )}
              </button>
            )}

            {codeSent && formData.code && /^[A-Za-z0-9]{6}$/.test(formData.code) && (
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-black cursor-pointer text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-800 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>რეგისტრაცია...</span>
                  </>
                ) : (
                  <span>რეგისტრაცია</span>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

export default SignUpPage
