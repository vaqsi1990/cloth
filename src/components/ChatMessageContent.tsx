'use client'

import ImageModal from '@/component/ImageModal'

type ChatMessageContentProps = {
  content: string
  imageUrl?: string | null
  textClassName?: string
  imageClassName?: string
}

export default function ChatMessageContent({
  content,
  imageUrl,
  textClassName = 'break-words',
  imageClassName = 'mt-2 max-h-56 w-full max-w-xs rounded-md object-cover',
}: ChatMessageContentProps) {
  const text = content.trim()
  const hasImage = Boolean(imageUrl)

  if (!text && !hasImage) {
    return null
  }

  return (
    <div className="space-y-2">
      {text ? <p className={textClassName}>{text}</p> : null}
      {hasImage && imageUrl ? (
        <ImageModal
          src={imageUrl}
          alt="ჩატის ფოტო"
          className={imageClassName}
        />
      ) : null}
    </div>
  )
}
