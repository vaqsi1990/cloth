'use client'

import React, { useState } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'

const SignInPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false
      })

      if (result?.error) {
        if (result.error.startsWith('BANNED:')) {
          setError(result.error.replace('BANNED:', '').trim())
        } else {
          setError('არასწორი ელფოსტა ან პაროლი')
        }
      } else {
        // Get session to check user role
        const session = await getSession()
        if (session?.user?.role === 'ADMIN') {
          router.push('/admin')
        } else {
          router.push('/')
        }
      }
    } catch (error) {
      setError('შეცდომა შესვლისას')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen  flex  justify-center py-12 px-4 ">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="text-[20px] text-center md:text-[30px] font-semibold uppercase tracking-widesttext-black">
            შესვლა
          </h2>
          <p className="mt-2 text-center text-lg text-black ">
            ან{' '}
            <Link
              href="/auth/signup"
            className=" text-blue-700  hover:text-[#1B3729]"
            >
             დარეგისტრირდი
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-[16px]">{error}</p>
            </div>
          )}

          <div className="space-y-4">
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
                  className="w-full pl-10 pr-4 py-3 placeholder:text-black border border-black rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-300"
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
                  className="w-full pl-10 pr-12 py-3 placeholder:text-black border border-black rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-300"
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
          </div>

          {/* Password recovery */}
          <div className="text-center mt-2">
            <Link href="/auth/forgot-password" className="md:text-[18px] text-[16px] text-blue-700 hover:text-[#1B3729]">
              დაგავიწყდა პაროლი? აღადგინე
            </Link>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full md:text-[18px] text-[16px] bg-black cursor-pointer text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-800 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>შესვლა...</span>
                </>
              ) : (
                <span>შესვლა</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default SignInPage
