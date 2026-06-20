import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Prisma } from '@prisma/client'
import { ensureUniqueProductSlug } from '@/lib/productSlug'
import { checkAndClearExpiredDiscount, processExpiredDiscount } from '@/utils/discountUtils'
import { isAdminOrSupport } from '@/lib/roles'
import {
  optionalCategoryIdField,
} from '@/lib/product-schema-fields'
import {
  isValidProductText,
  PRODUCT_DESCRIPTION_ERROR_MESSAGE,
  PRODUCT_NAME_ERROR_MESSAGE,
  PRODUCT_TEXT_REGEX,
} from '@/lib/product-text'
import {
  productPickupAddressField,
  refineProductPickupAddress,
} from '@/lib/product-pickup'
import {
  applyDisplayableUrlMap,
  buildDisplayableUrlMap,
} from '@/lib/ensure-displayable-image-url'
import {
  deriveProductFieldsFromVariants,
  getVariantImageUrls,
  mapVariantInputForCreate,
  productHasSkuVariants,
  productVariantInputSchema,
  resolveProductImagesForWrite,
} from '@/lib/product-variants'
import {
  refineProductImagesAndPricing,
} from '@/lib/product-create-validation'
import { revalidateProductCaches } from '@/lib/product-cache-revalidation'
import { resolveCategoryIdForWrite } from '@/lib/category-sync'
import {
  isProductStatus,
  updateProductStatus,
  clearProductRentalBlocks,
} from '@/lib/update-product-status'

const VALID_PRODUCT_STATUSES = new Set([
  'AVAILABLE',
  'RENTED',
  'RESERVED',
  'MAINTENANCE',
  'DAMAGED',
])

function isValidProductStatus(value: unknown): value is 'AVAILABLE' | 'RENTED' | 'RESERVED' | 'MAINTENANCE' | 'DAMAGED' {
  return isProductStatus(value)
}

// Product validation schema
const productSchema = z.object({
  name: z.string()
    .min(1, 'სახელი აუცილებელია')
    .regex(PRODUCT_TEXT_REGEX, PRODUCT_NAME_ERROR_MESSAGE),
  slug: z.string().min(1, 'Slug აუცილებელია').regex(/^[a-z0-9-]+$/, 'Slug უნდა შეიცავდეს მხოლოდ პატარა ასოებს, ციფრებს და ტირეებს'),
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
  allowsPickup: z.boolean().default(false),
  pickupAddress: productPickupAddressField,
  sizeSystem: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.enum(['EU', 'US', 'UK', 'CN']).optional()
  ),
  size: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.string().optional()
  ),
  isNew: z.boolean().default(false),
  isSecondHand: z.boolean().default(false),
  discount: z.preprocess(
    (val) => (val === null ? undefined : val),
    z.number().min(0).optional()
  ),
  discountDays: z.preprocess(
    (val) => (val === null ? undefined : val),
    z.number().int().min(1).optional()
  ),
  rating: z.number().min(0).max(5).optional(),
  categoryId: optionalCategoryIdField,
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
      // If it's an array with all pricePerDay = 0, convert to empty array (to clear tiers)
      // Empty arrays are kept as-is (to clear all tiers)
      // undefined means don't update tiers
      if (Array.isArray(val)) {
        if (val.length === 0) {
          return [] // Empty array means clear all tiers
        }
        const hasValidPrice = val.some((tier: any) => tier?.pricePerDay > 0)
        return hasValidPrice ? val : [] // All prices are 0, so clear tiers
      }
      return val === null ? undefined : val // null becomes undefined (don't update)
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

// Helper function to build product select query (optimized for performance)
const buildProductSelect = (includeAdminFields: boolean = false) => {
  const baseSelect = {
    id: true,
    name: true,
    slug: true,
    brand: true,
    description: true,
    sku: true,
    stock: true,
    gender: true,
    color: true,
    location: true,
    allowsPickup: true,
    pickupAddress: true,
    sizeSystem: true,
    size: true,
    isNew: true,
    isSecondHand: true,
    isVip: true,
    vipExpiresAt: true,
    discount: true,
    discountDays: true,
    discountStartDate: true,
    rating: true,
    categoryId: true,
    userId: true, // Needed for isOwner check
    isRentable: true,
    requiresInquiryBeforeRent: true,
    pricePerDay: true,
    maxRentalDays: true,
    status: true,
    approvalStatus: true, // Always needed for permission checks
    // Removed: createdAt, updatedAt - not needed for display
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
    }
  },
  user: {
    select: {
      id: true,
      name: true,
      image: true,
      banned: true,
    }
  },
  images: {
    select: {
      url: true,
      position: true, // Keep for ordering
    },
    orderBy: { position: 'asc' as const }
  },
  variants: {
    select: {
      id: true,
      color: true,
      size: true,
      sizeSystem: true,
      stock: true,
      imageUrl: true,
      price: true,
      sku: true,
    },
    orderBy: { id: 'asc' as const }
  },
  rentalPriceTiers: {
    select: {
      minDays: true,
      pricePerDay: true,
    },
    orderBy: { minDays: 'asc' as const }
  }
  }

  // Add admin-only fields conditionally
  if (includeAdminFields) {
    return {
      ...baseSelect,
      rejectionReason: true,
      approvedAt: true,
    }
  }

  return baseSelect
}

// GET - Fetch single product by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Resolve params first (fast, synchronous)
    const resolvedParams = await params
    const productId = parseInt(resolvedParams.id)
    
    if (isNaN(productId)) {
      return NextResponse.json({
        success: false,
        message: 'არასწორი პროდუქტის ID'
      }, { status: 400 })
    }

    // Fetch product and session in parallel for maximum performance
    const [product, session] = await Promise.all([
      prisma.product.findUnique({
        where: { id: productId },
        select: buildProductSelect(true),
      }),
      getServerSession(authOptions),
    ])
    
    const isAdminOrSupportRole = isAdminOrSupport(session?.user?.role)
    const requesterId = session?.user?.id

    const isOwner = requesterId && product?.userId === requesterId

    // Check access permissions
    if (
      !product ||
      (!isAdminOrSupportRole && product.user?.banned) ||
      (!isAdminOrSupportRole && !isOwner && product.approvalStatus !== 'APPROVED')
    ) {
      return NextResponse.json({
        success: false,
        message: 'პროდუქტი ვერ მოიძებნა'
      }, { status: 404 })
    }

    // Process expired discount inline (faster than function call with spread)
    let finalProduct = product
    if (product.discount && product.discountDays && product.discountStartDate) {
      const expirationDate = new Date(product.discountStartDate)
      expirationDate.setDate(expirationDate.getDate() + product.discountDays)
      
      if (new Date() > expirationDate) {
        // Discount expired - modify in place (faster than spread)
        finalProduct = {
          ...product,
          discount: null,
          discountDays: null,
          discountStartDate: null,
        }
        // Clear in DB asynchronously (non-blocking)
        checkAndClearExpiredDiscount(productId).catch(() => {})
      }
    }

    return NextResponse.json({
      success: true,
      product: finalProduct
    }, {
      headers: {
        'Cache-Control': 'no-store',
      },
    })
    
  } catch (error) {
    console.error('Error fetching product:', error)
    return NextResponse.json({
      success: false,
      message: 'შეცდომა პროდუქტის მიღებისას'
    }, { status: 500 })
  }
}

// PUT - Update product by ID
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const isAdminOrSupportRole = isAdminOrSupport(session.user.role)
    const resolvedParams = await params
    const productId = parseInt(resolvedParams.id)
    
    if (isNaN(productId)) {
      return NextResponse.json({
        success: false,
        message: 'არასწორი პროდუქტის ID'
      }, { status: 400 })
    }

    const body = await request.json()
    const validatedData = productSchema.parse(body)

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        userId: true,
        discount: true,
        discountDays: true,
        discountStartDate: true,
        approvalStatus: true,
        approvedAt: true,
        rejectionReason: true,
      }
    })

    if (!existingProduct) {
      return NextResponse.json({
        success: false,
        message: 'პროდუქტი ვერ მოიძებნა'
      }, { status: 404 })
    }

    if (!isAdminOrSupportRole && existingProduct.userId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      )
    }

    const shouldResetApproval = !isAdminOrSupportRole

    let resolvedCategoryId: number | null = null
    if (validatedData.categoryId) {
      resolvedCategoryId = await resolveCategoryIdForWrite(validatedData.categoryId)
      if (!resolvedCategoryId) {
        return NextResponse.json(
          { success: false, message: 'არჩეული კატეგორია ვერ მოიძებნა' },
          { status: 400 },
        )
      }
    }

    const categoryRelation =
      validatedData.categoryId !== undefined
        ? (resolvedCategoryId
            ? { connect: { id: resolvedCategoryId } }
            : { disconnect: true })
        : undefined

    // Ensure unique slug
    const uniqueSlug = await ensureUniqueProductSlug(validatedData.slug, {
      excludeProductId: productId
    })

    // Determine discountStartDate: set to now if discount is being set, keep existing if discount unchanged, null if clearing
    let discountStartDate: Date | null = null
    if (validatedData.discount && validatedData.discountDays) {
      // If discount is being set, check if it's a new discount or updating existing
      if (existingProduct.discount !== validatedData.discount || existingProduct.discountDays !== validatedData.discountDays) {
        // Discount changed, set new start date
        discountStartDate = new Date()
      } else {
        // Discount unchanged, keep existing date
        discountStartDate = existingProduct.discountStartDate
      }
    } else if (validatedData.discount === null || validatedData.discount === undefined) {
      // Clearing discount
      discountStartDate = null
    } else {
      // No discount, keep existing (should be null)
      discountStartDate = existingProduct.discountStartDate
    }

    const derivedFields = deriveProductFieldsFromVariants(validatedData.variants, {
      color: validatedData.color,
      size: validatedData.size,
      sizeSystem: validatedData.sizeSystem,
      stock: validatedData.stock,
    })

    const displayableUrlMap = await buildDisplayableUrlMap([
      ...validatedData.imageUrls,
      ...validatedData.variants.map((variant) => variant.imageUrl),
    ])
    const normalizedVariants = validatedData.variants.map((variant) => ({
      ...variant,
      imageUrl: applyDisplayableUrlMap(variant.imageUrl, displayableUrlMap) ?? undefined,
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
    const variantsForUpdate = resolvedMedia.variants

    const updateData: Prisma.ProductUpdateInput = {
      name: validatedData.name,
      slug: uniqueSlug,
      brand: validatedData.brand,
      description: validatedData.description,
      stock: derivedFields.stock ?? validatedData.stock,
      // SKU is not updated - keep existing unique code
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
      discountStartDate: discountStartDate,
      rating: validatedData.rating,
      isRentable: validatedData.isRentable,
      pricePerDay: validatedData.pricePerDay,
      maxRentalDays: validatedData.maxRentalDays,
      status: validatedData.status,
      approvalStatus: shouldResetApproval ? 'PENDING' : existingProduct.approvalStatus,
      approvedAt: shouldResetApproval ? null : existingProduct.approvedAt,
      rejectionReason: shouldResetApproval ? null : existingProduct.rejectionReason,
      // Create new images
      images: {
        create: resolvedImageUrls.map((url, index) => ({
          url: url,
          alt: `${validatedData.name} - სურათი ${index + 1}`,
          position: index
        }))
      },
      // Create new variants
      variants: {
        create: variantsForUpdate.map((variant) => mapVariantInputForCreate(variant))
      },
      // Update rental price tiers if provided
      // undefined = don't update, [] = clear all, [tiers] = replace with new tiers
      rentalPriceTiers: validatedData.rentalPriceTiers !== undefined && validatedData.rentalPriceTiers.length > 0 ? {
        create: validatedData.rentalPriceTiers.map(tier => ({
          minDays: tier.minDays,
          pricePerDay: tier.pricePerDay
        }))
      } : undefined
    }

    if (categoryRelation) {
      updateData.category = categoryRelation
    }

    const updatedProduct = await prisma.$transaction(async (tx) => {
      await tx.productImage.deleteMany({ where: { productId } })
      await tx.productVariant.deleteMany({ where: { productId } })

      if (validatedData.rentalPriceTiers !== undefined) {
        await tx.rentalPriceTier.deleteMany({ where: { productId } })
      }

      return tx.product.update({
        where: { id: productId },
        data: updateData,
        include: {
          images: true,
          variants: true,
          category: true,
          rentalPriceTiers: {
            orderBy: { minDays: 'asc' }
          }
        }
      })
    })

    // If product status changed to AVAILABLE, clear rental calendar blocks
    if (validatedData.status === 'AVAILABLE') {
      await clearProductRentalBlocks(productId)
    }

    revalidateProductCaches(productId, { authorId: updatedProduct.userId })

    return NextResponse.json({
      success: true,
      message: 'პროდუქტი წარმატებით განახლდა',
      product: updatedProduct
    })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: 'ვალიდაციის შეცდომა',
        errors: error.issues
      }, { status: 400 })
    }
    
    console.error('=== ERROR UPDATING PRODUCT ===')
    console.error('Error type:', error?.constructor?.name)
    console.error('Error message:', error instanceof Error ? error.message : String(error))
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    console.error('Full error:', error)
    
    // Check for Prisma errors
    if (error && typeof error === 'object' && 'code' in error) {
      console.error('Prisma error code:', (error as any).code)
      console.error('Prisma error meta:', (error as any).meta)
    }
    
    return NextResponse.json({
      success: false,
      message: 'შეცდომა პროდუქტის განახლებისას',
      error: error instanceof Error ? error.message : 'Unknown error',
      ...(process.env.NODE_ENV === 'development' && {
        details: error instanceof Error ? error.stack : String(error)
      })
    }, { status: 500 })
  }
}

// PATCH - Partially update product (e.g., just status)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const resolvedParams = await params
    const productId = parseInt(resolvedParams.id)
    
    if (isNaN(productId)) {
      return NextResponse.json({
        success: false,
        message: 'არასწორი პროდუქტის ID'
      }, { status: 400 })
    }

    const body = await request.json()

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id: productId }
    })

    if (!existingProduct) {
      return NextResponse.json({
        success: false,
        message: 'პროდუქტი ვერ მოიძებნა'
      }, { status: 404 })
    }

    // Check if user owns the product or is admin/support
    const isAdminOrSupportRole = isAdminOrSupport(session.user.role)
    if (!isAdminOrSupportRole && existingProduct.userId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      )
    }

    if (!isValidProductStatus(body.status)) {
      return NextResponse.json({
        success: false,
        message: `Invalid status: ${body.status}. Allowed values: ${[...VALID_PRODUCT_STATUSES].join(', ')}`
      }, { status: 400 })
    }

    const updatedProduct = await updateProductStatus(productId, body.status)

    return NextResponse.json({
      success: true,
      message: 'პროდუქტი წარმატებით განახლდა',
      product: updatedProduct
    })
    
  } catch (error) {
    console.error('Error updating product:', error)
    return NextResponse.json({
      success: false,
      message: 'შეცდომა პროდუქტის განახლებისას'
    }, { status: 500 })
  }
}

// DELETE - Delete product by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const resolvedParams = await params
    const productId = parseInt(resolvedParams.id)
    
    if (isNaN(productId)) {
      return NextResponse.json({
        success: false,
        message: 'არასწორი პროდუქტის ID'
      }, { status: 400 })
    }

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id: productId }
    })

    if (!existingProduct) {
      return NextResponse.json({
        success: false,
        message: 'პროდუქტი ვერ მოიძებნა'
      }, { status: 404 })
    }

    // Check if user owns the product or is admin/support
    const isAdminOrSupportRole = isAdminOrSupport(session.user.role)
    if (!isAdminOrSupportRole && existingProduct.userId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      )
    }

    // Delete product (cascade will handle related records)
    await prisma.product.delete({
      where: { id: productId }
    })

    revalidateProductCaches(productId, { authorId: existingProduct.userId })

    return NextResponse.json({
      success: true,
      message: 'პროდუქტი წარმატებით წაიშალა'
    })
    
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json({
      success: false,
      message: 'შეცდომა პროდუქტის წაშლისას'
    }, { status: 500 })
  }
}
