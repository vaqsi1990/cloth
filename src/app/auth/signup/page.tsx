'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, User, Eye, EyeOff, MapPin } from 'lucide-react'
import { showToast } from '@/utils/toast'

const SignUpPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    lastName: '', // გვარი
    phone: '', // ტელეფონის ნომერი
    location: '', // ადგილმდებარეობა
    address: '', // მისამართი
    postalIndex: '', // საფოსტო ინდექსი
    pickupAddress: '', // მისამართი ადგილზე მიტანისთვის
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  
  const router = useRouter()

  // Function to calculate age from date of birth
  const calculateAge = (dateOfBirth: string): number => {
    if (!dateOfBirth) return 0
    const birthDate = new Date(dateOfBirth)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value
    })
    setError('')
    setSuccess('')

    // Validate age for date of birth
    if (name === 'dateOfBirth' && value) {
      const age = calculateAge(value)
      if (age < 18) {
        setFieldErrors(prev => ({
          ...prev,
          [name]: 'თქვენ უნდა იყოთ მინიმუმ 18 წლის რეგისტრაციისთვის'
        }))
      } else {
        setFieldErrors(prev => {
          const newErrors = { ...prev }
          delete newErrors[name]
          return newErrors
        })
      }
    }

    // Validate Georgian characters for name, lastName, location, address in real-time
    if (['name', 'lastName', 'location'].includes(name)) {
      if (value && !/^[\u10A0-\u10FF\s]+$/.test(value)) {
        const fieldName = name === 'name' ? 'სახელი' :
                         name === 'lastName' ? 'გვარი' :
                         'ადგილმდებარეობა'
        setFieldErrors(prev => ({
          ...prev,
          [name]: `${fieldName} უნდა შეიცავდეს მხოლოდ ქართულ სიმბოლოებს`
        }))
      } else {
        setFieldErrors(prev => {
          const newErrors = { ...prev }
          delete newErrors[name]
          return newErrors
        })
      }
    } else if (name === 'address') {
      // Address allows Georgian characters, numbers, № (optional), N, and punctuation marks
      // Must contain at least one digit
      if (value && !/^[\u10A0-\u10FF\s0-9№N,.\-:;()\[\]{}/"]+$/.test(value)) {
        setFieldErrors(prev => ({
          ...prev,
          [name]: 'მისამართი უნდა შეიცავდეს მხოლოდ ქართულ სიმბოლოებს, ციფრებს, №, N და სასვენი ნიშნებს'
        }))
      } else if (value && !/[0-9]/.test(value)) {
        setFieldErrors(prev => ({
          ...prev,
          [name]: 'მისამართი უნდა შეიცავდეს ციფრებს'
        }))
      } else {
        setFieldErrors(prev => {
          const newErrors = { ...prev }
          delete newErrors[name]
          return newErrors
        })
      }
    } else if (name === 'pickupAddress') {
      // Pickup address validation (optional field, but if provided should be valid)
      if (value && !/^[\u10A0-\u10FF\s0-9№N,.\-:;()\[\]{}/"]+$/.test(value)) {
        setFieldErrors(prev => ({
          ...prev,
          [name]: 'მისამართი ადგილზე მიტანისთვის უნდა შეიცავდეს მხოლოდ ქართულ სიმბოლოებს, ციფრებს, №, N და სასვენი ნიშნებს'
        }))
      } else {
        setFieldErrors(prev => {
          const newErrors = { ...prev }
          delete newErrors[name]
          return newErrors
        })
      }
    }
  }

  const handleSendCode = async () => {
    setError('')
    setSuccess('')
    
    // Check for field validation errors
    if (Object.keys(fieldErrors).length > 0) {
      showToast('გთხოვთ გაასწოროთ შეცდომები', 'error')
      return
    }
    
    // Validate required fields before sending code
    if (!formData.name || !formData.lastName || !formData.phone || !formData.location || !formData.address || !formData.postalIndex || !formData.gender || !formData.dateOfBirth || !formData.personalId || !formData.email || !formData.password || !formData.confirmPassword) {
      showToast('გთხოვთ შეავსეთ ყველა ველი', 'error')
      return
    }
    
    // Validate pickupAddress if provided
    if (formData.pickupAddress && !/^[\u10A0-\u10FF\s0-9№N,.\-:;()\[\]{}/"]+$/.test(formData.pickupAddress)) {
      showToast('მისამართი ადგილზე მიტანისთვის უნდა შეიცავდეს მხოლოდ ქართულ სიმბოლოებს, ციფრებს, №, N და სასვენი ნიშნებს', 'error')
      return
    }
    
    // Validate Georgian characters
    if (!/^[\u10A0-\u10FF\s]+$/.test(formData.name)) {
      showToast('სახელი უნდა შეიცავდეს მხოლოდ ქართულ სიმბოლოებს', 'error')
      return
    }
    if (!/^[\u10A0-\u10FF\s]+$/.test(formData.lastName)) {
      showToast('გვარი უნდა შეიცავდეს მხოლოდ ქართულ სიმბოლოებს', 'error')
      return
    }
    if (!/^[\u10A0-\u10FF\s]+$/.test(formData.location)) {
      showToast('ადგილმდებარეობა უნდა შეიცავდეს მხოლოდ ქართულ სიმბოლოებს', 'error')
      return
    }
    if (!/^[\u10A0-\u10FF\s0-9№N,.\-:;()\[\]{}/"]+$/.test(formData.address)) {
      showToast('მისამართი უნდა შეიცავდეს მხოლოდ ქართულ სიმბოლოებს, ციფრებს, №, N და სასვენი ნიშნებს', 'error')
      return
    }
    if (!/[0-9]/.test(formData.address)) {
      showToast('მისამართი უნდა შეიცავდეს ციფრებს', 'error')
      return
    }
    
    // Validate age (must be at least 18 years old)
    if (formData.dateOfBirth) {
      const age = calculateAge(formData.dateOfBirth)
      if (age < 18) {
        showToast('თქვენ უნდა იყოთ მინიმუმ 18 წლის რეგისტრაციისთვის', 'error')
        return
      }
    }
    
    if (formData.password !== formData.confirmPassword) {
      showToast('პაროლები არ ემთხვევა', 'error')
      return
    }

    if (formData.password.length < 6) {
      showToast('პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო', 'error')
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
        showToast(data.error || 'ვერიფიკაციის კოდის გაგზავნა ვერ მოხერხდა', 'error')
        return
      }
      setCodeSent(true)
      setShowCodeInput(true)
      showToast('ვერიფიკაციის კოდი გაიგზავნა ელფოსტაზე', 'success')
    } catch {
      showToast('შეცდომა კოდის გაგზავნისას', 'error')
    } finally {
      setIsSendingCode(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccess('')

    // Check for field validation errors
    if (Object.keys(fieldErrors).length > 0) {
      showToast('გთხოვთ გაასწოროთ შეცდომები', 'error')
      setIsLoading(false)
      return
    }

    // Validate Georgian characters
    if (!/^[\u10A0-\u10FF\s]+$/.test(formData.name)) {
      showToast('სახელი უნდა შეიცავდეს მხოლოდ ქართულ სიმბოლოებს', 'error')
      setIsLoading(false)
      return
    }
    if (!/^[\u10A0-\u10FF\s]+$/.test(formData.lastName)) {
      showToast('გვარი უნდა შეიცავდეს მხოლოდ ქართულ სიმბოლოებს', 'error')
      setIsLoading(false)
      return
    }
    if (!/^[\u10A0-\u10FF\s]+$/.test(formData.location)) {
      showToast('ადგილმდებარეობა უნდა შეიცავდეს მხოლოდ ქართულ სიმბოლოებს', 'error')
      setIsLoading(false)
      return
    }
    if (!/^[\u10A0-\u10FF\s0-9№N,.\-:;()\[\]{}/"]+$/.test(formData.address)) {
      showToast('მისამართი უნდა შეიცავდეს მხოლოდ ქართულ სიმბოლოებს, ციფრებს, №, N და სასვენი ნიშნებს', 'error')
      setIsLoading(false)
      return
    }
    if (!/[0-9]/.test(formData.address)) {
      showToast('მისამართი უნდა შეიცავდეს ციფრებს', 'error')
      setIsLoading(false)
      return
    }

    // Validate age (must be at least 18 years old)
    if (formData.dateOfBirth) {
      const age = calculateAge(formData.dateOfBirth)
      if (age < 18) {
        showToast('თქვენ უნდა იყოთ მინიმუმ 18 წლის რეგისტრაციისთვის', 'error')
        setIsLoading(false)
        return
      }
    }

    // Validation
    if (formData.password !== formData.confirmPassword) {
      showToast('პაროლები არ ემთხვევა', 'error')
      setIsLoading(false)
      return
    }

    if (formData.password.length < 6) {
      showToast('პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო', 'error')
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
          pickupAddress: formData.pickupAddress || undefined,
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
        showToast('ანგარიში წარმატებით შეიქმნა! ახლა შეგიძლიათ შეხვიდეთ.', 'success')
        setTimeout(() => {
          router.push('/auth/signin')
        }, 2000)
      } else {
        showToast(data.error || 'შეცდომა ანგარიშის შექმნისას', 'error')
      }
    } catch {
      showToast('შეცდომა სერვერთან კავშირისას', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen  flex  justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="text-[16px] text-black text-center md:text-[20px] font-semibold uppercase tracking-widesttext-black">
            რეგისტრაცია
          </h2>
          <p className="mt-2 text-center text-lg text-black">
            ან{' '}
            <Link
              href="/auth/signin"
              className="text-blue-700  hover:text-[#1B3729]"
            >
              შედით თქვენს ანგარიშში
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block md:text-[18px] text-[16px] font-medium text-black mb-2">
                სახელი
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-black" />
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-4 text-black py-3 placeholder:text-gray-500 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-300 ${fieldErrors.name ? 'border-red-500' : 'border-black'}`}
                  placeholder="შეიყვანეთ სახელი"
                />
              </div>
              {fieldErrors.name && <p className="text-red-500 md:text-[18px] text-[16px] mt-1">{fieldErrors.name}</p>}
            </div>

            {/* Last Name */}
            <div>
              <label htmlFor="lastName" className="block md:text-[18px] text-[16px] font-medium text-black mb-2">
                გვარი
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-black" />
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-4 text-black py-3 placeholder:text-gray-500 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-300 ${fieldErrors.lastName ? 'border-red-500' : 'border-black'}`}
                  placeholder="შეიყვანეთ გვარი"
                />
              </div>
              {fieldErrors.lastName && <p className="text-red-500 md:text-[18px] text-[16px] mt-1">{fieldErrors.lastName}</p>}
            </div>
            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block md:text-[18px] text-[16px] font-medium text-black mb-2">
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
                  className="w-full pl-4 pr-4 text-black py-3 placeholder:text-gray-500 border border-black rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-300"
                  placeholder="შეიყვანეთ ტელეფონის ნომერი"
                />
              </div>
            </div>
            {/* Location */}
            <div>
              <label htmlFor="location" className="block md:text-[18px] text-[16px] font-medium text-black mb-2">
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
                  className={`w-full pl-4 pr-4 text-black py-3 placeholder:text-gray-500 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-300 ${fieldErrors.location ? 'border-red-500' : 'border-black'}`}
                  placeholder="შეიყვანეთ ადგილმდებარეობა"
                />
              </div>
              {fieldErrors.location && <p className="text-red-500 md:text-[18px] text-[16px] mt-1">{fieldErrors.location}</p>}
            </div>

            {/* Address */}
            <div>
              <label htmlFor="address" className="block md:text-[18px] text-[16px] font-medium text-black mb-2">
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
                  className={`w-full pl-4 pr-4 py-3 text-black placeholder:text-gray-500 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-300 ${fieldErrors.address ? 'border-red-500' : 'border-black'}`}
                  placeholder="შეიყვანეთ მისამართი"
                />
              </div>
              {fieldErrors.address && <p className="text-red-500 md:text-[18px] text-[16px] mt-1">{fieldErrors.address}</p>}
            </div>

            {/* Postal Index */}
            <div>
              <label htmlFor="postalIndex" className="block md:text-[18px] text-[16px] font-medium text-black mb-2">
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
                  className="w-full pl-4 pr-4 py-3 text-black placeholder:text-gray-500 border border-black rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-300"
                  placeholder="შეიყვანეთ საფოსტო ინდექსი"
                />
              </div>
            </div>

            {/* Pickup Address */}
            <div>
              <label htmlFor="pickupAddress" className="block md:text-[18px] text-[16px] font-medium text-black mb-2">
                მისამართი ადგილზე მისვლისთვის <span className="text-gray-500 text-sm">(ოფციონალური)</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="pickupAddress"
                  name="pickupAddress"
                  type="text"
                  value={formData.pickupAddress}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-4 py-3 text-black placeholder:text-gray-500 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-300 ${fieldErrors.pickupAddress ? 'border-red-500' : 'border-black'}`}
                  placeholder="მაგ: ლეო დავითაშვილის ქუჩა 120, 0190 თბილისი, საქართველო"
                />
              </div>
              {fieldErrors.pickupAddress && <p className="text-red-500 md:text-[18px] text-[16px] mt-1">{fieldErrors.pickupAddress}</p>}
              <p className="text-sm text-gray-600 mt-1">
                ეს მისამართი გამოყენებული იქნება checkout-ში, როცა აირჩევთ "ადგილზე" მისვლის ტიპს
              </p>
            </div>

            {/* Gender */}
            <div>
              <label htmlFor="gender" className="block md:text-[18px] text-[16px] font-medium text-black mb-2">
                სქესი
              </label>
              <div className="relative">
                <select
                  id="gender"
                  name="gender"
                  required
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full pl-4 pr-4 py-3 text-black placeholder:text-gray-500 border border-black rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-300"
                >
                  <option value="">აირჩიეთ სქესი</option>
                  <option value="MALE">კაცი</option>
                  <option value="FEMALE">ქალი</option>
                
                </select>
              </div>
            </div>

            {/* Date of Birth */}
            <div>
              <label htmlFor="dateOfBirth" className="block md:text-[18px] text-[16px] font-medium text-black mb-2">
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
                  className={`w-full pl-4 pr-4 py-3 text-black placeholder:text-gray-500 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-300 ${fieldErrors.dateOfBirth ? 'border-red-500' : 'border-black'}`}
                />
              </div>
              {fieldErrors.dateOfBirth && <p className="text-red-500 md:text-[18px] text-[16px] mt-1">{fieldErrors.dateOfBirth}</p>}
            </div>
            {/* Personal ID */}
            <div>
              <label htmlFor="personalId" className="block md:text-[18px] text-[16px] font-medium text-black mb-2">
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
                  className="w-full pl-4 pr-4 py-3 text-black placeholder:text-gray-500 border border-black rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-300"
                  placeholder="შეიყვანეთ პირადობის ნომერი"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block md:text-[18px] text-[16px] font-medium text-black mb-2">
                ელფოსტა
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-black" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 text-black placeholder:text-gray-500 border border-black rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-300"
                  placeholder="შეიყვანეთ ელფოსტა"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block md:text-[18px] text-[16px] font-medium text-black mb-2">
                პაროლი
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-black" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-12 py-3 text-black placeholder:text-gray-500 border border-black rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-300"
                  placeholder="შეიყვანეთ პაროლი"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-black hover:text-black"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block md:text-[18px] text-[16px] font-medium text-black mb-2">
                პაროლის დადასტურება
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-black" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full pl-10 pr-12 py-3 text-black placeholder:text-gray-500 border border-black rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-300"
                  placeholder="დაადასტურეთ პაროლი"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-black hover:text-black"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Verification Code - only show after code is sent */}
            {showCodeInput && (
              <div>
                <label htmlFor="code" className="block md:text-[18px] text-[16px] font-medium text-black mb-2">
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
                    className="w-full pl-4 pr-4 py-3 text-black placeholder:text-gray-500 border border-black rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-300"
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
                className="w-full md:text-[18px] font-bold text-[16px] bg-[#1B3729] cursor-pointer text-white py-3 px-6 rounded-lg hover:bg-gray-800 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
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
                className="w-full md:text-[18px] font-bold text-[16px] bg-[#1B3729] cursor-pointer text-white py-3 px-6 rounded-lg hover:bg-gray-800 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
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
