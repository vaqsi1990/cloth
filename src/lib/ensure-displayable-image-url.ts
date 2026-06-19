import convert from 'heic-convert'
import { UTApi, UTFile } from 'uploadthing/server'
import { buildJpegFileName, isHeicBuffer } from '@/lib/heic'

function fileNameFromUrl(url: string, fallback: string): string {
  try {
    const segment = new URL(url).pathname.split('/').pop()
    return segment?.trim() || fallback
  } catch {
    return fallback
  }
}

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
  const jpegName = buildJpegFileName(originalName || fileNameFromUrl(url, 'image'))
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

export async function ensureDisplayableImageUrls(urls: string[]): Promise<string[]> {
  const uniqueUrls = [...new Set(urls.filter(Boolean))]
  const urlMap = new Map<string, string>()

  for (const url of uniqueUrls) {
    urlMap.set(
      url,
      await ensureDisplayableImageUrl(url, fileNameFromUrl(url, 'image.jpg')),
    )
  }

  return urls.map((url) => urlMap.get(url) ?? url)
}

export async function buildDisplayableUrlMap(urls: Array<string | null | undefined>) {
  const uniqueUrls = [...new Set(urls.map((url) => url?.trim()).filter(Boolean) as string[])]
  const normalizedUrls = await ensureDisplayableImageUrls(uniqueUrls)
  return new Map(uniqueUrls.map((url, index) => [url, normalizedUrls[index]]))
}

export function applyDisplayableUrlMap(
  url: string | null | undefined,
  urlMap: Map<string, string>,
) {
  const trimmed = url?.trim()
  if (!trimmed) {
    return url
  }

  return urlMap.get(trimmed) ?? trimmed
}

export async function ensureDisplayableVariantImageUrl(
  imageUrl: string | null | undefined,
): Promise<string | null | undefined> {
  const trimmed = imageUrl?.trim()
  if (!trimmed) {
    return imageUrl
  }

  return ensureDisplayableImageUrl(trimmed, fileNameFromUrl(trimmed, 'variant.jpg'))
}
