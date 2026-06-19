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

const query = process.argv[2] || '1781896617736352'
const prisma = new PrismaClient()

let product = await prisma.product.findFirst({
  where: { sku: query },
  include: { images: { orderBy: { position: 'asc' } }, variants: true },
})

if (!product) {
  const recent = await prisma.product.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { images: { orderBy: { position: 'asc' } } },
  })
  console.log('Product not found for SKU:', query)
  console.log('Recent products:')
  console.log(JSON.stringify(recent.map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    createdAt: p.createdAt,
    images: p.images,
  })), null, 2))
  process.exit(1)
}

console.log('Product:', product.id, product.name, product.sku)
console.log('Images:', product.images)
console.log('Variant images:', product.variants.map((v) => v.imageUrl).filter(Boolean))

for (const image of product.images) {
  try {
    const response = await fetch(image.url)
    console.log('\nURL:', image.url)
    console.log('HTTP status:', response.status)
    console.log('Content-Type:', response.headers.get('content-type'))
    const buffer = new Uint8Array(await response.arrayBuffer())
    console.log('Size bytes:', buffer.length)
    console.log('Is HEIC:', isHeicBuffer(buffer))
    console.log('Magic bytes:', Array.from(buffer.slice(0, 12)).map((b) => b.toString(16).padStart(2, '0')).join(' '))
  } catch (error) {
    console.error('Fetch error:', error.message)
  }
}

await prisma.$disconnect()
