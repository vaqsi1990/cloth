import {
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type DragEvent,
  type MouseEvent,
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

function preventImageDownload(event: MouseEvent | DragEvent) {
  event.preventDefault()
}

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
  draggable,
  ...rest
}: ImageProps) {
  const imgClassName = fill
    ? joinClassNames('absolute inset-0 h-full w-full', className)
    : className

  const protectedStyle: CSSProperties | undefined = protectFromDownload
    ? {
        ...(style as CSSProperties | undefined),
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitUserDrag: 'none',
        WebkitTouchCallout: 'none',
      }
    : (style as CSSProperties | undefined)

  return (
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
    />
  )
}
