'use client'

import React, { useState, useEffect } from 'react'
import { Cookie } from 'lucide-react'
import Link from 'next/link'
import {
  getCookieConsent,
  getCookieConsentSync,
  hasCookieConsent,
  acceptAllCookies,
  rejectCookiesDontSave,
  type CookieConsent as CookieConsentType,
} from '@/utils/cookieConsent'

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false)
  const [preferences, setPreferences] = useState<CookieConsentType>({
    essential: true, // Always required
    performance: false,
    functional: false,
    targeting: false,
    analytics: false,
    timestamp: Date.now(),
  })

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return

    // Load preferences from localStorage first (synchronous)
    const existingSync = getCookieConsentSync()
    if (existingSync) {
      setPreferences(existingSync)
    }

    // Check if user has already given consent
    if (!hasCookieConsent()) {
      // Small delay to ensure smooth page load
      setTimeout(() => {
        setShowBanner(true)
      }, 500)
    } else {
      // Try to load from API and sync
      getCookieConsent().then((existing) => {
        if (existing) {
          setPreferences(existing)
        }
      }).catch(() => {
        // Ignore errors, use localStorage version
      })
    }

    return
  }, [])

  const handleAcceptAll = async () => {
    await acceptAllCookies()
    setShowBanner(false)
  }

  const handleReject = async () => {
    // Do NOT record rejection; just clear any existing record
    await rejectCookiesDontSave()
    setShowBanner(false)
  }

  if (!showBanner) return null

  return (
    <>
      {/* Cookie Consent Banner */}
      {showBanner && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-[#1B3729] shadow-2xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="flex items-start gap-3 flex-1">
                <Cookie className="w-6 h-6 text-[#1B3729] flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    ჩვენ ვიყენებთ Cookies-ს
                  </h3>
                  <p className="text-sm md:text-base text-gray-700 leading-relaxed">
                    ჩვენი ვებგვერდი იყენებს cookies-ს თქვენი გამოცდილების გასაუმჯობესებლად. 
                    ჩვენ ვიცავთ საქართველოს პერსონალური მონაცემთა დაცვის კანონს და GDPR-ს.{' '}
                    <Link 
                      href="/rules#coockies" 
                      className="text-[#1B3729] underline hover:text-[#2d5a47] font-medium"
                    >
                      გაიგეთ მეტი
                    </Link>
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full md:w-auto">
                <button
                  onClick={handleReject}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  უარყოფა
                </button>
                <button
                  onClick={handleAcceptAll}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#1B3729] rounded-lg hover:bg-[#2d5a47] transition-colors"
                >
                  ყველას მიღება
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
