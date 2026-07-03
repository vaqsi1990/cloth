'use client'

import {
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type DragEvent,
  type MouseEvent,
  type TouchEvent,
} from 'react'

export type ImageProps = Omit<
  ComponentPropsWithoutRef<'img'>,
  'width' | 'height' | 'src'
> & {
  src: string
  width?: number | `${number}`
  height?: number | `${number}`
  fill?: boolean
  quality?: number
  priority?: boolean
  sizes?: string
  unoptimized?: boolean
  placeholder?: 'blur' | 'empty'
  blurDataURL?: string
  loader?: unknown
  onLoadingComplete?: unknown
  /** When false, allows normal save/drag. Default true. */
  protectFromDownload?: boolean
}

function joinClassNames(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(' ')
}

function preventImageDownload(
  event: MouseEvent | DragEvent | TouchEvent,
) {
  event.preventDefault()
}

const noCalloutStyle = {
  userSelect: 'none',
  WebkitUserSelect: 'none',
  // Vendor-only; not in React's CSSProperties typings.
  WebkitUserDrag: 'none',
  WebkitTouchCallout: 'none',
  touchAction: 'manipulation',
} as CSSProperties

export default function Image({
  src,
  alt = '',
  width,
  height,
  fill,
  className,
  style,
  quality: _quality,
  priority,
  sizes: _sizes,
  unoptimized: _unoptimized,
  placeholder: _placeholder,
  blurDataURL: _blurDataURL,
  loader: _loader,
  onLoadingComplete: _onLoadingComplete,
  protectFromDownload = true,
  loading,
  fetchPriority,
  onContextMenu,
  onDragStart,
  onClick,
  draggable,
  ...rest
}: ImageProps) {
  const protectedStyle: CSSProperties = {
    ...(style as CSSProperties | undefined),
    ...(protectFromDownload ? noCalloutStyle : null),
  }

  const imgClassName = fill
    ? joinClassNames(
        'absolute inset-0 h-full w-full',
        protectFromDownload && 'pointer-events-none',
        className,
      )
    : joinClassNames(protectFromDownload && 'pointer-events-none', className)

  const img = (
    <img
      {...rest}
      src={src}
      alt={alt}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      className={imgClassName}
      style={protectedStyle}
      loading={priority ? 'eager' : loading}
      fetchPriority={priority ? 'high' : fetchPriority}
      draggable={protectFromDownload ? false : draggable}
      onContextMenu={
        protectFromDownload
          ? (event) => {
              preventImageDownload(event)
              onContextMenu?.(event)
            }
          : onContextMenu
      }
      onDragStart={
        protectFromDownload
          ? (event) => {
              preventImageDownload(event)
              onDragStart?.(event)
            }
          : onDragStart
      }
      onClick={protectFromDownload ? undefined : onClick}
    />
  )

  if (!protectFromDownload) {
    return img
  }

  // Transparent overlay sits above the image so mobile long-press
  // does not target the <img> (no "Save Image" menu).
  const shield = (
    <span
      aria-hidden
      data-no-save-image
      className={
        fill
          ? 'product-image-shield absolute inset-0 z-[1] block'
          : 'product-image-shield absolute inset-0 z-[1] block h-full w-full'
      }
      style={noCalloutStyle}
      onContextMenu={preventImageDownload}
      onDragStart={preventImageDownload}
      onClick={onClick}
    />
  )

  if (fill) {
    return (
      <span
        data-no-save-image
        className="product-image-shield absolute inset-0 block overflow-hidden"
        style={noCalloutStyle}
        onContextMenu={preventImageDownload}
      >
        {img}
        {shield}
      </span>
    )
  }

  return (
    <span
      data-no-save-image
      className="product-image-shield relative inline-block max-w-full"
      style={noCalloutStyle}
      onContextMenu={preventImageDownload}
    >
      {img}
      {shield}
    </span>
  )
}
