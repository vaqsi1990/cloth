'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)

  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setMessage('გთხოვთ შეიყვანოთ ელ-ფოსტა')
      return
    }

    setIsLoading(true)
    setMessage('')

    try {
      console.log('Sending password reset request for email:', email)
      
      const response = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      
      const result = await response.json()
  

      if (response.ok) {
        setIsSuccess(true)
        setMessage('პაროლის აღდგენის ლინკი გაიგზავნა თქვენს ელ-ფოსტაზე')
      } else {
        setMessage(result.error || 'შეცდომა მოხდა')
      }
    } catch (error) {
      console.error('Password reset error:', error)
      setMessage('სისტემური შეცდომა მოხდა')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
     
        <h2 className="mt-6 text-center text-3xl font-extrabold text-black">
          პაროლის აღდგენა
        </h2>
        <p className="mt-4 text-center block text-black md:text-[18px] text-[16px]">
          შეიყვანეთ თქვენი ელ-ფოსტა და ჩვენ გამოგიგზავნით პაროლის აღდგენის ლინკს
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {!isSuccess ? (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="block text-black md:text-[20px] text-[18px]">
                  ელ-ფოსტა
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full px-8 py-4 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="შეიყვანეთ ელ-ფოსტა"
                  />
                </div>
              </div>

              {message && (
                <div className={`p-3 rounded-md text-sm ${
                  isSuccess ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {message}
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex w-full text-white cursor-pointer items-center justify-center px-8 py-4 bg-[#034e64]  md:text-[20px] text-[18px] font-bold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  {isLoading ? 'მიმდინარეობს...' : 'გაგზავნა'}
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="mt-4 mb-4 block text-black md:text-[20px] text-[18px]">წარმატებით გაიგზავნა!</h3>
              <p className="mt-2 block text-black md:text-[16px] text-[14px]">
                პაროლის აღდგენის ლინკი გაიგზავნა {email} ელ-ფოსტაზე
              </p>
              <p className="mt-4 block text-black md:text-[16px] text-[14px]">
                გთხოვთ შეამოწმოთ თქვენი ელ-ფოსტა და დააჭიროთ ლინკს
              </p>
            </div>
          )}

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">ან</span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <Link
                href="/auth/signin"
                className="mt-6  md:text-[18px] text-[16px] text-center"
              >
                დაბრუნება შესვლის გვერდზე
              </Link>
            </div>
            
            
          </div>
        </div>
      </div>
    </div>
  )
}
