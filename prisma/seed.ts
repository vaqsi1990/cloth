import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // Read products data from JSON file
  const productsPath = path.join(process.cwd(), 'src', 'data', 'products.json')
  const productsData = JSON.parse(fs.readFileSync(productsPath, 'utf8'))

  // Create categories first
  const categories = [
    { name: 'კაბები', slug: 'dresses' },
    { name: 'ბლუზები', slug: 'tops' },
    { name: 'შარვლები', slug: 'bottoms' },
    { name: 'ზედა ტანსაცმელი', slug: 'outerwear' },
    { name: 'აქსესუარები', slug: 'accessories' },
    { name: 'ფეხსაცმელი', slug: 'shoes' }
  ]

  console.log('📁 Creating categories...')
  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: category
    })
  }

  // Get category mapping
  const categoryMap: { [key: string]: number } = {}
  const dbCategories = await prisma.category.findMany()
  dbCategories.forEach(cat => {
    if (cat.slug === 'dresses') categoryMap['DRESSES'] = cat.id
    if (cat.slug === 'tops') categoryMap['TOPS'] = cat.id
    if (cat.slug === 'bottoms') categoryMap['BOTTOMS'] = cat.id
    if (cat.slug === 'outerwear') categoryMap['OUTERWEAR'] = cat.id
    if (cat.slug === 'accessories') categoryMap['ACCESSORIES'] = cat.id
    if (cat.slug === 'shoes') categoryMap['SHOES'] = cat.id
  })

  console.log('🛍️ Creating products...')
  
  for (const product of productsData.products) {
    // Generate unique slug from name and ID
    const baseSlug = product.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
    const slug = `${baseSlug}-${product.id}`

    try {
      // Delete existing product if it exists
      await prisma.product.deleteMany({
        where: { slug: slug }
      })

      const createdProduct = await prisma.product.create({
        data: {
          name: product.name,
          slug: slug,
          description: product.description || '',
       
     
          isNew: product.isNew || false,
          hasSale: product.hasSale || false,
          rating: product.rating || 0,
          categoryId: categoryMap[product.category] || null,
          sku: `SKU-${product.id}-${Date.now()}`,
          // Create product images
          images: {
            create: product.images?.map((imageUrl: string, index: number) => ({
              url: imageUrl,
              alt: `${product.name} - სურათი ${index + 1}`,
              position: index
            })) || []
          },
          // Create product variants (sizes)
          variants: {
            create: product.sizes?.map((size: string) => ({
              size: size,
              stock: product.stockCount || 0,
              price: product.currentPrice
            })) || []
          }
        }
      })

      console.log(`✅ Created product: ${product.name} (ID: ${product.id})`)
    } catch (error) {
      console.error(`❌ Error creating product ${product.name}:`, error)
    }
  }

  console.log('🎉 Seed completed!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
