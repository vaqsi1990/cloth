'use client'

import { useRef } from 'react'
import { ImageIcon } from 'lucide-react'
import { useUploadThing } from '@/utils/uploadthing'
import { prepareImagesForUpload } from '@/lib/prepare-images-for-upload'
import { getUploadResultUrls } from '@/lib/upload-result-url'
import { showToast } from '@/utils/toast'

type ChatImageUploadButtonProps = {
  onImageReady: (url: string) => void
  disabled?: boolean
  className?: string
}

export default function ChatImageUploadButton({
  onImageReady,
  disabled = false,
  className = '',
}: ChatImageUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const { startUpload, isUploading } = useUploadThing('imageUploader', {
    onClientUploadComplete: (res) => {
      try {
        const urls = getUploadResultUrls(res)
        if (urls[0]) {
          onImageReady(urls[0])
          return
        }
      } catch (error) {
        console.error('Chat image upload parse failed:', error)
      }
      showToast('ფოტოს URL ვერ მოიძებნა', 'error')
    },
    onUploadError: (error) => {
      showToast(`შეცდომა ატვირთვისას: ${error.message}`, 'error')
    },
  })

  const handlePick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (files.length === 0) return

    try {
      const prepared = await prepareImagesForUpload(files.slice(0, 1))
      await startUpload(prepared)
    } catch (error) {
      console.error('Chat image upload failed:', error)
      showToast('შეცდომა ატვირთვისას', 'error')
    }
  }

  const isDisabled = disabled || isUploading

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={isDisabled}
        onChange={handlePick}
      />
      <button
        type="button"
        title="ფოტოს ატვირთვა"
        aria-label="ფოტოს ატვირთვა"
        disabled={isDisabled}
        onClick={() => inputRef.current?.click()}
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white text-[#1B3729] transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      >
        {isUploading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#1B3729] border-t-transparent" />
        ) : (
          <ImageIcon className="h-4 w-4" />
        )}
      </button>
    </>
  )
}
