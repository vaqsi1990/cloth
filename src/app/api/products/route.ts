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
import { getPurposeIdBySlug, warmPurposeCache } from '@/lib/purpose-ids'
import {
  getCategoryIdBySlugParam,
  resolveCategorySlugParam,
} from '@/lib/product-categories'
import {
  isValidProductText,
  PRODUCT_DESCRIPTION_ERROR_MESSAGE,
  PRODUCT_NAME_ERROR_MESSAGE,
  PRODUCT_TEXT_REGEX,
} from '@/lib/product-text'
import { enrichProductListRows } from '@/lib/product-list-enrichment'
import {
  finalizeProductListResponse,
  getHttpCacheControl,
  loadPublicProductList,
  revalidateProductListCache,
} from '@/lib/product-list-query'

// Product validation schema
const productSchema = z.object({
  name: z.string()
    .min(1, 'სახელი აუცილებელია')
    .regex(PRODUCT_TEXT_REGEX, PRODUCT_NAME_ERROR_MESSAGE),
  slug: z.string().min(1, 'Slug აუცილებელია'),
  brand: z.string().optional(),
  description: z.string()
    .optional()
    .refine((val) => !val || isValidProductText(val), {
      message: PRODUCT_DESCRIPTION_ERROR_MESSAGE,
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

const PUBLIC_LIST_CACHE = { swr: 300, ttl: 300 }
const FILTERED_LIST_CACHE = { swr: 60, ttl: 60 }

const listProducts = (
  args: Parameters<typeof prisma.product.findMany>[0],
  useCache: boolean,
  cacheStrategy = PUBLIC_LIST_CACHE,
) => {
  if (!useCache) {
    return prisma.product.findMany(args)
  }
  return prisma.product.findMany({
    ...args,
    // @ts-ignore - Prisma Accelerate cacheStrategy
    cacheStrategy,
  })
}

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
    const reqStart = Date.now()
    // Parse URL first (synchronous, fast)
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const gender = searchParams.get('gender')
    const isNew = searchParams.get('isNew')
    const purpose = searchParams.get('purpose')
    const search = searchParams.get('search')?.trim()
    const cursor = searchParams.get('cursor')
    const pageParam = searchParams.get('page')
    const limitParam = searchParams.get('limit')
    const useOffsetPagination = pageParam !== null || limitParam !== null
    const page = Math.max(1, parseInt(pageParam || '1', 10) || 1)
    const pageLimit = useOffsetPagination
      ? Math.min(Math.max(parseInt(limitParam || '16', 10) || 16, 1), 50)
      : 20
    const cursorId =
      !useOffsetPagination && cursor ? parseInt(cursor, 10) : undefined
    const includeUnapproved = searchParams.get('includeUnapproved') === 'true'

    const prepStart = Date.now()
    const sessionPromise = includeUnapproved
      ? getServerSession(authOptions)
      : Promise.resolve(null)

    const resolvedCategorySlug =
      category && category !== 'ALL' ? resolveCategorySlugParam(category) : null
    const categoryIdPromise =
      resolvedCategorySlug
        ? prisma.category
            .findUnique({
              where: { slug: resolvedCategorySlug },
              select: { id: true },
              // @ts-ignore - cacheStrategy is available with Prisma Accelerate
              cacheStrategy: { swr: 300, ttl: 300 },
            })
            .then((c) => c?.id ?? getCategoryIdBySlugParam(category!))
            .catch(() => getCategoryIdBySlugParam(category!))
        : Promise.resolve(null)

    const purposeIdPromise = purpose
      ? getPurposeIdBySlug(purpose).catch(() => null)
      : Promise.resolve(null)

    const [session, categoryId, purposeId] = await Promise.all([
      sessionPromise,
      categoryIdPromise,
      purposeIdPromise,
    ])

    const prepMs = Date.now() - prepStart
    const isAdminOrSupportRole =
      session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPPORT'
    const shouldIncludeUnapproved = includeUnapproved && isAdminOrSupportRole
    const needsFreshData = isAdminOrSupportRole || shouldIncludeUnapproved
    const useAccelerateCache = !needsFreshData
    const listCacheStrategy =
      search || category || purpose || gender || isNew
        ? FILTERED_LIST_CACHE
        : PUBLIC_LIST_CACHE

    const listTake = useOffsetPagination ? pageLimit + 1 : 21
    const pageSize = useOffsetPagination ? pageLimit : 20
    const genderEnum =
      gender && gender !== 'ALL'
        ? gender === 'women'
          ? ('WOMEN' as const)
          : gender === 'men'
            ? ('MEN' as const)
            : gender === 'children'
              ? ('CHILDREN' as const)
              : undefined
        : undefined

    // Fast path: one SQL round-trip for public shop (offset pagination)
    const useCombinedPublicQuery =
      !includeUnapproved && useOffsetPagination && !needsFreshData

    if (useCombinedPublicQuery) {
      const combinedFilters = {
        categoryId,
        purposeId,
        gender: genderEnum,
        isNew: isNew === 'true',
        search: search || undefined,
        skip: (page - 1) * pageLimit,
        take: listTake,
      }
      const enrichMs = 0
      const { payload, cacheSource, listMs } = await loadPublicProductList(combinedFilters)
      const finalized = finalizeProductListResponse(payload)
      const productsToReturn = finalized.products
      const hasMore = finalized.hasMore

      const processMs = 0
      const dbTime = listMs + enrichMs
      const handlerMs = prepMs + dbTime + processMs

      if (process.env.NODE_ENV === 'development') {
        console.log(
          `[Products API] prep=${prepMs}ms list=${listMs}ms enrich=${enrichMs}ms combined=1 (products=${productsToReturn.length})`,
        )
        console.log(`[Products API] process=${processMs}ms handler=${handlerMs}ms`)
      }

      const reqTotalMs = Date.now() - reqStart
      const responseBody: Record<string, unknown> = {
        success: true,
        products: productsToReturn,
        nextCursor: null,
        hasMore,
        page,
        limit: pageLimit,
        totalCount: null,
        totalPages: null,
      }

      if (process.env.NODE_ENV === 'development') {
        responseBody.timings = {
          requestMs: reqTotalMs,
          prepMs,
          listMs,
          enrichMs,
          dbMs: dbTime,
          processMs,
          handlerMs,
          combined: true,
          cacheSource,
        }
      }

      const response = NextResponse.json(responseBody)
      response.headers.set(
        'Server-Timing',
        `app;dur=${reqTotalMs}, prep;dur=${prepMs}, list;dur=${listMs}, enrich;dur=${enrichMs}, process;dur=${processMs}`,
      )

      response.headers.set('Cache-Control', getHttpCacheControl(combinedFilters))

      return response
    }

    const dbStart = Date.now()
    
    // Scalar-only select — relations loaded in one batched enrich pass (no per-product joins)
    const baseSelect = {
      id: true,
      name: true,
      slug: true,
      brand: true,
      gender: true,
      color: true,
      location: true,
      isNew: true,
      discount: true,
      discountDays: true,
      discountStartDate: true,
      rating: true,
      categoryId: true,
      purposeId: true,
      sizeSystem: true,
      size: true,
      isRentable: true,
      ...(isAdminOrSupportRole
        ? {
            pricePerDay: true,
            maxRentalDays: true,
            status: true,
            createdAt: true,
            sku: true,
            userId: true,
            approvalStatus: true,
            rejectionReason: true,
          }
        : {}),
    }
    
    const productWhere: Prisma.ProductWhereInput = {
      status: {
        notIn: isAdminOrSupportRole
          ? ['RESERVED']
          : ['MAINTENANCE', 'DAMAGED', 'RESERVED'],
      },
      ...(shouldIncludeUnapproved || isAdminOrSupportRole
        ? {}
        : {
            approvalStatus: 'APPROVED',
            userId: {
              not: null,
            },
          }),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { brand: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(purposeId ? { purposeId } : {}),
      ...(genderEnum ? { gender: genderEnum } : {}),
      ...(isNew === 'true' ? { isNew: true } : {}),
    }

    const listOrderBy = [
      { createdAt: 'desc' as const },
      { id: 'desc' as const },
    ]

    const listQueryBase = {
      take: listTake,
      where: productWhere,
      select: baseSelect,
      orderBy: listOrderBy,
    }

    const productsPromise = useOffsetPagination
      ? listProducts(
          {
            ...listQueryBase,
            skip: (page - 1) * pageLimit,
          },
          useAccelerateCache,
          listCacheStrategy,
        )
      : cursorId
        ? listProducts(
            {
              ...listQueryBase,
              cursor: { id: cursorId },
              skip: 1,
            },
            useAccelerateCache,
            listCacheStrategy,
          )
        : listProducts(listQueryBase, useAccelerateCache, listCacheStrategy)

  
    const flatProducts = await productsPromise
    const listMs = Date.now() - dbStart
    const processStart = Date.now()

    // Check and clear expired discounts (ultra-optimized - skip if no discounts)
    // Fast path: skip processing if no products have discounts
    let hasAnyDiscount = false
    for (let i = 0; i < flatProducts.length; i++) {
      if (flatProducts[i].discount) {
        hasAnyDiscount = true
        break
      }
    }
    
    if (hasAnyDiscount) {
      const now = Date.now()
      const DAY_MS = 86400000
      // Single pass - only process products with discounts
      for (const product of flatProducts) {
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
    let filteredProducts = flatProducts
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
    
    const hasMore = filteredProducts.length > pageSize
    const flatPage = hasMore
      ? filteredProducts.slice(0, pageSize)
      : filteredProducts

    const processMs = Date.now() - processStart

    await warmPurposeCache()

    const enrichStart = Date.now()
    const productsToReturn = await enrichProductListRows(flatPage, {
      includeUser: isAdminOrSupportRole,
    })
    const enrichMs = Date.now() - enrichStart
    const dbTime = listMs + enrichMs

    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[Products API] prep=${prepMs}ms list=${listMs}ms enrich=${enrichMs}ms (products=${productsToReturn.length})`,
      )
    }

    const nextCursor =
      !useOffsetPagination && hasMore && productsToReturn.length > 0
        ? productsToReturn[productsToReturn.length - 1].id.toString()
        : null

    const totalPages =
      useOffsetPagination ? null : undefined

    const handlerMs = prepMs + dbTime + processMs
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Products API] process=${processMs}ms handler=${handlerMs}ms`)
    }

    // No need to call processExpiredDiscount - we already cleared expired discounts in memory above
    const responseBody: any = {
      success: true,
      products: productsToReturn,
      nextCursor,
      hasMore: hasMore,
      ...(useOffsetPagination
        ? {
            page,
            limit: pageLimit,
            totalCount: null,
            totalPages,
          }
        : {}),
    }

    // Expose timings for debugging (and server-timing header for DevTools)
    const reqTotalMs = Date.now() - reqStart
    const serverTiming = `app;dur=${reqTotalMs}, prep;dur=${prepMs}, list;dur=${listMs}, enrich;dur=${enrichMs}, process;dur=${processMs}`
    if (process.env.NODE_ENV === 'development') {
      responseBody.timings = {
        requestMs: reqTotalMs,
        prepMs,
        listMs,
        enrichMs,
        dbMs: dbTime,
        processMs,
        handlerMs,
      }
    }

    const response = NextResponse.json(responseBody)
    response.headers.set('Server-Timing', serverTiming)
    
    // Admin/support approval views must not be cached (stale PENDING after approve)
    if (needsFreshData) {
      response.headers.set('Cache-Control', 'private, no-store, must-revalidate')
    } else if (!search && !category && !purpose && !gender && !isNew) {
      response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
    } else {
      response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120')
    }
    
    return response
    
  } catch (error) {
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

    revalidateProductListCache()
    
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