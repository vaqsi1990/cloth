'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

type ConfirmDialogProps = {
  open: boolean
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export default function ConfirmDialog({
  open,
  message,
  confirmLabel = 'კი',
  cancelLabel = 'არა',
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) {
        onCancel()
      }
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onCancel, loading])

  if (!open || !mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={() => {
        if (!loading) onCancel()
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-message"
      >
        <p
          id="confirm-dialog-message"
          className="text-[16px] sm:text-[18px] text-black text-center"
        >
          {message}
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-lg bg-[#1B3729] px-4 py-2.5 text-[15px] font-semibold text-white transition hover:bg-[#152a20] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? '...' : confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-[15px] font-semibold text-black transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
