'use client'

import { X } from 'lucide-react'

type ChatPendingImagePreviewProps = {
  imageUrl: string
  onRemove: () => void
}

export default function ChatPendingImagePreview({
  imageUrl,
  onRemove,
}: ChatPendingImagePreviewProps) {
  return (
    <div className="relative mb-3 block w-fit max-w-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt="მოსამზადებელი ფოტო"
        className="block h-20 w-20 rounded-lg border border-gray-200 object-cover"
      />
      <button
        type="button"
        onClick={onRemove}
        className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black text-white shadow-md"
        aria-label="ფოტოს წაშლა"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
