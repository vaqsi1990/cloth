import convert from 'heic-convert'
import { UTApi, UTFile } from 'uploadthing/server'
import { buildJpegFileName, isHeicBuffer } from '@/lib/heic'

export async function ensureDisplayableImageUrl(
  url: string,
  originalName: string,
  fileKey?: string,
): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`ატვირთული სურათის ჩამოტვირთვა ვერ მოხერხდა (${response.status})`)
  }

  const buffer = new Uint8Array(await response.arrayBuffer())
  if (!isHeicBuffer(buffer)) {
    return url
  }

  const jpegBuffer = await convert({
    buffer: Buffer.from(buffer),
    format: 'JPEG',
    quality: 0.92,
  })

  const utapi = new UTApi()
  const jpegName = buildJpegFileName(originalName)
  const file = new UTFile([Buffer.from(jpegBuffer)], jpegName, { type: 'image/jpeg' })
  const uploadResult = await utapi.uploadFiles(file)

  const result = Array.isArray(uploadResult) ? uploadResult[0] : uploadResult
  const newUrl = result?.data?.ufsUrl
  if (result?.error || !newUrl) {
    throw new Error('iPhone ფოტოს (HEIC) კონვერტაცია ვერ მოხერხდა')
  }

  if (fileKey) {
    try {
      await utapi.deleteFiles(fileKey)
    } catch {
      // Non-fatal: converted JPEG is already available.
    }
  }

  return newUrl
}
