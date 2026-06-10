'use client'

import React from 'react'
import { X } from 'lucide-react'

type TermsModalProps = {
  open: boolean
  onClose: () => void
}

export default function TermsModal({ open, onClose }: TermsModalProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="relative flex h-[85vh] w-full max-w-4xl flex-col rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-lg font-bold text-black">წესები და პირობები</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-black hover:bg-gray-100"
            aria-label="დახურვა"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <iframe
          src="/rules?tab=terms"
          title="წესები და პირობები"
          className="w-full flex-1 rounded-b-xl border-0"
        />
      </div>
    </div>
  )
}
