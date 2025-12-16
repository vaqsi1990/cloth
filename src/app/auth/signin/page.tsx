'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'

const SignInContent = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  
  const router = useRouter()
  const searchParams = useSearchParams()

  // Check for OAuth errors in URL
  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam) {
      let errorMessage = 'შეცდომა Google-ით შესვლისას'
      
      switch (errorParam) {
        case 'OAuthSignin':
          errorMessage = 'Google-ით შესვლა ვერ მოხერხდა. გთხოვთ, შეამოწმოთ რომ Google Cloud Console-ში დაყენებულია სწორი redirect URI: https://www.dressla.ge/api/auth/callback/google'
          break
        case 'OAuthCallback':
          errorMessage = 'Google-ის callback-ში შეცდომა მოხდა'
          break
        case 'OAuthCreateAccount':
          errorMessage = 'ანგარიშის შექმნა ვერ მოხერხდა'
          break
        case 'EmailCreateAccount':
          errorMessage = 'ელფოსტით ანგარიშის შექმნა ვერ მოხერხდა'
          break
        case 'Callback':
          errorMessage = 'Callback-ში შეცდომა მოხდა'
          break
        case 'OAuthAccountNotLinked':
          errorMessage = 'ეს Google ანგარიში უკვე დაკავშირებულია სხვა ანგარიშთან'
          break
        case 'EmailSignin':
          errorMessage = 'ელფოსტით შესვლა ვერ მოხერხდა'
          break
        case 'CredentialsSignin':
          errorMessage = 'არასწორი ელფოსტა ან პაროლი'
          break
        case 'SessionRequired':
          errorMessage = 'სესია საჭიროა'
          break
        default:
          errorMessage = `შეცდომა: ${errorParam}`
      }
      
      setError(errorMessage)
      
      // Clean up URL
      router.replace('/auth/signin', { scroll: false })
    }
  }, [searchParams, router])

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

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true)
    setError('')

    try {
      // OAuth providers require redirect, so we redirect to Google's OAuth page
      // The callback will handle the redirect back to the app
      await signIn('google', {
        callbackUrl: '/',
        redirect: true
      })
    } catch (error) {
      setIsGoogleLoading(false)
      setError('შეცდომა Google-ით შესვლისას')
    }
  }

  return (
    <div className="min-h-screen  flex  justify-center py-12 px-4 ">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="text-[16px] text-center md:text-[20px] font-semibold uppercase tracking-widesttext-black">
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
              disabled={isLoading || isGoogleLoading}
              className="w-full md:text-[18px] font-bold text-[16px] bg-[#1B3729] cursor-pointer text-white py-3 px-6 rounded-lg hover:bg-gray-800 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
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

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">ან</span>
          </div>
        </div>

        {/* Google Sign In Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading || isGoogleLoading}
          className="w-full md:text-[18px] text-[16px] font-medium bg-white text-gray-700 py-3 px-6 rounded-lg border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3"
        >
          {isGoogleLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-gray-700 border-t-transparent rounded-full animate-spin"></div>
              <span>შესვლა...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>გააგრძელე Google-ით</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <SignInContent />
    </Suspense>
  )
}
