import NextImage, { type ImageProps } from 'next/image'
import { IMAGE_QUALITY } from '@/lib/image-config'

export default function Image({ quality, ...props }: ImageProps) {
  return <NextImage {...props} quality={quality ?? IMAGE_QUALITY} />
}

export type { ImageProps }
