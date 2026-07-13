import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isAdminOrSupport } from '@/lib/roles'
import { generateUniqueSKU } from '@/utils/skuUtils'
import { ensureUniqueProductSlug } from '@/lib/productSlug'
import {
  getCategoryIdBySlugParam,
  resolveCategorySlugParam,
} from '@/lib/product-categories'
import { resolveCategoryIdsForFilterSlugs } from '@/lib/product-category-resolve'
import {
  PRODUCT_NAME_ERROR_MESSAGE,
  PRODUCT_TEXT_REGEX,
} from '@/lib/product-text'
import { enrichProductListRows } from '@/lib/product-list-enrichment'
import {
  productPickupAddressField,
  refineProductPickupAddress,
} from '@/lib/product-pickup'
import {
  buildProductImageCreates,
  deriveProductFieldsFromVariants,
  getVariantImageUrls,
  mapVariantInputForCreate,
  productHasSkuVariants,
  productVariantInputSchema,
  resolveProductImagesForWrite,
} from '@/lib/product-variants'
import {
  productImageUrlsField,
  refineProductImagesAndPricing,
} from '@/lib/product-create-validation'
import { canUserCreateProducts } from '@/lib/seller-eligibility'
import { userNeedsPhoneNumber } from '@/lib/user-phone-required'
import {
  finalizeProductListResponse,
  getHttpCacheControl,
  loadPublicProductList,
  revalidateProductListCache,
} from '@/lib/product-list-query'
import { parseShopListFilterParams } from '@/lib/shop-list-params'
import { convertBuyerPriceFiltersToSeller } from '@/lib/platform-pricing'
import {
  buildPublicProductDiscoveryWhere,
} from '@/lib/sold-products'
import { resolveCategoryIdForWrite } from '@/lib/category-sync'
import { sortProductsByVipPriority } from '@/lib/product-vip'
import {
  applyDisplayableUrlMap,
  buildDisplayableUrlMap,
} from '@/lib/ensure-displayable-image-url'
import { fetchProductIdsByApprovalPriority } from '@/lib/admin-product-list-order.server'
import { orderProductsByIdList } from '@/lib/admin-product-list-order'
import { prismaCacheStrategy } from '@/lib/prisma-cache'
import {
  optionalCategoryIdField,
} from '@/lib/product-schema-fields'

// Product validation schema
const productSchema = z.object({
  name: z.string()
    .min(1, 'სახელი აუცილებელია')
    .regex(PRODUCT_TEXT_REGEX, PRODUCT_NAME_ERROR_MESSAGE),
  slug: z.string().min(1, 'Slug აუცილებელია'),
  brand: z.string().optional(),
  description: z.string().optional(),
  stock: z.number().min(0, 'საწყობი უნდა იყოს დადებითი').default(0),
  gender: z.enum(['MEN', 'WOMEN', 'CHILDREN', 'UNISEX']).default('UNISEX'),
  color: z.string().optional(),
  location: z.string().optional(),
  allowsPickup: z.boolean().default(false),
  pickupAddress: productPickupAddressField,
  sizeSystem: z.enum(['EU', 'US', 'UK', 'CN']).optional(),
  size: z.string().optional(),
  isNew: z.boolean().default(false),
  isSecondHand: z.boolean().default(false),
  discount: z.number().min(0).optional(),
  discountDays: z.number().int().min(1).optional(),
  rating: z.number().min(0).max(5).optional(),
  categoryId: optionalCategoryIdField,
  categorySlug: z.string().optional(),
  isRentable: z.boolean().default(true),
  pricePerDay: z.number().min(0, 'ფასი უნდა იყოს დადებითი').optional(),
  maxRentalDays: z.number().optional(),
  status: z.enum(['AVAILABLE', 'RENTED', 'RESERVED', 'MAINTENANCE', 'DAMAGED']).default('AVAILABLE'),
  variants: z.array(productVariantInputSchema).default([]),
  imageUrls: z.array(z.string().min(1, 'არასწორი URL')).default([]),
  isSkuVariantProduct: z.boolean().optional(),
  requireVariantSalePrices: z.boolean().optional(),
  requireVariantSize: z.boolean().optional(),
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
}).superRefine((data, ctx) => {
  refineProductPickupAddress(data, ctx)
  refineProductImagesAndPricing(
    {
      ...data,
      isSkuVariantProduct:
        data.isSkuVariantProduct ?? productHasSkuVariants({ variants: data.variants }),
      requireVariantSalePrices: data.requireVariantSalePrices,
      requireVariantSize: data.requireVariantSize,
    },
    ctx,
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
    ...prismaCacheStrategy(cacheStrategy),
  })
}

// GET - Fetch all products
export async function GET(request: NextRequest) {
  try {
    const reqStart = Date.now()
    // Parse URL first (synchronous, fast)
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const categoriesParam = searchParams.get('categories')
    const gender = searchParams.get('gender')
    const isNew = searchParams.get('isNew')
    const isSecondHand = searchParams.get('isSecondHand')
    const hasDiscount = searchParams.get('hasDiscount')
    const isVip = searchParams.get('isVip')
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
    const forceFresh = searchParams.get('fresh') === '1'
    const pendingFirstParam = searchParams.get('pendingFirst')
    const shopFilters = parseShopListFilterParams(searchParams)
    const sellerPriceFilters = convertBuyerPriceFiltersToSeller(shopFilters)

    const prepStart = Date.now()
    const sessionPromise = includeUnapproved
      ? getServerSession(authOptions)
      : Promise.resolve(null)

    const resolvedCategorySlug =
      category && category !== 'ALL' ? resolveCategorySlugParam(category) : null

    const filterCategoryParams = categoriesParam
      ? categoriesParam
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean)
      : resolvedCategorySlug && category
        ? [category]
        : []

    const categoryIdsPromise =
      filterCategoryParams.length > 0
        ? resolveCategoryIdsForFilterSlugs(filterCategoryParams)
        : Promise.resolve([] as number[])

    const [session, categoryIds] = await Promise.all([
      sessionPromise,
      categoryIdsPromise,
    ])

    const prepMs = Date.now() - prepStart
    const isAdminOrSupportRole =
      session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPPORT'
    const shouldIncludeUnapproved = includeUnapproved && isAdminOrSupportRole
    const pendingFirst =
      shouldIncludeUnapproved && pendingFirstParam !== 'false'
    const adminOffset = Math.max(
      0,
      parseInt(searchParams.get('offset') || '0', 10) || 0,
    )
    const needsFreshData = isAdminOrSupportRole || shouldIncludeUnapproved
    const useAccelerateCache = !needsFreshData
    const listCacheStrategy =
      search ||
      category ||
      gender ||
      isNew ||
      isSecondHand ||
      hasDiscount ||
      isVip ||
      shopFilters.color ||
      shopFilters.colors?.length ||
      shopFilters.colorSearch ||
      shopFilters.categorySlugs?.length ||
      shopFilters.sizes?.length ||
      shopFilters.sizeSystems?.length ||
      shopFilters.locations?.length ||
      shopFilters.priceMin != null ||
      shopFilters.priceMax != null ||
      shopFilters.purchaseType ||
      shopFilters.sort
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
        categoryIds: categoryIds.length > 0 ? categoryIds : null,
        gender: genderEnum,
        isNew: isNew === 'true',
        isSecondHand: isSecondHand === 'true',
        hasDiscount: hasDiscount === 'true',
        isVip: isVip === 'true',
        search: search || undefined,
        color: shopFilters.color,
        colors: shopFilters.colors,
        colorSearch: shopFilters.colorSearch,
        sizes: shopFilters.sizes,
        sizeSystems: shopFilters.sizeSystems,
        locations: shopFilters.locations,
        priceMin: sellerPriceFilters.priceMin,
        priceMax: sellerPriceFilters.priceMax,
        purchaseType: shopFilters.purchaseType,
        sort: shopFilters.sort,
        skip: (page - 1) * pageLimit,
        take: listTake,
      }
      const enrichMs = 0
      const { payload, cacheSource, listMs } = await loadPublicProductList(
        combinedFilters,
        { forceFresh },
      )
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
      isSecondHand: true,
      isVip: true,
      vipExpiresAt: true,
      discount: true,
      discountDays: true,
      discountStartDate: true,
      rating: true,
      categoryId: true,
      sizeSystem: true,
      size: true,
      isRentable: true,
      createdAt: true,
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
            featuredOnHomepage: true,
            homepageFeaturedAt: true,
          }
        : {}),
    }
    
    const productWhere: Prisma.ProductWhereInput = {
      ...(isAdminOrSupportRole || shouldIncludeUnapproved
        ? { deletedAt: null }
        : buildPublicProductDiscoveryWhere()),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { brand: { contains: search, mode: 'insensitive' as const } },
              { sku: { contains: search, mode: 'insensitive' as const } },
              {
                variants: {
                  some: {
                    sku: { contains: search, mode: 'insensitive' as const },
                  },
                },
              },
            ],
          }
        : {}),
      ...(categoryIds.length > 0 ? { categoryId: { in: categoryIds } } : {}),
      ...(genderEnum ? { gender: genderEnum } : {}),
      ...(isNew === 'true' ? { isNew: true } : {}),
      ...(isSecondHand === 'true' ? { isSecondHand: true } : {}),
      ...(hasDiscount === 'true' ? { discount: { gt: 0 } } : {}),
      ...(isVip === 'true'
        ? {
            isVip: true,
            vipExpiresAt: { gt: new Date() },
          }
        : {}),
    }

    const listOrderBy = [
      { isVip: 'desc' as const },
      { vipExpiresAt: 'desc' as const },
      { createdAt: 'desc' as const },
      { id: 'desc' as const },
    ]

    const listQueryBase = {
      take: listTake,
      where: productWhere,
      select: baseSelect,
      orderBy: listOrderBy,
    }

    const useApprovalPriorityOrder =
      pendingFirst && shouldIncludeUnapproved && !useOffsetPagination && !search

    const useAdminFilteredOffset =
      shouldIncludeUnapproved && !useOffsetPagination && Boolean(search)

    const productsPromise = useApprovalPriorityOrder
      ? (async () => {
          const orderedIds = await fetchProductIdsByApprovalPriority(
            listTake,
            adminOffset,
          )
          if (orderedIds.length === 0) return []

          const rows = await prisma.product.findMany({
            where: { id: { in: orderedIds } },
            select: baseSelect,
          })
          return orderProductsByIdList(rows, orderedIds)
        })()
      : useAdminFilteredOffset
        ? listProducts(
            {
              ...listQueryBase,
              skip: adminOffset,
            },
            false,
            listCacheStrategy,
          )
      : useOffsetPagination
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
    let filteredProducts = useApprovalPriorityOrder
      ? flatProducts
      : sortProductsByVipPriority(flatProducts)
    // Note: If blocked users cannot have approved products, we can skip this entire check
    // Uncomment below if you need to filter blocked users:
    /*
    if (!isAdmin && products.length > 0) {
      const userIds = [...new Set(products.map(p => p.userId).filter(Boolean) as string[])]
      if (userIds.length > 0) {
        const users = await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, blocked: true },
          ...prismaCacheStrategy({ swr: 60, ttl: 60 }),
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
      !useOffsetPagination &&
      !useApprovalPriorityOrder &&
      hasMore &&
      productsToReturn.length > 0
        ? productsToReturn[productsToReturn.length - 1].id.toString()
        : null

    const nextOffset =
      (useApprovalPriorityOrder || useAdminFilteredOffset) && hasMore
        ? adminOffset + pageSize
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
      nextOffset,
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
    } else if (!search && !category && !gender && !isNew && !isSecondHand) {
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

    if (userNeedsPhoneNumber({ role: session.user.role, phone: session.user.phone })) {
      return NextResponse.json(
        {
          success: false,
          missingPhone: true,
          error: 'გთხოვთ მიუთითოთ ტელეფონის ნომერი.',
        },
        { status: 403 },
      )
    }

    const isAdmin = session.user.role === 'ADMIN'
    console.log('Is Admin:', isAdmin)

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { iban: true },
    })
    console.log('User data:', { hasIban: !!user?.iban })

    if (!canUserCreateProducts({
      role: session.user.role,
      iban: user?.iban,
    })) {
      console.log('ERROR: User missing IBAN')
      return NextResponse.json(
        {
          success: false,
          error: 'გთხოვთ შეიყვანოთ ბანკის IBAN პროფილში. IBAN აუცილებელია პროდუქტის დასამატებლად.',
          missingIban: true,
        },
        { status: 403 },
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
    
    const shouldAutoApprove = isAdminOrSupport(session.user.role)

    const productInclude = {
      images: true,
      variants: true,
      category: true,
      rentalPriceTiers: {
        orderBy: { minDays: 'asc' as const }
      }
    }

    const uniqueSlug = await ensureUniqueProductSlug(validatedData.slug)

    let resolvedCategoryId: number | null = null
    if (validatedData.categoryId) {
      resolvedCategoryId = await resolveCategoryIdForWrite(
        validatedData.categoryId,
        validatedData.categorySlug,
      )
      if (!resolvedCategoryId) {
        return NextResponse.json(
          { success: false, message: 'არჩეული კატეგორია ვერ მოიძებნა' },
          { status: 400 },
        )
      }
    }

    const derivedFields = deriveProductFieldsFromVariants(validatedData.variants, {
      color: validatedData.color,
      size: validatedData.size,
      sizeSystem: validatedData.sizeSystem,
      stock: validatedData.stock,
    })

    const displayableUrlMap = await buildDisplayableUrlMap([
      ...validatedData.imageUrls,
      ...validatedData.variants.flatMap((variant) => [
        ...(variant.imageUrls || []),
        ...(variant.imageUrl ? [variant.imageUrl] : []),
      ]),
    ])
    const normalizedVariants = validatedData.variants.map((variant) => ({
      ...variant,
      imageUrl: applyDisplayableUrlMap(variant.imageUrl, displayableUrlMap) ?? undefined,
      imageUrls: variant.imageUrls?.map(
        (url) => applyDisplayableUrlMap(url, displayableUrlMap) ?? url,
      ),
    }))
    const normalizedImageUrls = validatedData.imageUrls.map(
      (url) => applyDisplayableUrlMap(url, displayableUrlMap) ?? url,
    )
    const resolvedMedia = resolveProductImagesForWrite({
      isSkuVariantProduct: validatedData.isSkuVariantProduct,
      imageUrls: normalizedImageUrls,
      variants: normalizedVariants,
    })
    const resolvedImageUrls = resolvedMedia.imageUrls
    const variantsForCreate = resolvedMedia.variants

    // Create product in database using Prisma (approval fields rely on DB defaults)
    const productData: Prisma.ProductCreateInput = {
      name: validatedData.name,
      slug: uniqueSlug,
      brand: validatedData.brand,
      description: validatedData.description,
      stock: derivedFields.stock ?? validatedData.stock,
      sku: uniqueSKU, // Auto-generated unique SKU
      gender: validatedData.gender,
      color: derivedFields.color ?? validatedData.color,
      location: validatedData.location,
      allowsPickup: validatedData.allowsPickup,
      pickupAddress: validatedData.allowsPickup
        ? validatedData.pickupAddress?.trim()
        : null,
      sizeSystem: derivedFields.sizeSystem ?? validatedData.sizeSystem,
      size: derivedFields.size ?? validatedData.size,
      isNew: validatedData.isNew,
      isSecondHand: validatedData.isSecondHand,
      discount: validatedData.discount,
      discountDays: validatedData.discountDays,
      discountStartDate: validatedData.discount && validatedData.discountDays ? new Date() : null,
      category: resolvedCategoryId
        ? { connect: { id: resolvedCategoryId } }
        : undefined,
      isRentable: validatedData.isRentable,
      pricePerDay: validatedData.pricePerDay,
      maxRentalDays: validatedData.maxRentalDays,
      status: validatedData.status,
      user: { connect: { id: session.user.id } },
      images: {
        create: buildProductImageCreates({
          isSkuVariantProduct: validatedData.isSkuVariantProduct,
          productName: validatedData.name,
          imageUrls: resolvedImageUrls,
          variants: normalizedVariants,
        }),
      },
      variants: {
        create: variantsForCreate.map((variant) => mapVariantInputForCreate(variant))
      },
      rentalPriceTiers: validatedData.rentalPriceTiers ? {
        create: validatedData.rentalPriceTiers.map(tier => ({
          minDays: tier.minDays,
          pricePerDay: tier.pricePerDay
        }))
      } : undefined
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