import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Product validation schema
const productSchema = z.object({
  name: z.string().min(1, 'სახელი აუცილებელია'),
  slug: z.string().min(1, 'Slug აუცილებელია').regex(/^[a-z0-9-]+$/, 'Slug უნდა შეიცავდეს მხოლოდ პატარა ასოებს, ციფრებს და ტირეებს'),
  description: z.string().optional(),
  stock: z.number().min(0, 'საწყობი უნდა იყოს დადებითი').default(0),
  gender: z.enum(['MEN', 'WOMEN', 'CHILDREN', 'UNISEX']).default('UNISEX'),
  color: z.string().optional(),
  isNew: z.boolean().default(false),
  hasSale: z.boolean().default(false),
  rating: z.number().min(0).max(5).optional(),
  categoryId: z.number().optional(),
  isRentable: z.boolean().default(false),
  pricePerDay: z.number().min(0, 'ფასი უნდა იყოს დადებითი').optional(),
  maxRentalDays: z.number().optional(),
  deposit: z.number().min(0, 'გირაო უნდა იყოს დადებითი').optional(),
  variants: z.array(z.object({
    size: z.string().min(1, 'ზომა აუცილებელია'),
    stock: z.number().min(0, 'საწყობი უნდა იყოს დადებითი'),
    price: z.number().min(0, 'ფასი უნდა იყოს დადებითი')
  })).default([]),
  imageUrls: z.array(z.string().min(1, 'URL აუცილებელია')).default([])
})

// GET - Fetch single product by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
        images: {
          orderBy: { position: 'asc' }
        },
        variants: true
      }
    })

    if (!product) {
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
    console.log('Each variant:', validatedData.variants.map(v => ({ size: v.size, stock: v.stock, price: v.price })))
    
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        name: validatedData.name,
        slug: validatedData.slug,
        description: validatedData.description,
        sku: `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Generate unique SKU
        gender: validatedData.gender,
        color: validatedData.color,
        isNew: validatedData.isNew,
        hasSale: validatedData.hasSale,
        rating: validatedData.rating,
        categoryId: validatedData.categoryId,
        isRentable: validatedData.isRentable,
        pricePerDay: validatedData.pricePerDay,
        maxRentalDays: validatedData.maxRentalDays,
        deposit: validatedData.deposit,
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
        }
      },
      include: { images: true, variants: true, category: true }
    })
    
    console.log('=== PRODUCT UPDATED SUCCESSFULLY ===')
    console.log('Updated product:', JSON.stringify(updatedProduct, null, 2))

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
