'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from '@/component/AppImage'
import { PRODUCT_IMAGE_QUALITY, UPLOAD_PREVIEW_QUALITY } from '@/lib/image-config'

interface ImageModalProps {
  src: string
  alt: string
  className?: string
}

export default function ImageModal({ src, alt, className = '' }: ImageModalProps) {
  const [isOpen, setIsOpen] = useState(false)

  const openModal = useCallback(() => setIsOpen(true), [])
  const closeModal = useCallback(() => setIsOpen(false), [])

  useEffect(() => {
    if (!isOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeModal()
      }
    }

    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [closeModal, isOpen])

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="block w-full max-w-full cursor-pointer touch-manipulation border-0 bg-transparent p-0 text-left"
        aria-label={`${alt} — გადიდება`}
      >
        <Image
          width={1200}
          height={1200}
          src={src}
          alt={alt}
          quality={UPLOAD_PREVIEW_QUALITY}
          className={`pointer-events-none transition-transform hover:scale-105 ${className}`}
        />
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-label={alt}
        >
          <div className="relative flex max-h-[90vh] max-w-[90vw] items-center justify-center">
            <button
              type="button"
              onClick={closeModal}
              className="absolute -top-12 right-0 z-10 flex h-10 w-10 cursor-pointer touch-manipulation items-center justify-center rounded-full bg-black/60 text-3xl font-bold text-white hover:text-gray-300"
              aria-label="დახურვა"
            >
              ✕
            </button>

            <Image
              width={1600}
              height={1600}
              src={src}
              alt={alt}
              quality={PRODUCT_IMAGE_QUALITY}
              className="max-h-[90vh] max-w-full rounded-lg object-contain shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  )
}
