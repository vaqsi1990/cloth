import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

// ✅ Helper — ასწორებს ყველა თარიღის ფორმატს ISO ფორმატში
function fixDateFields<T extends Record<string, any>>(obj: T): T {
  const fixed: Record<string, any> = {}
  for (const key in obj) {
    const value = obj[key]
    // თუ თარიღია ფორმატში "2025-10-21 16:14:23.878"
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2} /.test(value)) {
      fixed[key] = value.replace(' ', 'T') + 'Z'
    } else {
      fixed[key] = value
    }
  }
  return fixed as T
}

async function main() {
  console.log('🌱 Starting seed from item/*.json ...')

  const itemDir = path.join(process.cwd(), 'item')
  const readJson = (filename: string) => {
    const file = path.join(itemDir, filename)
    if (!fs.existsSync(file)) return []
    const raw = fs.readFileSync(file, 'utf8')
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : parsed?.data ?? []
    } catch (e) {
      console.warn(`⚠️ Could not parse ${filename}:`, e)
      return []
    }
  }

  const users = readJson('User.json')
  const categories = readJson('Category.json')
  const products = readJson('Product.json')
  const productImages = readJson('ProductImage.json')
  const productVariants = readJson('ProductVariant.json')
  const priceTiers = readJson('RentalPriceTier.json')

  // 👤 Users
  if (users.length) {
    console.log(`👤 Inserting users: ${users.length}`)
    for (const u of users) {
      const fixed = fixDateFields(u)
      const where: any = fixed.email ? { email: fixed.email } : { id: fixed.id }
      await prisma.user.upsert({
        where,
        update: fixed,
        create: fixed,
      })
    }
  }

  // 🏷️ Categories
  if (categories.length) {
    console.log(`🏷️ Inserting categories: ${categories.length}`)
    for (const c of categories) {
      const fixed = fixDateFields(c)
      const where: any = fixed.slug ? { slug: fixed.slug } : { id: fixed.id }
      await prisma.category.upsert({
        where,
        update: fixed,
        create: fixed,
      })
    }
  }

  // 🛍️ Products
  if (products.length) {
    console.log(`🛍️ Inserting products: ${products.length}`)
    for (const p of products) {
      const fixed = fixDateFields(p)
      const where: any = fixed.slug ? { slug: fixed.slug } : { id: fixed.id }
      await prisma.product.upsert({
        where,
        update: fixed,
        create: fixed,
      })
    }
  }

  // 🖼️ Product Images
  if (productImages.length) {
    console.log(`🖼️ Inserting product images: ${productImages.length}`)
    const fixedImages = productImages.map((img: any) => fixDateFields(img))
    await prisma.productImage.createMany({
      data: fixedImages as any[],
      skipDuplicates: true,
    })
  }

  // 📦 Product Variants
  if (productVariants.length) {
    console.log(`📦 Inserting product variants: ${productVariants.length}`)
    const fixedVariants = productVariants.map((v: any) => fixDateFields(v))
    await prisma.productVariant.createMany({
      data: fixedVariants as any[],
      skipDuplicates: true,
    })
  }

  // 💵 Rental Price Tiers
  if (priceTiers.length) {
    console.log(`💵 Inserting rental price tiers: ${priceTiers.length}`)
    const fixedTiers = priceTiers.map((t: any) => fixDateFields(t))
    await prisma.rentalPriceTier.createMany({
      data: fixedTiers as any[],
      skipDuplicates: true,
    })
  }

  console.log('🎉 Seed from item completed!')
}

// 🚀 Run the seeding
main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
