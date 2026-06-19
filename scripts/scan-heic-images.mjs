import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const HEIC_BRANDS = new Set(['heic', 'heix', 'hevc', 'heif', 'mif1'])

function isHeicBuffer(bytes) {
  if (bytes.length < 12) return false
  const ftyp = String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7])
  if (ftyp !== 'ftyp') return false
  const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11])
  return HEIC_BRANDS.has(brand)
}

const prisma = new PrismaClient()

const productImages = await prisma.productImage.findMany({ select: { id: true, url: true, productId: true } })
const variantImages = await prisma.productVariant.findMany({
  where: { imageUrl: { not: null } },
  select: { id: true, imageUrl: true, productId: true },
})

const uniqueUrls = [...new Set([
  ...productImages.map((row) => row.url),
  ...variantImages.map((row) => row.imageUrl).filter(Boolean),
])]

const heicUrls = []

for (const url of uniqueUrls) {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      console.log('FETCH_FAIL', url, response.status)
      continue
    }
    const buffer = new Uint8Array(await response.arrayBuffer())
    if (isHeicBuffer(buffer)) {
      heicUrls.push({ url, bytes: buffer.length })
    }
  } catch (error) {
    console.log('FETCH_ERROR', url, error.message)
  }
}

console.log(JSON.stringify({
  totalUniqueUrls: uniqueUrls.length,
  heicCount: heicUrls.length,
  heicUrls,
}, null, 2))

await prisma.$disconnect()
