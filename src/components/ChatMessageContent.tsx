'use client'

import { useState } from 'react'

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
  imageClassName = 'mt-2 block max-h-56 w-full max-w-[220px] rounded-md border border-black/10 object-cover',
}: ChatMessageContentProps) {
  const text = content.trim()
  const hasImage = Boolean(imageUrl)
  const [imageFailed, setImageFailed] = useState(false)

  if (!text && !hasImage) {
    return null
  }

  return (
    <div className="space-y-2">
      {text ? <p className={textClassName}>{text}</p> : null}
      {hasImage && imageUrl ? (
        <div className="space-y-1">
          {!text ? (
            <p className={textClassName}>📷 ფოტო</p>
          ) : null}
          {imageFailed ? (
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${textClassName} underline`}
            >
              ფოტოს ნახვა
            </a>
          ) : (
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="ჩატის ფოტო"
                className={imageClassName}
                loading="lazy"
                onError={() => setImageFailed(true)}
              />
            </a>
          )}
        </div>
      ) : null}
    </div>
  )
}
