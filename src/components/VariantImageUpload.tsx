'use client'

import React, { useEffect, useState } from 'react'
import ImageModal from '@/component/ImageModal'
import { X } from 'lucide-react'
import HeicAwareUploadButton from '@/components/HeicAwareUploadButton'
import UploadLoadingIndicator from '@/component/UploadLoadingIndicator'
import { showToast } from '@/utils/toast'
import { getUploadResultUrl } from '@/lib/upload-result-url'

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

  const handleUploadComplete = (res: Parameters<typeof getUploadResultUrl>[0][]) => {
    const url = res[0] ? getUploadResultUrl(res[0]) : undefined
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

      {imageUrl && (
        <div className="relative mb-2 inline-block">
          <ImageModal
            src={imageUrl}
            alt="ვარიანტის სურათი"
            className="h-28 w-28 rounded-lg border border-gray-200 object-cover"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -right-2 -top-2 z-10 rounded-full bg-red-500 p-1 text-white touch-manipulation"
            aria-label="სურათის წაშლა"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <HeicAwareUploadButton
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
          button: isUploading
            ? 'იტვირთება...'
            : imageUrl
              ? 'სურათის შეცვლა'
              : 'სურათის ატვირთვა',
          allowedContent: imageUrl ? '' : 'PNG, JPG, GIF, WebP',
        }}
      />

      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  )
}
