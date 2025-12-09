import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Prisma } from '@prisma/client'
import { ensureUniqueProductSlug } from '@/lib/productSlug'

// Product validation schema
const productSchema = z.object({
  name: z.string()
    .min(1, 'სახელი აუცილებელია')
    .regex(/^[\u10A0-\u10FF\s.,:;!?\-()""'']+$/, 'სახელი უნდა შეიცავდეს მხოლოდ ქართულ სიმბოლოებს და პუნქტუაციას'),
  slug: z.string().min(1, 'Slug აუცილებელია').regex(/^[a-z0-9-]+$/, 'Slug უნდა შეიცავდეს მხოლოდ პატარა ასოებს, ციფრებს და ტირეებს'),
  brand: z.string().optional(),
  description: z.string()
    .optional()
    .refine((val) => !val || /^[\u10A0-\u10FF\s.,:;!?\-()""'']+$/.test(val), {
      message: 'აღწერა უნდა შეიცავდეს მხოლოდ ქართულ სიმბოლოებს და პუნქტუაციას'
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
    z.number().int().min(0).max(100).optional()
  ),
  rating: z.number().min(0).max(5).optional(),
  categoryId: z.number().optional(),
  isRentable: z.boolean().default(true),
  pricePerDay: z.number().min(0, 'ფასი უნდა იყოს დადებითი').optional(),
  maxRentalDays: z.number().optional(),
  status: z.enum(['AVAILABLE', 'RENTED', 'RESERVED', 'MAINTENANCE']).default('AVAILABLE'),
  variants: z.array(z.object({
    size: z.preprocess(
      (val) => (val === '' || val === null ? undefined : val),
      z.string().optional()
    ),
    stock: z.number().min(0, 'საწყობი უნდა იყოს დადებითი'),
    price: z.number().min(0, 'ფასი უნდა იყოს დადებითი'),
    sizeSystem: z.enum(['EU', 'US', 'UK', 'CN']).optional()
  })).default([]),
  imageUrls: z.array(z.string().min(1, 'URL აუცილებელია')).default([]),
  rentalPriceTiers: z.array(z.object({
    minDays: z.number().int().min(1, 'მინიმალური დღეები უნდა იყოს დადებითი'),
    pricePerDay: z.number().positive('ფასი დღეში უნდა იყოს დადებითი')
  })).optional()
})

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

    return NextResponse.json({
      success: true,
      product: product
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
      where: { id: productId }
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
      stock: v.stock,
      price: v.price,
      sizeSystem: v.sizeSystem ?? validatedData.sizeSystem
    })))
    
    const uniqueSlug = await ensureUniqueProductSlug(validatedData.slug, {
      excludeProductId: productId
    })

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        name: validatedData.name,
        slug: uniqueSlug,
        brand: validatedData.brand,
        description: validatedData.description,
        // SKU is not updated - keep existing unique code
        gender: validatedData.gender,
        color: validatedData.color,
        location: validatedData.location,
        sizeSystem: validatedData.sizeSystem,
        size: validatedData.size,
        isNew: validatedData.isNew,
        discount: validatedData.discount,
        rating: validatedData.rating,
        categoryId: validatedData.categoryId,
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
            stock: variant.stock,
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
      },
      include: { 
        images: true, 
        variants: true, 
        category: true,
        rentalPriceTiers: {
          orderBy: { minDays: 'asc' }
        }
      }
    })
    
    console.log('=== PRODUCT UPDATED SUCCESSFULLY ===')
    console.log('Updated product:', JSON.stringify(updatedProduct, null, 2))

    // If product status is AVAILABLE, delete all order items for this product
    if (validatedData.status === 'AVAILABLE' && existingProduct.status !== 'AVAILABLE') {
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
