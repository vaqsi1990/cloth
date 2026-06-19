'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { X } from 'lucide-react'
import { UploadButton } from '@/utils/uploadthing'
import UploadLoadingIndicator from '@/component/UploadLoadingIndicator'
import { showToast } from '@/utils/toast'

type VariantImageUploadProps = {
  value?: string
  onChange: (url: string | undefined) => void
  error?: string
}

export default function VariantImageUpload({ value, onChange, error }: VariantImageUploadProps) {
  const [imageUrl, setImageUrl] = useState(value || '')
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    setImageUrl(value || '')
  }, [value])

  const handleUploadComplete = (res: { url: string }[]) => {
    const url = res[0]?.url
    if (!url) {
      setIsUploading(false)
      return
    }
    setImageUrl(url)
    onChange(url)
    setIsUploading(false)
  }

  const handleRemove = () => {
    setImageUrl('')
    onChange(undefined)
  }

  return (
    <div className="relative">
      <label className="block text-[18px] text-black font-medium mb-2">
        სურათი <span className="text-red-600">*</span>
      </label>

      {isUploading && (
        <div className="mb-2 rounded-lg border border-gray-200 bg-white p-4">
          <UploadLoadingIndicator message="სურათი იტვირთება..." />
        </div>
      )}

      {imageUrl ? (
        <div className="relative inline-block">
          <Image
            src={imageUrl}
            alt="ვარიანტის სურათი"
            width={120}
            height={120}
            className="h-28 w-28 rounded-lg border border-gray-200 object-cover"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white"
            aria-label="სურათის წაშლა"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <UploadButton
          className="text-white font-bold py-1 px-3 rounded text-sm"
          endpoint="imageUploader"
          onClientUploadComplete={handleUploadComplete}
          onUploadError={(uploadError: Error) => {
            setIsUploading(false)
            showToast(`შეცდომა ატვირთვისას: ${uploadError.message}`, 'error')
          }}
          onUploadBegin={() => setIsUploading(true)}
          disabled={isUploading}
          content={{
            button: isUploading ? 'იტვირთება...' : 'სურათის ატვირთვა',
            allowedContent: 'PNG, JPG, GIF, WebP',
          }}
        />
      )}

      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  )
}
