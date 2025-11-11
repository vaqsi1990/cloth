import { PrismaClient, Prisma } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

function fixDateFields<T extends Record<string, any>>(obj: T): T {
  const fixed: Record<string, any> = {}
  for (const key in obj) {
    const value = obj[key]
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2} /.test(value)) {
      fixed[key] = value.replace(' ', 'T') + 'Z'
    } else {
      fixed[key] = value
    }
  }
  return fixed as T
}

function toSlug(value: unknown): string {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
  }
  return ''
}

async function main() {
  console.log('🌱 Seeding categories from item/Category.json ...')

  const itemDir = path.join(process.cwd(), 'item')
  const file = path.join(itemDir, 'Category.json')

  if (!fs.existsSync(file)) {
    console.warn('⚠️ item/Category.json not found, skipping category seed')
    return
  }

  const raw = fs.readFileSync(file, 'utf8')
  let categories: any[] = []

  try {
    const parsed = JSON.parse(raw)
    categories = Array.isArray(parsed) ? parsed : parsed?.data ?? []
  } catch (error) {
    console.error('⚠️ Failed to parse item/Category.json', error)
    return
  }

  if (!categories.length) {
    console.warn('⚠️ No categories found in item/Category.json, skipping seed')
    return
  }

  console.log(`🏷️ Inserting categories: ${categories.length}`)

  for (const c of categories) {
    const fixed = fixDateFields(c) as {
      id?: number | string
      name?: string
      slug?: string
    }

    const id = fixed.id !== undefined ? Number(fixed.id) : undefined
    const slugFromSource = toSlug(fixed.slug)
    const fallbackSlug = toSlug(fixed.name)
    const slug = slugFromSource || fallbackSlug

    if (id === undefined && !slug) {
      console.warn('⚠️ Skipping category without usable slug or id', fixed)
      continue
    }

    const where: Prisma.CategoryWhereUniqueInput = id !== undefined
      ? { id }
      : { slug }

    const finalSlug = slug || (fixed.name ? toSlug(fixed.name) : `category-${id ?? Date.now()}`)

    await prisma.category.upsert({
      where,
      update: {
        name: fixed.name ?? finalSlug,
        slug: finalSlug,
      },
      create: {
        ...(id !== undefined ? { id } : {}),
        name: fixed.name ?? finalSlug,
        slug: finalSlug,
      },
    })
  }

  console.log('🎉 Category seed completed!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
