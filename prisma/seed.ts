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

 
  const categories = readJson('Category.json')




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




  // 📦 Product Variants


  // 💵 Rental Price Tiers

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
