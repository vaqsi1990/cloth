'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react'

const SignUpPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    lastName: '', // გვარი
    phone: '', // ტელეფონის ნომერი
    location: '', // ადგილმდებარეობა
    address: '', // მისამართი
    postalIndex: '', // საფოსტო ინდექსი
    gender: '', // სქესი
    dateOfBirth: '', // დაბადების თარიღი
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
  const [showCodeInput, setShowCodeInput] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
    
    // Validate required fields before sending code
    if (!formData.name || !formData.lastName || !formData.phone || !formData.location || !formData.address || !formData.postalIndex || !formData.gender || !formData.dateOfBirth || !formData.personalId || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('გთხოვთ შეავსეთ ყველა ველი')
      return
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('პაროლები არ ემთხვევა')
      return
    }

    if (formData.password.length < 6) {
      setError('პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო')
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
        setError(data.error || 'ვერიფიკაციის კოდის გაგზავნა ვერ მოხერხდა')
        return
      }
      setCodeSent(true)
      setShowCodeInput(true)
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
          lastName: formData.lastName,
          phone: formData.phone,
          location: formData.location,
          address: formData.address,
          postalIndex: formData.postalIndex,
          gender: formData.gender,
          dateOfBirth: formData.dateOfBirth,
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
    <div className="min-h-screen  flex  justify-center py-12 px-4 sm:px-6 lg:px-8">
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

            {/* Last Name */}
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                გვარი
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-300"
                  placeholder="შეიყვანეთ გვარი"
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

            {/* Address */}
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                მისამართი
              </label>
              <div className="relative">
                <input
                  id="address"
                  name="address"
                  type="text"
                  required
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full pl-4 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-300"
                  placeholder="შეიყვანეთ მისამართი"
                />
              </div>
            </div>

            {/* Postal Index */}
            <div>
              <label htmlFor="postalIndex" className="block text-sm font-medium text-gray-700 mb-2">
                საფოსტო ინდექსი
              </label>
              <div className="relative">
                <input
                  id="postalIndex"
                  name="postalIndex"
                  type="text"
                  required
                  value={formData.postalIndex}
                  onChange={handleChange}
                  className="w-full pl-4 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-300"
                  placeholder="შეიყვანეთ საფოსტო ინდექსი"
                />
              </div>
            </div>

            {/* Gender */}
            <div>
              <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-2">
                სქესი
              </label>
              <div className="relative">
                <select
                  id="gender"
                  name="gender"
                  required
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full pl-4 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-300"
                >
                  <option value="">აირჩიეთ სქესი</option>
                  <option value="MALE">კაცი</option>
                  <option value="FEMALE">ქალი</option>
                
                </select>
              </div>
            </div>

            {/* Date of Birth */}
            <div>
              <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-2">
                დაბადების თარიღი
              </label>
              <div className="relative">
                <input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  required
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  className="w-full pl-4 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-300"
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
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-black"
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
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-black"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Verification Code - only show after code is sent */}
            {showCodeInput && (
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
            )}
          </div>

          <div className="space-y-3">
            {!showCodeInput ? (
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
                  <span>რეგისტრაცია</span>
                )}
              </button>
            ) : (
              <button
                type="submit"
                disabled={isLoading || !formData.code || !/^[A-Za-z0-9]{6}$/.test(formData.code)}
                className="w-full bg-black cursor-pointer text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-800 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>რეგისტრაცია...</span>
                  </>
                ) : (
                  <span>რეგისტრაციის დასრულება</span>
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
