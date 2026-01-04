import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateUniqueSKU } from '@/utils/skuUtils'
import { ensureUniqueProductSlug } from '@/lib/productSlug'
// Removed processExpiredDiscount import - we handle discount clearing inline for better performance
import { PURPOSE_NAME_BY_SLUG } from '@/data/purposes'

// Product validation schema
const productSchema = z.object({
  name: z.string()
    .min(1, 'სახელი აუცილებელია')
    .regex(/^[\u10A0-\u10FF\s.,:;!?\-()""''0-9]+$/, 'სახელი უნდა შეიცავდეს მხოლოდ ქართულ სიმბოლოებს, პუნქტუაციას და ციფრებს'),
  slug: z.string().min(1, 'Slug აუცილებელია'),
  brand: z.string().optional(),
  description: z.string()
    .optional()
    .refine((val) => !val || /^[\u10A0-\u10FF\s.,:;!?\-()""''0-9]+$/.test(val), {
      message: 'აღწერა უნდა შეიცავდეს მხოლოდ ქართულ სიმბოლოებს, პუნქტუაციას და ციფრებს'
    }),
  stock: z.number().min(0, 'საწყობი უნდა იყოს დადებითი').default(0),
  gender: z.enum(['MEN', 'WOMEN', 'CHILDREN', 'UNISEX']).default('UNISEX'),
  color: z.string().optional(),
  location: z.string().optional(),
  sizeSystem: z.enum(['EU', 'US', 'UK', 'CN']).optional(),
  size: z.string().optional(),
  isNew: z.boolean().default(false),
  discount: z.number().min(0).optional(),
  discountDays: z.number().int().min(1).optional(),
  rating: z.number().min(0).max(5).optional(),
  categoryId: z.number().optional(),
  purposeId: z.number().optional(),
  purposeSlug: z.string().optional(),
  isRentable: z.boolean().default(true),
  pricePerDay: z.number().min(0, 'ფასი უნდა იყოს დადებითი').optional(),
  maxRentalDays: z.number().optional(),
  status: z.enum(['AVAILABLE', 'RENTED', 'RESERVED', 'MAINTENANCE', 'DAMAGED']).default('AVAILABLE'),
  variants: z.array(z.object({
    price: z.number().min(0, 'ფასი უნდა იყოს დადებითი')
  })).default([]),
  imageUrls: z.array(z.string().min(1, 'URL აუცილებელია')).default([]),
  rentalPriceTiers: z.preprocess(
    (val) => {
      // If it's an array with all pricePerDay = 0, convert to undefined
      if (Array.isArray(val) && val.length > 0) {
        const hasValidPrice = val.some((tier: any) => tier?.pricePerDay > 0)
        return hasValidPrice ? val : undefined
      }
      return val
    },
    z.array(z.object({
      minDays: z.number().int().min(1, 'მინიმალური დღეები უნდა იყოს დადებითი'),
      pricePerDay: z.number().min(0, 'ფასი დღეში უნდა იყოს დადებითი ან ნული')
    })).optional()
  )
})

const buildPurposeRelation = (purposeId?: number, purposeSlug?: string) => {
  if (purposeId) {
    return { connect: { id: purposeId } }
  }
  if (purposeSlug) {
    return {
      connectOrCreate: {
        where: { slug: purposeSlug },
        create: {
          slug: purposeSlug,
          name: PURPOSE_NAME_BY_SLUG[purposeSlug] || purposeSlug
        }
      }
    }
  }
  return undefined
}

// GET - Fetch all products
export async function GET(request: NextRequest) {
  try {
    // Parse URL first (synchronous, fast)
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const gender = searchParams.get('gender')
    const isNew = searchParams.get('isNew')
    const purpose = searchParams.get('purpose')
    const search = searchParams.get('search')?.trim()
    const cursor = searchParams.get('cursor')
    const cursorId = cursor ? parseInt(cursor, 10) : undefined
    
    // Start session check and category/purpose lookups in parallel (non-blocking for query setup)
    // Most users are non-admin, so we can start with default filters
    const sessionPromise = getServerSession(authOptions)
    const categoryIdPromise = category && category !== 'ALL' ? prisma.category.findUnique({
      where: { 
        slug: category === 'DRESSES' ? 'dresses' :
              category === 'TOPS' ? 'tops' :
              category === 'BOTTOMS' ? 'bottoms' :
              category === 'OUTERWEAR' ? 'outerwear' :
              category === 'ACCESSORIES' ? 'accessories' : category.toLowerCase()
      },
      select: { id: true },
      // @ts-ignore - cacheStrategy is available with Prisma Accelerate
      cacheStrategy: { swr: 300, ttl: 300 }
    }).then(c => c?.id).catch(() => null) : Promise.resolve(null)
    
    const purposeIdPromise = purpose ? prisma.purpose.findUnique({
      where: { slug: purpose },
      select: { id: true },
      // @ts-ignore - cacheStrategy is available with Prisma Accelerate
      cacheStrategy: { swr: 300, ttl: 300 }
    }).then(p => p?.id).catch(() => null) : Promise.resolve(null)
    
    // Resolve all in parallel
    const [session, categoryId, purposeId] = await Promise.all([
      sessionPromise,
      categoryIdPromise,
      purposeIdPromise
    ])
    
    const isAdmin = session?.user?.role === 'ADMIN'
    const startTime = Date.now()
    const products = await prisma.product.findMany({
      // @ts-ignore - cacheStrategy is available with Prisma Accelerate
      cacheStrategy: {
        swr: 300, // Stale-while-revalidating for 300 seconds (5 minutes)
        ttl: 300, // Cache results for 300 seconds (5 minutes - very aggressive for list view)
      },
      take: 21, // Take one extra to check if there's more
      ...(cursorId ? {
        cursor: { id: cursorId },
        skip: 1
      } : {}),
      where: {
        // RESERVED products are hidden from everyone, including admins (sold products)
        status: {
          notIn: isAdmin 
            ? ['RESERVED'] // Admins don't see RESERVED (sold) products
            : ['MAINTENANCE', 'DAMAGED', 'RESERVED'] // Non-admin users don't see maintenance, damaged, or reserved (sold) products
        },
        ...(isAdmin ? {} : { 
          approvalStatus: 'APPROVED',
          // Optimized: Use userId join instead of nested user relation for better performance
          userId: {
            not: null // Ensure user exists
          }
        }),
        ...(search ? {
          OR: [
            // Only search in indexed fields for maximum performance
            { name: { contains: search, mode: 'insensitive' as const } },
            { brand: { contains: search, mode: 'insensitive' as const } },
            // Removed: sku search - sku field removed from select
            // Removed: category/purpose search - relations removed, would require JOIN
            // For better search, consider full-text search or separate search endpoint
          ]
        } : {}),
        // Use pre-fetched IDs (faster than JOINs - direct index lookup)
        ...(categoryId ? { categoryId } : {}),
        ...(purposeId ? { purposeId } : {}),
        ...(gender && gender !== 'ALL' ? { 
          gender: gender === 'women' ? 'WOMEN' as const :
                  gender === 'men' ? 'MEN' as const :
                  gender === 'children' ? 'CHILDREN' as const : undefined
        } : {}),
        ...(isNew === 'true' ? { isNew: true } : {})
      },
      select: {
        id: true,
        name: true,
        slug: true,
        brand: true,
        // Removed: description - not needed for list view, only for detail page
        // Removed: sku, stock - not needed for list view display
        gender: true,
        isNew: true,
        discount: true,
        discountDays: true,
        discountStartDate: true,
        rating: true,
        categoryId: true,
        purposeId: true,
        // Removed: userId - not needed for list view
        isRentable: true,
        pricePerDay: true,
        maxRentalDays: true,
        status: true,
        // Removed: approvalStatus - already filtered in WHERE clause
        createdAt: true,
        // Removed: updatedAt - not needed for list view
        // Removed: category and purpose relations - use IDs only for list view
        // Frontend can fetch category/purpose names separately if needed, or use cached data
        images: {
          select: {
            url: true, // Only URL needed for list view
            // Removed: id, alt, position - not needed for list view
          },
          orderBy: { position: 'asc' },
          take: 1 // Only first image needed for list view (major performance boost)
        },
        variants: {
          select: {
            price: true // Only price needed for list view
            // Removed: id - not needed
          },
          take: 1, // Only need first variant for list view (min price calculation)
          orderBy: { price: 'asc' } // Get cheapest variant
        },
        rentalPriceTiers: {
          select: {
            minDays: true,
            pricePerDay: true
            // Removed: id - not needed
          },
          orderBy: { minDays: 'asc' },
          take: 1 // Only first tier needed for list view (lowest minDays)
        },
        // Removed: user relation - fetch separately only if needed, reduces JOIN overhead
      },
      orderBy: [
        { createdAt: 'desc' }
        // Removed: { id: 'desc' } - single orderBy is faster, createdAt is already unique enough
      ]
    })
    const dbTime = Date.now() - startTime
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Products API] Database query took: ${dbTime}ms`)
    }

    // Check and clear expired discounts (ultra-optimized - skip if no discounts)
    // Fast path: skip processing if no products have discounts
    let hasAnyDiscount = false
    for (let i = 0; i < products.length; i++) {
      if (products[i].discount) {
        hasAnyDiscount = true
        break
      }
    }
    
    if (hasAnyDiscount) {
      const now = Date.now()
      const DAY_MS = 86400000
      // Single pass - only process products with discounts
      for (const product of products) {
        if (product.discount && product.discountDays && product.discountStartDate) {
          const startTime = new Date(product.discountStartDate).getTime()
          if (now > startTime + (product.discountDays * DAY_MS)) {
            product.discount = null
            product.discountDays = null
            product.discountStartDate = null
          }
        }
      }
    }

    // Filter out products with blocked users (if not admin)
    // Optimized: Skip this check if products are already approved (blocked users can't have approved products)
    // This check is only needed if business logic allows blocked users to have approved products
    let filteredProducts = products
    // Note: If blocked users cannot have approved products, we can skip this entire check
    // Uncomment below if you need to filter blocked users:
    /*
    if (!isAdmin && products.length > 0) {
      const userIds = [...new Set(products.map(p => p.userId).filter(Boolean) as string[])]
      if (userIds.length > 0) {
        const users = await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, blocked: true },
          // @ts-ignore - cacheStrategy is available with Prisma Accelerate
          cacheStrategy: {
            swr: 60,
            ttl: 60,
          }
        })
        const blockedUserIds = new Set(users.filter(u => u.blocked).map(u => u.id))
        filteredProducts = products.filter(p => !p.userId || !blockedUserIds.has(p.userId))
      }
    }
    */
    
    // Check if there's more data
    const hasMore = filteredProducts.length > 20
    const productsToReturn = hasMore ? filteredProducts.slice(0, 20) : filteredProducts
    
    // Determine next cursor (last product's id if we got a full page)
    const nextCursor = hasMore && productsToReturn.length > 0
      ? productsToReturn[productsToReturn.length - 1].id.toString()
      : null

    const totalTime = Date.now() - startTime
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Products API] Total time: ${totalTime}ms (DB: ${dbTime}ms, Processing: ${totalTime - dbTime}ms)`)
    }

    // No need to call processExpiredDiscount - we already cleared expired discounts in memory above
    const response = NextResponse.json({
      success: true,
      products: productsToReturn, // Already processed discounts above
      nextCursor,
      hasMore
    })
    
    // Add aggressive cache headers for better performance
    // Cache for 5 minutes if no search/filter is applied (static content)
    if (!search && !category && !purpose && !gender && !isNew) {
      response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
    } else {
      // Even with filters, cache for shorter time
      response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120')
    }
    
    return response
    
  } catch (error) {
    console.timeEnd("db")
    console.log("finish")
    console.error('Error fetching products:', error)
    return NextResponse.json({
      success: false,
      message: 'შეცდომა პროდუქტების მიღებისას'
    }, { status: 500 })
  }
}

// POST - Create new product
export async function POST(request: NextRequest) {
  try {
    console.log('=== PRODUCT CREATION REQUEST STARTED ===')
    
    // Check authentication
    const session = await getServerSession(authOptions)
    console.log('Session:', session ? { userId: session.user?.id, role: session.user?.role, email: session.user?.email } : 'No session')
    
    if (!session) {
      console.log('ERROR: No session found')
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const isAdmin = session.user.role === 'ADMIN'
    console.log('Is Admin:', isAdmin)

    // Check if user is blocked and has IBAN (admins are exempt)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { 
        blocked: true,
        iban: true
      }
    })
    console.log('User data:', { blocked: user?.blocked, hasIban: !!user?.iban })

    // Admins can create products even if blocked
    if (user?.blocked && !isAdmin) {
      console.log('ERROR: User is blocked and not admin')
      return NextResponse.json(
        { 
          success: false, 
          error: 'Your account requires identity verification. Please upload a document.',
          blocked: true
        },
        { status: 403 }
      )
    }

    // Check if user has IBAN (required for sellers, but not for admins)
    if (!user?.iban && !isAdmin) {
      console.log('ERROR: User missing IBAN and not admin')
      return NextResponse.json(
        { 
          success: false, 
          error: 'გთხოვთ შეიყვანოთ ბანკის IBAN პროფილში. IBAN აუცილებელია პროდუქტის დასამატებლად.',
          missingIban: true
        },
      )
    }

  
    const body = await request.json()

    
    // Validate the request body
    console.log('Validating data with schema...')
    const validatedData = productSchema.parse(body)
    console.log('Validation successful:', JSON.stringify(validatedData, null, 2))
    
    console.log('Creating product with data:', validatedData)
    
    // Generate unique SKU for the product
    const uniqueSKU = await generateUniqueSKU()
    
    const shouldAutoApprove = session.user.role === 'ADMIN'

    const productInclude = {
      images: true,
      variants: true,
      category: true,
      purpose: true,
      rentalPriceTiers: {
        orderBy: { minDays: 'asc' as const }
      }
    }

    const uniqueSlug = await ensureUniqueProductSlug(validatedData.slug)
    const purposeRelation = buildPurposeRelation(validatedData.purposeId, validatedData.purposeSlug)

    // Create product in database using Prisma (approval fields rely on DB defaults)
    const productData: Prisma.ProductCreateInput = {
      name: validatedData.name,
      slug: uniqueSlug,
      brand: validatedData.brand,
      description: validatedData.description,
      stock: validatedData.stock,
      sku: uniqueSKU, // Auto-generated unique SKU
      gender: validatedData.gender,
      color: validatedData.color,
      location: validatedData.location,
      sizeSystem: validatedData.sizeSystem,
      size: validatedData.size,
      isNew: validatedData.isNew,
      discount: validatedData.discount,
      discountDays: validatedData.discountDays,
      discountStartDate: validatedData.discount && validatedData.discountDays ? new Date() : null,
      rating: validatedData.rating,
      category: validatedData.categoryId
        ? { connect: { id: validatedData.categoryId } }
        : undefined,
      isRentable: validatedData.isRentable,
      pricePerDay: validatedData.pricePerDay,
      maxRentalDays: validatedData.maxRentalDays,
      status: validatedData.status,
      user: { connect: { id: session.user.id } },
      images: {
        create: validatedData.imageUrls.map((url, index) => ({
          url: url,
          alt: `${validatedData.name} - სურათი ${index + 1}`,
          position: index
        }))
      },
      variants: {
        create: validatedData.variants.map(variant => ({
          price: variant.price
        }))
      },
      rentalPriceTiers: validatedData.rentalPriceTiers ? {
        create: validatedData.rentalPriceTiers.map(tier => ({
          minDays: tier.minDays,
          pricePerDay: tier.pricePerDay
        }))
      } : undefined
    }

    if (purposeRelation) {
      productData.purpose = purposeRelation
    }

    const createdProduct = await prisma.product.create({
      data: productData,
      include: productInclude
    })

    // Auto-approve if admin created the product
    if (shouldAutoApprove) {
      await prisma.$executeRaw`
        UPDATE "Product"
        SET "approvalStatus" = 'APPROVED',
            "approvedAt" = ${new Date()},
            "rejectionReason" = NULL
        WHERE "id" = ${createdProduct.id}
      `
    }
    
    const newProduct = shouldAutoApprove
      ? await prisma.product.findUnique({
          where: { id: createdProduct.id },
          include: productInclude
        })
      : createdProduct
    
    console.log('Product created successfully:', newProduct)
    
    return NextResponse.json({
      success: true,
      message: 'პროდუქტი წარმატებით შეიქმნა',
      product: newProduct
    })
    
  } catch (error) {
    console.error('Error creating product:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: 'ვალიდაციის შეცდომა',
        errors: error.issues
      }, { status: 400 })
    }
    
    // Handle Prisma errors
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'P2002') {
        return NextResponse.json({
          success: false,
          message: 'პროდუქტი ამ სახელით ან slug-ით უკვე არსებობს'
        }, { status: 400 })
      }
    }
    
    return NextResponse.json({
      success: false,
      message: 'შეცდომა პროდუქტის შექმნისას'
    }, { status: 500 })
  }
}