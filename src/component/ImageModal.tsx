'use client'

import { useState } from 'react'
import Image from 'next/image'
interface ImageModalProps {
  src: string
  alt: string
  className?: string
}

export default function ImageModal({ src, alt, className = '' }: ImageModalProps) {
  const [isOpen, setIsOpen] = useState(false)

  const openModal = () => setIsOpen(true)
  const closeModal = () => setIsOpen(false)

  return (
    <>
      {/* Clickable Image */}
      <Image
        width={580}
        height={580}
        src={src}
        alt={alt}
        className={`cursor-pointer transition-transform hover:scale-105 ${className}`}
        onClick={openModal}
      />

      {/* Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
          <div className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center">
            {/* Close Button */}
            <div
              onClick={closeModal}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 text-3xl font-bold z-10 bg-black bg-opacity-50 rounded-full w-10 h-10 flex items-center justify-center cursor-pointer"
            >
              ✕
            </div>

            {/* Image */}
            <Image
              width={580}
              height={580}
              src={src}
              alt={alt}
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

    </>
  )
}
