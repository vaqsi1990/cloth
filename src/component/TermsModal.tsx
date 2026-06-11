'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import TermsContent from '@/component/rules/TermsContent'

type TermsModalProps = {
  open: boolean
  onClose: () => void
}

export default function TermsModal({ open, onClose }: TermsModalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  if (!open || !mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="relative flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="terms-modal-title"
      >
        <div className="flex shrink-0 items-center justify-between border-b bg-white px-4 py-3">
          <h3 id="terms-modal-title" className="pr-4 text-lg font-bold text-black">
            წესები და პირობები
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-black transition-colors hover:bg-gray-100"
            aria-label="დახურვა"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8">
          <TermsContent />
        </div>
      </div>
    </div>,
    document.body
  )
}
