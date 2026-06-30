'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import ImageModal from '@/component/ImageModal'
import { X } from 'lucide-react'
import UploadLoadingIndicator from '@/component/UploadLoadingIndicator'
import { showToast } from '@/utils/toast'
import { getUploadResultUrls, type UploadFileResult } from '@/lib/upload-result-url'
import { uploadFiles } from '@/utils/uploadthing'
import { prepareImagesForUpload } from '@/lib/prepare-images-for-upload'

const MAX_FILES_PER_UPLOAD = 4

function normalizeUploadResults(res: unknown): UploadFileResult[] {
  if (!res) return []
  if (Array.isArray(res)) return res as UploadFileResult[]
  return [res as UploadFileResult]
}

type VariantImageUploadProps = {
  value?: string[]
  onChange: (urls: string[]) => void
  error?: string
}

export default function VariantImageUpload({ value, onChange, error }: VariantImageUploadProps) {
  const [imageUrls, setImageUrls] = useState<string[]>(value || [])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null)
  const imageUrlsRef = useRef(imageUrls)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isUploading) {
      const next = value || []
      setImageUrls(next)
      imageUrlsRef.current = next
    }
  }, [value, isUploading])

  const updateImageUrls = useCallback((nextUrls: string[]) => {
    imageUrlsRef.current = nextUrls
    setImageUrls(nextUrls)
    onChange(nextUrls)
  }, [onChange])

  const handleFilePick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (selectedFiles.length === 0) return

    const remainingSlots = MAX_FILES_PER_UPLOAD - imageUrlsRef.current.length
    if (remainingSlots <= 0) {
      showToast(`მაქსიმუმ ${MAX_FILES_PER_UPLOAD} სურათი შეიძლება ერთ ფერზე`, 'error')
      return
    }

    const filesToUpload = selectedFiles.slice(0, remainingSlots)
    if (selectedFiles.length > remainingSlots) {
      showToast(
        `ერთ ფერზე მაქსიმუმ ${MAX_FILES_PER_UPLOAD} სურათია შესაძლებელი`,
        'error',
      )
    }

    setIsUploading(true)
    setUploadProgress({ current: 0, total: filesToUpload.length })

    const initialImageCount = imageUrlsRef.current.length
    let failedCount = 0

    try {
      const prepared = await prepareImagesForUpload(filesToUpload)

      for (let index = 0; index < prepared.length; index++) {
        const file = prepared[index]
        setUploadProgress({ current: index + 1, total: prepared.length })

        try {
          const res = await uploadFiles('imageUploader', { files: [file] })
          const urls = getUploadResultUrls(normalizeUploadResults(res))
          updateImageUrls([...imageUrlsRef.current, ...urls])
        } catch (uploadError) {
          failedCount += 1
          const message = uploadError instanceof Error ? uploadError.message : 'ატვირთვა ვერ მოხერხდა'
          showToast(`შეცდომა ატვირთვისას: ${message}`, 'error')
        }
      }

      const uploadedCount = imageUrlsRef.current.length - initialImageCount
      if (uploadedCount > 0 && failedCount === 0) {
        showToast(
          uploadedCount === 1 ? 'სურათი აიტვირთა' : `${uploadedCount} სურათი აიტვირთა`,
          'success',
        )
      }
    } catch (pickError) {
      const message = pickError instanceof Error ? pickError.message : 'ატვირთვა ვერ მოხერხდა'
      showToast(`შეცდომა ატვირთვისას: ${message}`, 'error')
    } finally {
      setIsUploading(false)
      setUploadProgress(null)
    }
  }

  const handleRemove = (indexToDelete: number) => {
    updateImageUrls(imageUrlsRef.current.filter((_, index) => index !== indexToDelete))
  }

  const loadingMessage = uploadProgress
    ? `სურათები იტვირთება... (${uploadProgress.current}/${uploadProgress.total})`
    : 'სურათები იტვირთება...'

  const canUploadMore = imageUrls.length < MAX_FILES_PER_UPLOAD

  return (
    <div className="relative">
      <label className="block text-[18px] text-black font-medium mb-2">
        სურათები <span className="text-red-600">*</span>
      </label>

      {isUploading && (
        <div className="mb-2 rounded-lg border border-gray-200 bg-white p-4">
          <UploadLoadingIndicator message={loadingMessage} />
        </div>
      )}

      {imageUrls.length > 0 && (
        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {imageUrls.map((url, index) => (
            <div key={`${url}-${index}`} className="relative inline-block">
              <ImageModal
                src={url}
                alt={`ვარიანტის სურათი ${index + 1}`}
                className="h-28 w-full rounded-lg border border-gray-200 object-cover"
              />
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="absolute -right-2 -top-2 z-10 rounded-full bg-red-500 p-1 text-white touch-manipulation"
                aria-label="სურათის წაშლა"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        disabled={isUploading || !canUploadMore}
        onChange={handleFilePick}
      />

      {canUploadMore && (
        <>
          <button
            type="button"
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
            className={`bg-[#1B3729] hover:bg-[#152c21] text-white font-bold py-2 px-4 rounded md:text-[18px] text-[16px] w-full sm:w-auto ${
              isUploading ? 'opacity-60 cursor-not-allowed' : ''
            }`}
          >
            {isUploading ? 'იტვირთება...' : imageUrls.length > 0 ? 'სურათების დამატება' : 'სურათების ატვირთვა'}
          </button>
          <p className="text-gray-500 text-sm mt-1">
            PNG, JPG, GIF, WebP — {MAX_FILES_PER_UPLOAD} სურათამდე ერთ ფერზე
          </p>
        </>
      )}

      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  )
}
