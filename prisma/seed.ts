import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const SAMPLE_IMAGES = [
  'https://utfs.io/f/5gUwl0v6lSVj58PBsFv6lSVjYAdRm1uvZheIaJUD3ywnPL2X',
  'https://utfs.io/f/5gUwl0v6lSVjv6piBlVIvsxPDB3pS8bVqlmEQ9raegYfwzhO',
  'https://utfs.io/f/5gUwl0v6lSVjS9HGY1ej3gI5nYyes0QVlB6KX2h7baz4fJxH',
  'https://utfs.io/f/5gUwl0v6lSVjd235zuCUQ0pIxDiZPuWC1Sql9tH6vX3feFk7',
]

function buildSku() {
  return `${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`
}

async function backfillVariantImages() {
  const products = await prisma.product.findMany({
    include: {
      images: { orderBy: { position: 'asc' } },
      variants: { orderBy: { id: 'asc' } },
    },
  })

  let updated = 0

  for (const product of products) {
    const imageUrls = product.images.map((image) => image.url).filter(Boolean)
    if (imageUrls.length === 0) continue

    for (const [index, variant] of product.variants.entries()) {
      if (variant.imageUrl?.trim()) continue

      const hasSkuFields = Boolean(
        variant.color?.trim() || variant.size?.trim(),
      )
      if (!hasSkuFields) continue

      await prisma.productVariant.update({
        where: { id: variant.id },
        data: { imageUrl: imageUrls[index] ?? imageUrls[0] },
      })
      updated += 1
    }
  }

  console.log(`Backfilled imageUrl on ${updated} SKU variant(s)`)
}

async function cleanupSimpleVariantImages() {
  const variants = await prisma.productVariant.findMany({
    where: { imageUrl: { not: null } },
    select: { id: true, color: true, size: true },
  })

  const idsToClear = variants
    .filter((variant) => !variant.color?.trim() && !variant.size?.trim())
    .map((variant) => variant.id)

  if (idsToClear.length === 0) {
    console.log('No simple-product variant imageUrl values to clear')
    return
  }

  await prisma.productVariant.updateMany({
    where: { id: { in: idsToClear } },
    data: { imageUrl: null },
  })

  console.log(`Cleared imageUrl from ${idsToClear.length} simple variant(s)`)
}

async function seedSampleProducts() {
  const existingSimple = await prisma.product.findFirst({
    where: { slug: { startsWith: 'test-single-color-' } },
    select: { id: true, slug: true },
  })
  const existingMulti = await prisma.product.findFirst({
    where: { slug: { startsWith: 'test-multi-color-' } },
    select: { id: true, slug: true },
  })

  if (existingSimple && existingMulti) {
    console.log('Sample products already exist:', {
      simple: existingSimple,
      multi: existingMulti,
    })
    return
  }

  const owner =
    (await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      select: { id: true },
    })) ??
    (await prisma.user.findFirst({
      where: { products: { some: {} } },
      select: { id: true },
    }))

  if (!owner) {
    console.log('No user found for sample products — skipping seed')
    return
  }

  const category = await prisma.category.findFirst({
    where: { slug: 'dresses' },
    select: { id: true },
  })

  const simpleSlug = `test-single-color-${Date.now()}`
  const multiSlug = `test-multi-color-${Date.now()}`

  if (!existingSimple) {
  const simpleProduct = await prisma.product.create({
    data: {
      name: 'ტესტი — ერთფერი პროდუქტი',
      slug: simpleSlug,
      sku: buildSku(),
      description: 'სატესტო პროდუქტი ერთი ფერით და ერთი სურათით',
      stock: 2,
      gender: 'WOMEN',
      color: 'შავი',
      size: 'M',
      sizeSystem: 'EU',
      location: 'თბილისი',
      allowsPickup: true,
      pickupAddress: 'ლილო მოლი, თბილისი',
      isRentable: false,
      status: 'AVAILABLE',
      approvalStatus: 'APPROVED',
      approvedAt: new Date(),
      categoryId: category?.id ?? null,
      userId: owner.id,
      images: {
        create: [{
          url: SAMPLE_IMAGES[0],
          alt: 'ტესტი — ერთფერი პროდუქტი',
          position: 0,
        }],
      },
      variants: {
        create: [{
          color: null,
          size: null,
          sizeSystem: null,
          stock: 2,
          price: 45,
        }],
      },
    },
  })
  console.log('Created simple sample product:', {
    id: simpleProduct.id,
    slug: simpleProduct.slug,
  })
  }

  if (!existingMulti) {
  const multiProduct = await prisma.product.create({
    data: {
      name: 'ტესტი — მრავალფერიანი პროდუქტი',
      slug: multiSlug,
      sku: buildSku(),
      description: 'სატესტო პროდუქტი სამი ფერის ვარიანტით',
      stock: 6,
      gender: 'WOMEN',
      color: 'წითელი',
      size: '38',
      sizeSystem: 'EU',
      location: 'თბილისი',
      allowsPickup: false,
      isRentable: false,
      status: 'AVAILABLE',
      approvalStatus: 'APPROVED',
      approvedAt: new Date(),
      categoryId: category?.id ?? null,
      userId: owner.id,
      images: {
        create: SAMPLE_IMAGES.slice(0, 3).map((url, position) => ({
          url,
          alt: `ტესტი — მრავალფერიანი პროდუქტი ${position + 1}`,
          position,
        })),
      },
      variants: {
        create: [
          {
            color: 'წითელი',
            size: '38',
            sizeSystem: 'EU',
            stock: 2,
            price: 55,
            imageUrl: SAMPLE_IMAGES[0],
          },
          {
            color: 'შავი',
            size: '40',
            sizeSystem: 'EU',
            stock: 2,
            price: 55,
            imageUrl: SAMPLE_IMAGES[1],
          },
          {
            color: 'ყვითელი',
            size: '42',
            sizeSystem: 'EU',
            stock: 2,
            price: 55,
            imageUrl: SAMPLE_IMAGES[2],
          },
        ],
      },
    },
  })
  console.log('Created multi-color sample product:', {
    id: multiProduct.id,
    slug: multiProduct.slug,
  })
  }
}

async function main() {
  await cleanupSimpleVariantImages()
  await backfillVariantImages()
  await seedSampleProducts()
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
