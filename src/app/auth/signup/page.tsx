'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, User, Eye, EyeOff, MapPin } from 'lucide-react'
import { showToast } from '@/utils/toast'
import TermsModal from '@/component/TermsModal'
import {
  getPersonFieldLabel,
  isValidPersonAddress,
  isValidPersonName,
  PERSON_ADDRESS_DIGIT_ERROR,
  PERSON_ADDRESS_FIELD_ERROR,
  PERSON_NAME_FIELD_ERROR,
} from '@/lib/personal-text'

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
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [termsError, setTermsError] = useState('')
  const [showTermsModal, setShowTermsModal] = useState(false)

  const router = useRouter()

  const step1Fields = ['name', 'lastName', 'phone', 'location', 'address', 'postalIndex'] as const

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

    if (['name', 'lastName', 'location'].includes(name)) {
      if (value && !isValidPersonName(value)) {
        setFieldErrors(prev => ({
          ...prev,
          [name]: `${getPersonFieldLabel(name as 'name' | 'lastName' | 'location')} ${PERSON_NAME_FIELD_ERROR}`,
        }))
      } else {
        setFieldErrors(prev => {
          const newErrors = { ...prev }
          delete newErrors[name]
          return newErrors
        })
      }
    } else if (name === 'address') {
      if (value && !isValidPersonAddress(value)) {
        setFieldErrors(prev => ({
          ...prev,
          [name]: `მისამართი ${PERSON_ADDRESS_FIELD_ERROR}`,
        }))
      } else if (value && !/[0-9]/.test(value)) {
        setFieldErrors(prev => ({
          ...prev,
          [name]: PERSON_ADDRESS_DIGIT_ERROR,
        }))
      } else {
        setFieldErrors(prev => {
          const newErrors = { ...prev }
          delete newErrors[name]
          return newErrors
        })
      }
    } else if (name === 'pickupAddress') {
      if (value && !isValidPersonAddress(value)) {
        setFieldErrors(prev => ({
          ...prev,
          [name]: `მისამართი ადგილზე მიტანისთვის ${PERSON_ADDRESS_FIELD_ERROR}`,
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

  const validateStep1 = (): boolean => {
    const step1Errors = step1Fields.filter((field) => !formData[field]?.trim())
    if (step1Errors.length > 0) {
      showToast('გთხოვთ შეავსეთ პირველი ნაწილის ყველა ველი', 'error')
      return false
    }
    if (step1Fields.some((field) => fieldErrors[field])) {
      showToast('გთხოვთ გაასწოროთ შეცდომები', 'error')
      return false
    }
    if (!isValidPersonName(formData.name)) {
      showToast(`სახელი ${PERSON_NAME_FIELD_ERROR}`, 'error')
      return false
    }
    if (!isValidPersonName(formData.lastName)) {
      showToast(`გვარი ${PERSON_NAME_FIELD_ERROR}`, 'error')
      return false
    }
    if (!isValidPersonName(formData.location)) {
      showToast(`ადგილმდებარეობა ${PERSON_NAME_FIELD_ERROR}`, 'error')
      return false
    }
    if (!isValidPersonAddress(formData.address)) {
      showToast(`მისამართი ${PERSON_ADDRESS_FIELD_ERROR}`, 'error')
      return false
    }
    if (!/[0-9]/.test(formData.address)) {
      showToast(PERSON_ADDRESS_DIGIT_ERROR, 'error')
      return false
    }
    return true
  }

  const validateTermsAgreement = (): boolean => {
    if (!agreedToTerms) {
      setTermsError('გთხოვთ დაადასტუროთ, რომ ეთანხმებით წესებსა და პირობებს')
      showToast('გთხოვთ დაადასტუროთ, რომ ეთანხმებით წესებსა და პირობებს', 'error')
      return false
    }
    setTermsError('')
    return true
  }

  const validateStep2 = (): boolean => {
    const requiredStep2 = ['gender', 'dateOfBirth', 'personalId', 'email', 'password', 'confirmPassword'] as const
    if (requiredStep2.some((field) => !formData[field]?.trim())) {
      showToast('გთხოვთ შეავსეთ მეორე ნაწილის ყველა ველი', 'error')
      return false
    }
    if (['gender', 'dateOfBirth', 'personalId', 'email', 'password', 'confirmPassword', 'pickupAddress'].some(
      (field) => fieldErrors[field],
    )) {
      showToast('გთხოვთ გაასწოროთ შეცდომები', 'error')
      return false
    }
    if (!validateTermsAgreement()) {
      return false
    }
    return true
  }

  const handleNextStep = () => {
    if (!validateStep1()) return
    setStep(2)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSendCode = async () => {
    setError('')
    setSuccess('')

    if (!validateStep1() || !validateStep2()) return
    
    if (formData.pickupAddress && !isValidPersonAddress(formData.pickupAddress)) {
      showToast(`მისამართი ადგილზე მიტანისთვის ${PERSON_ADDRESS_FIELD_ERROR}`, 'error')
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
      setStep(3)
      showToast('ვერიფიკაციის კოდი გაიგზავნა ელფოსტაზე', 'success')
      window.scrollTo({ top: 0, behavior: 'smooth' })
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

    if (!codeSent || !formData.code || !/^[A-Za-z0-9]{6}$/.test(formData.code)) {
      showToast('გთხოვთ შეიყვანოთ ელფოსტაზე მიღებული 6-ნიშნა ვერიფიკაციის კოდი', 'error')
      setIsLoading(false)
      return
    }

    if (!validateStep1() || !validateStep2()) {
      setIsLoading(false)
      return
    }

    // Check for field validation errors
    if (Object.keys(fieldErrors).length > 0) {
      showToast('გთხოვთ გაასწოროთ შეცდომები', 'error')
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
          <h2 className="text-[16px] text-black text-center md:text-[20px] font-semibold uppercase tracking-widest">
            რეგისტრაცია
          </h2>
          <p className="mt-3 text-center text-sm md:text-base text-gray-600">
            ნაწილი {step} / 3
          </p>
          <div className="mt-3 flex gap-2">
            <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? 'bg-[#1B3729]' : 'bg-gray-200'}`} />
            <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? 'bg-[#1B3729]' : 'bg-gray-200'}`} />
            <div className={`h-1.5 flex-1 rounded-full ${step >= 3 ? 'bg-[#1B3729]' : 'bg-gray-200'}`} />
          </div>
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

        <form
          className="mt-8 space-y-6"
          onSubmit={(e) => {
            if (step === 2) {
              e.preventDefault()
              void handleSendCode()
              return
            }
            void handleSubmit(e)
          }}
        >
          <div className="space-y-4">
            {step === 1 && (
              <>
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
              </>
            )}

            {step === 2 && (
              <>
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

            <div
              className={`rounded-lg border p-4 ${
                termsError ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-gray-50'
              }`}
            >
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => {
                    setAgreedToTerms(e.target.checked)
                    if (e.target.checked) {
                      setTermsError('')
                    }
                  }}
                  className={`mt-1 h-4 w-4 rounded border-gray-300 text-[#1B3729] focus:ring-[#1B3729] ${
                    termsError ? 'border-red-500' : ''
                  }`}
                />
                <span className="text-sm md:text-base text-black">
                  <span className="text-red-600">*</span>ვეთანხმები წესებს და პირობებს
                </span>
              </label>
              <p className="mt-2 text-sm text-gray-600">
              გაეცანით წესებს და პირობებს {' '}
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="font-medium text-[#1B3729] underline hover:opacity-80"
                >
                  წაკითხვა
                </button>
              </p>
              {termsError && (
                <p className="mt-2 text-sm font-medium text-red-600">{termsError}</p>
              )}
            </div>

              </>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="rounded-lg border border-[#1B3729]/20 bg-[#1B3729]/5 p-4">
                  <p className="text-sm md:text-base text-black">
                    ვერიფიკაციის კოდი გაიგზავნა მისამართზე{' '}
                    <span className="font-semibold">{formData.email}</span>
                  </p>
                  <p className="mt-2 text-sm text-gray-600">
                    შეიყვანეთ 6-ნიშნა კოდი რეგისტრაციის დასასრულებლად. კოდი ვადა გასდება 10 წუთში.
                  </p>
                </div>

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
                      pattern="[0-9]{6}"
                      maxLength={6}
                      required
                      autoFocus
                      value={formData.code}
                      onChange={handleChange}
                      className="w-full pl-4 pr-4 py-3 text-black text-center text-2xl tracking-[0.5em] placeholder:text-gray-500 placeholder:text-base placeholder:tracking-normal border border-black rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-300"
                      placeholder="000000"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {step === 1 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="w-full md:text-[18px] font-bold text-[16px] bg-[#1B3729] cursor-pointer text-white py-3 px-6 rounded-lg hover:bg-gray-800 transition-colors duration-300"
              >
                შემდეგი
              </button>
            ) : step === 2 ? (
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    setStep(1)
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                  className="w-full sm:w-auto sm:min-w-[120px] md:text-[18px] font-bold text-[16px] border border-black text-black py-3 px-6 rounded-lg hover:bg-gray-50 transition-colors duration-300"
                >
                  უკან
                </button>
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={isSendingCode}
                  className="w-full flex-1 md:text-[18px] font-bold text-[16px] bg-[#1B3729] cursor-pointer text-white py-3 px-6 rounded-lg hover:bg-gray-800 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isSendingCode ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>იგზავნება...</span>
                    </>
                  ) : (
                    <span>ვერიფიკაციის კოდის გაგზავნა</span>
                  )}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={isLoading || !formData.code || !/^[0-9]{6}$/.test(formData.code)}
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
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => {
                      setStep(2)
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                    className="w-full sm:w-auto sm:min-w-[120px] md:text-[18px] font-bold text-[16px] border border-black text-black py-3 px-6 rounded-lg hover:bg-gray-50 transition-colors duration-300"
                  >
                    უკან
                  </button>
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={isSendingCode}
                    className="w-full flex-1 md:text-[18px] font-bold text-[16px] border border-[#1B3729] text-[#1B3729] py-3 px-6 rounded-lg hover:bg-[#1B3729]/5 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSendingCode ? 'იგზავნება...' : 'კოდის ხელახლა გაგზავნა'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>
      </div>

      <TermsModal open={showTermsModal} onClose={() => setShowTermsModal(false)} />
    </div>
  )
}

export default SignUpPage
