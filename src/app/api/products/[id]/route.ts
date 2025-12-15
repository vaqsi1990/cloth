import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Prisma } from '@prisma/client'
import { ensureUniqueProductSlug } from '@/lib/productSlug'
import { checkAndClearExpiredDiscount, processExpiredDiscount } from '@/utils/discountUtils'
import { PURPOSE_NAME_BY_SLUG } from '@/data/purposes'

// Product validation schema
const productSchema = z.object({
  name: z.string()
    .min(1, 'სახელი აუცილებელია')
    .regex(/^[\u10A0-\u10FF\s.,:;!?\-()""''0-9]+$/, 'სახელი უნდა შეიცავდეს მხოლოდ ქართულ სიმბოლოებს, პუნქტუაციას და ციფრებს'),
  slug: z.string().min(1, 'Slug აუცილებელია').regex(/^[a-z0-9-]+$/, 'Slug უნდა შეიცავდეს მხოლოდ პატარა ასოებს, ციფრებს და ტირეებს'),
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
  sizeSystem: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.enum(['EU', 'US', 'UK', 'CN']).optional()
  ),
  size: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.string().optional()
  ),
  isNew: z.boolean().default(false),
  discount: z.preprocess(
    (val) => (val === null ? undefined : val),
    z.number().min(0).optional()
  ),
  discountDays: z.preprocess(
    (val) => (val === null ? undefined : val),
    z.number().int().min(1).optional()
  ),
  rating: z.number().min(0).max(5).optional(),
  categoryId: z.number().optional(),
  purposeId: z.number().optional(),
  purposeSlug: z.string().optional(),
  isRentable: z.boolean().default(true),
  pricePerDay: z.number().min(0, 'ფასი უნდა იყოს დადებითი').optional(),
  maxRentalDays: z.number().optional(),
  status: z.enum(['AVAILABLE', 'RENTED', 'RESERVED', 'MAINTENANCE']).default('AVAILABLE'),
  variants: z.array(z.object({
    size: z.preprocess(
      (val) => (val === '' || val === null ? undefined : val),
      z.string().optional()
    ),
    price: z.number().min(0, 'ფასი უნდა იყოს დადებითი'),
    sizeSystem: z.enum(['EU', 'US', 'UK', 'CN']).optional()
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

// GET - Fetch single product by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const isAdmin = session?.user?.role === 'ADMIN'
    const requesterId = session?.user?.id
    const resolvedParams = await params
    const productId = parseInt(resolvedParams.id)
    
    if (isNaN(productId)) {
      return NextResponse.json({
        success: false,
        message: 'არასწორი პროდუქტის ID'
      }, { status: 400 })
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
        purpose: true,
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            blocked: true
          }
        },
        images: {
          orderBy: { position: 'asc' }
        },
        variants: true,
        rentalPriceTiers: {
          orderBy: { minDays: 'asc' }
        }
      }
    })

    const isOwner = requesterId && product?.userId === requesterId

    if (
      !product ||
      (!isAdmin && product.user?.blocked) ||
      (!isAdmin && !isOwner && product.approvalStatus !== 'APPROVED')
    ) {
      return NextResponse.json({
        success: false,
        message: 'პროდუქტი ვერ მოიძებნა'
      }, { status: 404 })
    }

    // Check and clear expired discount if needed
    await checkAndClearExpiredDiscount(productId)
    
    // Re-fetch product to get updated data
    const updatedProduct = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
        purpose: true,
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            blocked: true
          }
        },
        images: {
          orderBy: { position: 'asc' }
        },
        variants: true,
        rentalPriceTiers: {
          orderBy: { minDays: 'asc' }
        }
      }
    })

    if (!updatedProduct) {
      return NextResponse.json({
        success: false,
        message: 'პროდუქტი ვერ მოიძებნა'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      product: processExpiredDiscount(updatedProduct)
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

    const isAdmin = session.user.role === 'ADMIN'
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

    if (!isAdmin && existingProduct.userId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      )
    }

    const shouldResetApproval = !isAdmin

    // First delete existing images and variants
    await prisma.productImage.deleteMany({
      where: { productId: productId }
    })
    
    await prisma.productVariant.deleteMany({
      where: { productId: productId }
    })

    // Update product with nested updates
    console.log('=== UPDATING PRODUCT ===')
    console.log('Product ID:', productId)
    console.log('Validated data:', JSON.stringify(validatedData, null, 2))
    console.log('Variants to create:', validatedData.variants)
    console.log('Variants length:', validatedData.variants.length)
    console.log('Each variant:', validatedData.variants.map(v => ({
      size: v.size,
      price: v.price,
      sizeSystem: v.sizeSystem ?? validatedData.sizeSystem
    })))
    
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

    const purposeRelation = buildPurposeRelation(validatedData.purposeId, validatedData.purposeSlug)
    const categoryRelation =
      validatedData.categoryId !== undefined
        ? (validatedData.categoryId
            ? { connect: { id: validatedData.categoryId } }
            : { disconnect: true })
        : undefined

    const updateData: any = {
      name: validatedData.name,
      slug: uniqueSlug,
      brand: validatedData.brand,
      description: validatedData.description,
      stock: validatedData.stock,
      // SKU is not updated - keep existing unique code
      gender: validatedData.gender,
      color: validatedData.color,
      location: validatedData.location,
      sizeSystem: validatedData.sizeSystem,
      size: validatedData.size,
      isNew: validatedData.isNew,
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
        create: validatedData.imageUrls.map((url, index) => ({
          url: url,
          alt: `${validatedData.name} - სურათი ${index + 1}`,
          position: index
        }))
      },
      // Create new variants
      variants: {
        create: validatedData.variants.map(variant => ({
          size: variant.size,
          price: variant.price
        }))
      },
      // Update rental price tiers if provided
      rentalPriceTiers: validatedData.rentalPriceTiers ? {
        deleteMany: {}, // Delete existing tiers
        create: validatedData.rentalPriceTiers.map(tier => ({
          minDays: tier.minDays,
          pricePerDay: tier.pricePerDay
        }))
      } : undefined
    }

    if (categoryRelation) {
      updateData.category = categoryRelation
    }

    if (purposeRelation) {
      updateData.purpose = purposeRelation
    }

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: updateData,
      include: { 
        images: true, 
        variants: true, 
        category: true,
        purpose: true,
        rentalPriceTiers: {
          orderBy: { minDays: 'asc' }
        }
      }
    })
    
    console.log('=== PRODUCT UPDATED SUCCESSFULLY ===')
    console.log('Updated product:', JSON.stringify(updatedProduct, null, 2))

    // If product status is AVAILABLE, delete all order items for this product
    if (validatedData.status === 'AVAILABLE' && updatedProduct.status !== 'AVAILABLE') {
      const deletedCount = await prisma.orderItem.deleteMany({
        where: {
          productId: productId,
          isRental: true
        }
      })
      console.log(`Deleted ${deletedCount.count} order items for product ${productId}`)
    }

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
    
    console.error('Error updating product:', error)
    return NextResponse.json({
      success: false,
      message: 'შეცდომა პროდუქტის განახლებისას'
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

    // Check if user owns the product or is admin
    if (session.user.role !== 'ADMIN' && existingProduct.userId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      )
    }

    // Update only the fields provided
    const updateData: Prisma.ProductUpdateInput = {}
    
    if (body.status && ['AVAILABLE', 'RENTED', 'RESERVED', 'MAINTENANCE'].includes(body.status)) {
      updateData.status = body.status as 'AVAILABLE' | 'RENTED' | 'RESERVED' | 'MAINTENANCE'
    }

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: updateData
    })

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

    // Check if user owns the product or is admin
    if (session.user.role !== 'ADMIN' && existingProduct.userId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      )
    }

    // Delete product (cascade will handle related records)
    await prisma.product.delete({
      where: { id: productId }
    })

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
