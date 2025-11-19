import { PrismaClient, Prisma } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()
const ITEM_DIR = path.join(process.cwd(), 'item')

type JsonRecord = Record<string, any>

function fixDateFields<T extends JsonRecord>(obj: T): T {
  const fixed: JsonRecord = {}
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

function loadJsonArray<T = JsonRecord>(fileName: string): T[] {
  const filePath = path.join(ITEM_DIR, fileName)
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️ ${fileName} not found, skipping seed for this entity`)
    return []
  }

  const raw = fs.readFileSync(filePath, 'utf8')
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed as T[]
    if (Array.isArray(parsed?.data)) return parsed.data as T[]
    console.warn(`⚠️ ${fileName} does not contain an array, skipping`)
    return []
  } catch (error) {
    console.error(`⚠️ Failed to parse ${fileName}`, error)
    return []
  }
}

const parseDate = (value?: string | null) => {
  if (!value) return undefined
  const normalized = /^\d{4}-\d{2}-\d{2} /.test(value)
    ? value.replace(' ', 'T') + 'Z'
    : value
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? undefined : date
}

const parseDateOrNull = (value?: string | null) => parseDate(value) ?? null

const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  const num = Number(value)
  return Number.isNaN(num) ? null : num
}

async function seedCategories() {
  console.log('🌱 Seeding categories from item/Category.json ...')
  const categories = loadJsonArray('Category.json')

  if (!categories.length) {
    console.warn('⚠️ No categories found, skipping category seed')
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

  console.log('✅ Category seed completed!')
}

async function seedUsers() {
  console.log('🌱 Seeding users from item/User.json ...')
  const users = loadJsonArray('User.json')

  if (!users.length) {
    console.warn('⚠️ No users found, skipping user seed')
    return
  }

  for (const entry of users) {
    const user = fixDateFields(entry)
    const baseData = {
      email: user.email,
      name: user.name ?? null,
      lastName: user.lastName ?? null,
      phone: user.phone ?? null,
      location: user.location ?? null,
      address: user.address ?? null,
      postalIndex: user.postalIndex ?? null,
      gender: user.gender ?? null,
      dateOfBirth: parseDateOrNull(user.dateOfBirth),
      personalId: user.personalId ?? null,
      password: user.password ?? null,
      role: user.role ?? 'USER',
      code: user.code,
      emailVerified: parseDateOrNull(user.emailVerified),
      image: user.image ?? null,
      banned: Boolean(user.banned),
      banReason: user.banReason ?? null,
      bannedAt: parseDateOrNull(user.bannedAt),
      blocked: Boolean(user.blocked),
      verified: Boolean(user.verified),
    }

    const createData = {
      id: user.id,
      ...baseData,
      createdAt: parseDate(user.createdAt),
      updatedAt: parseDate(user.updatedAt),
    }

    const updateData = {
      ...baseData,
      updatedAt: parseDate(user.updatedAt),
    }

    await prisma.user.upsert({
      where: { id: user.id },
      update: updateData,
      create: createData,
    })
  }

  console.log('✅ User seed completed!')
}

async function seedProducts() {
  console.log('🌱 Seeding products from item/Product.json ...')
  const products = loadJsonArray('Product.json')

  if (!products.length) {
    console.warn('⚠️ No products found, skipping product seed')
    return
  }

  for (const entry of products) {
    const product = fixDateFields(entry)
    const ratingNumber =
      typeof product.rating === 'number'
        ? product.rating
        : toNullableNumber(product.rating) ?? 0
    const discountNumber = toNullableNumber(product.discount)
    const pricePerDay = toNullableNumber(product.pricePerDay)
    const maxRentalDays = toNullableNumber(product.maxRentalDays)
    const deposit = toNullableNumber(product.deposit)
    const categoryId = toNullableNumber(product.categoryId)

    const baseData = {
      name: product.name,
      slug: product.slug,
      description: product.description ?? null,
      brand: product.brand ?? null,
      sku: product.sku ?? null,
      gender: product.gender ?? 'UNISEX',
      color: product.color ?? null,
      location: product.location ?? null,
      sizeSystem: product.sizeSystem ?? null,
      size: product.size ?? null,
      isNew: Boolean(product.isNew),
      discount: discountNumber,
      rating: ratingNumber,
      isRentable: product.isRentable ?? false,
      pricePerDay,
      maxRentalDays,
      deposit,
      status: product.status ?? 'AVAILABLE',
      categoryId: categoryId ?? null,
      userId: product.userId ?? null,
      approvalStatus: 'APPROVED',
      rejectionReason: null,
      approvedAt: parseDate(product.updatedAt) ?? new Date(),
    }

    const createData = {
      id: product.id,
      ...baseData,
      createdAt: parseDate(product.createdAt),
      updatedAt: parseDate(product.updatedAt),
    }

    const updateData = {
      ...baseData,
      updatedAt: parseDate(product.updatedAt),
    }

    await prisma.product.upsert({
      where: { id: product.id },
      update: updateData,
      create: createData,
    })
  }

  console.log('✅ Product seed completed!')
}

async function seedProductVariants() {
  console.log('🌱 Seeding product variants from item/ProductVariant.json ...')
  const variants = loadJsonArray('ProductVariant.json')

  if (!variants.length) {
    console.warn('⚠️ No product variants found, skipping variant seed')
    return
  }

  for (const entry of variants) {
    const variant = fixDateFields(entry)
    const baseData = {
      productId: variant.productId,
      size: variant.size ?? null,
      stock: typeof variant.stock === 'number' ? variant.stock : Number(variant.stock ?? 0),
      sku: variant.sku ?? null,
      price: typeof variant.price === 'number' ? variant.price : Number(variant.price ?? 0),
    }

    await prisma.productVariant.upsert({
      where: { id: variant.id },
      update: {
        ...baseData,
        updatedAt: parseDate(variant.updatedAt),
      },
      create: {
        id: variant.id,
        ...baseData,
        createdAt: parseDate(variant.createdAt),
        updatedAt: parseDate(variant.updatedAt),
      },
    })
  }

  console.log('✅ Product variant seed completed!')
}

async function seedProductImages() {
  console.log('🌱 Seeding product images from item/ProductImage.json ...')
  const images = loadJsonArray('ProductImage.json')

  if (!images.length) {
    console.warn('⚠️ No product images found, skipping image seed')
    return
  }

  for (const entry of images) {
    const image = entry as {
      id: number
      productId: number
      url: string
      alt?: string | null
      position?: number
    }

    await prisma.productImage.upsert({
      where: { id: image.id },
      update: {
        productId: image.productId,
        url: image.url,
        alt: image.alt ?? null,
        position: image.position ?? 0,
      },
      create: {
        id: image.id,
        productId: image.productId,
        url: image.url,
        alt: image.alt ?? null,
        position: image.position ?? 0,
      },
    })
  }

  console.log('✅ Product image seed completed!')
}

async function seedRentalPriceTiers() {
  console.log('🌱 Seeding rental price tiers from item/RentalPriceTier.json ...')
  const tiers = loadJsonArray('RentalPriceTier.json')

  if (!tiers.length) {
    console.warn('⚠️ No rental price tiers found, skipping tier seed')
    return
  }

  for (const entry of tiers) {
    const tier = fixDateFields(entry)
    await prisma.rentalPriceTier.upsert({
      where: { id: tier.id },
      update: {
        productId: tier.productId,
        minDays: Number(tier.minDays),
        pricePerDay: Number(tier.pricePerDay),
      },
      create: {
        id: tier.id,
        productId: tier.productId,
        minDays: Number(tier.minDays),
        pricePerDay: Number(tier.pricePerDay),
        createdAt: parseDate(tier.createdAt),
      },
    })
  }

  console.log('✅ Rental price tier seed completed!')
}

async function main() {
  await seedUsers()
  await seedCategories()
  await seedProducts()
  await seedProductVariants()
  await seedProductImages()
  await seedRentalPriceTiers()
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
