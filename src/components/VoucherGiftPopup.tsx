'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import { X, Copy } from 'lucide-react'
import { showToast } from '@/utils/toast'

interface PopupVoucher {
  id: number
  code: string
  discountAmount: number
  minOrderAmount: number | null
  expiresAt: string | null
  message: string | null
}

function formatDiscount(amount: number) {
  return amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2)
}

export default function VoucherGiftPopup() {
  const { status } = useSession()
  const [voucher, setVoucher] = useState<PopupVoucher | null>(null)
  const [loading, setLoading] = useState(false)
  const [dismissing, setDismissing] = useState(false)

  const fetchPopup = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/user/vouchers/popup')
      const data = await response.json()
      if (data.success && data.voucher) {
        setVoucher(data.voucher)
      }
    } catch {
      // silently ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchPopup()
    }
  }, [status, fetchPopup])

  const dismiss = async () => {
    if (!voucher || dismissing) return
    setDismissing(true)
    try {
      await fetch('/api/user/vouchers/popup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: voucher.id }),
      })
    } catch {
      // still close locally
    } finally {
      setVoucher(null)
      setDismissing(false)
    }
  }

  const copyCode = () => {
    if (!voucher) return
    navigator.clipboard.writeText(voucher.code)
    showToast('კოდი დაკოპირდა', 'success')
  }

  if (loading || !voucher) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/65"
      onClick={dismiss}
    >
      <div
        className="relative w-full max-w-[320px]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={dismiss}
          disabled={dismissing}
          className="absolute -top-2 -right-2 z-20 w-9 h-9 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
          aria-label="დახურვა"
        >
          <X className="w-5 h-5 text-gray-700" />
        </button>

        <div className="relative w-full">
          <Image
            src="/images/voucher-gift-popup-v2.png"
            alt="ვაუჩერი"
            width={720}
            height={1080}
            className="w-full h-auto block"
            priority
            unoptimized
          />

          <div className="absolute inset-0">
            <div className="absolute left-1/2 -translate-x-1/2 top-[50%] w-[40%] h-[7.5%] flex items-center justify-center">
              <p className="text-black text-[clamp(20px,7vw,30px)] font-bold leading-none tracking-tight">
                ₾{formatDiscount(voucher.discountAmount)}
              </p>
            </div>

            <div
              
              className="absolute left-1/2 -translate-x-1/2 top-[63%] w-[48%] h-[5%] flex items-center justify-center gap-1.5 hover:opacity-80 transition-opacity"
            >
              <span className="font-mono font-bold text-white text-[clamp(11px,3.5vw,14px)] tracking-[0.15em]">
                {voucher.code}
              </span>
             
            </div>

            {voucher.message && (
              <p className="absolute left-1/2 -translate-x-1/2 bottom-[16%] w-[72%] text-center text-black font-semibold text-[15px] leading-snug">
                {voucher.message}
              </p>
            )}

            {voucher.expiresAt && (
              <p className="absolute left-1/2 -translate-x-1/2 bottom-[10.5%] w-[65%] text-center text-black/80 font-medium text-[15px]">
                ვადა:{' '}
                {new Date(voucher.expiresAt).toLocaleDateString('ka-GE')}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={dismiss}
          disabled={dismissing}
          className="mt-4 w-full py-3 bg-[#1B3729] text-white rounded-xl font-semibold text-sm hover:bg-[#152a1f] transition-colors disabled:opacity-50"
        >
          {dismissing ? '...' : 'გასაგებია'}
        </button>
      </div>
    </div>
  )
}
