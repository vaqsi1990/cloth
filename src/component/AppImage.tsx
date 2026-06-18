import {
  type ComponentPropsWithoutRef,
  type CSSProperties,
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
}

function joinClassNames(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(' ')
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
  loading,
  fetchPriority,
  ...rest
}: ImageProps) {
  const imgClassName = fill
    ? joinClassNames('absolute inset-0 h-full w-full', className)
    : className

  return (
    <img
      {...rest}
      src={src}
      alt={alt}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      className={imgClassName}
      style={style as CSSProperties | undefined}
      loading={priority ? 'eager' : loading}
      fetchPriority={priority ? 'high' : fetchPriority}
    />
  )
}
