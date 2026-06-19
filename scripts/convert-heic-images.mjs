import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import convert from 'heic-convert'
import { UTApi, UTFile } from 'uploadthing/server'

const HEIC_BRANDS = new Set(['heic', 'heix', 'hevc', 'heif', 'mif1'])
const dryRun = process.argv.includes('--dry-run')

function isHeicBuffer(bytes) {
  if (bytes.length < 12) return false
  const ftyp = String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7])
  if (ftyp !== 'ftyp') return false
  const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11])
  return HEIC_BRANDS.has(brand)
}

async function convertHeicToJpeg(buffer) {
  const output = await convert({
    buffer: Buffer.from(buffer),
    format: 'JPEG',
    quality: 0.92,
  })
  return Buffer.from(output)
}

function buildJpegName(url) {
  const key = url.split('/').pop() || 'image'
  return `${key}.jpg`
}

const prisma = new PrismaClient()
const utapi = new UTApi()

const productImages = await prisma.productImage.findMany({
  select: { id: true, url: true, productId: true },
})
const variantImages = await prisma.productVariant.findMany({
  where: { imageUrl: { not: null } },
  select: { id: true, imageUrl: true, productId: true },
})

const uniqueUrls = [...new Set([
  ...productImages.map((row) => row.url),
  ...variantImages.map((row) => row.imageUrl).filter(Boolean),
])]

console.log(`Scanning ${uniqueUrls.length} unique image URLs...`)

const urlMap = new Map()
let convertedCount = 0
let skippedCount = 0
let failedCount = 0
const total = uniqueUrls.length

async function fetchFileHeader(url) {
  const response = await fetch(url, { headers: { Range: 'bytes=0-11' } })
  if (response.status === 206 || response.ok) {
    return new Uint8Array(await response.arrayBuffer())
  }
  return null
}

async function fetchFullFile(url) {
  const response = await fetch(url)
  if (!response.ok) return null
  return new Uint8Array(await response.arrayBuffer())
}

for (let index = 0; index < uniqueUrls.length; index += 1) {
  const url = uniqueUrls[index]
  const progress = `[${index + 1}/${total}]`

  try {
    const header = await fetchFileHeader(url)
    if (!header) {
      console.log(`${progress} SKIP fetch failed: ${url}`)
      skippedCount += 1
      continue
    }

    if (!isHeicBuffer(header)) {
      if ((index + 1) % 25 === 0 || index + 1 === total) {
        console.log(`${progress} checked (${skippedCount + convertedCount + failedCount} done, no HEIC yet)`)
      }
      skippedCount += 1
      continue
    }

    console.log(`${progress} HEIC found: ${url}`)
    if (dryRun) {
      convertedCount += 1
      continue
    }

    const buffer = await fetchFullFile(url)
    if (!buffer) {
      console.log(`${progress} SKIP full fetch failed: ${url}`)
      failedCount += 1
      continue
    }

    const jpegBuffer = await convertHeicToJpeg(buffer)
    const file = new UTFile([jpegBuffer], buildJpegName(url), { type: 'image/jpeg' })
    const uploadResult = await utapi.uploadFiles(file)

    const result = Array.isArray(uploadResult) ? uploadResult[0] : uploadResult
    if (result?.error || !result?.data?.ufsUrl) {
      console.error(`UPLOAD failed for ${url}:`, result?.error ?? 'missing url')
      failedCount += 1
      continue
    }

    const newUrl = result.data.ufsUrl
    urlMap.set(url, newUrl)
    convertedCount += 1
    console.log(`${progress} Converted: ${url} -> ${newUrl}`)
  } catch (error) {
    console.error(`${progress} ERROR for ${url}:`, error.message)
    failedCount += 1
  }
}

if (!dryRun && urlMap.size > 0) {
  let updatedProductImages = 0
  let updatedVariants = 0

  for (const [oldUrl, newUrl] of urlMap.entries()) {
    const imageUpdate = await prisma.productImage.updateMany({
      where: { url: oldUrl },
      data: { url: newUrl },
    })
    updatedProductImages += imageUpdate.count

    const variantUpdate = await prisma.productVariant.updateMany({
      where: { imageUrl: oldUrl },
      data: { imageUrl: newUrl },
    })
    updatedVariants += variantUpdate.count
  }

  console.log(JSON.stringify({
    mode: dryRun ? 'dry-run' : 'apply',
    convertedCount,
    skippedCount,
    failedCount,
    updatedProductImages,
    updatedVariants,
    mappings: Object.fromEntries(urlMap),
  }, null, 2))
} else {
  console.log(JSON.stringify({
    mode: dryRun ? 'dry-run' : 'apply',
    convertedCount,
    skippedCount,
    failedCount,
    mappings: Object.fromEntries(urlMap),
  }, null, 2))
}

await prisma.$disconnect()
