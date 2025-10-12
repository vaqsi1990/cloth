import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Product validation schema
const productSchema = z.object({
  name: z.string().min(1, 'სახელი აუცილებელია'),
  slug: z.string().min(1, 'Slug აუცილებელია').regex(/^[a-z0-9-]+$/, 'Slug უნდა შეიცავდეს მხოლოდ პატარა ასოებს, ციფრებს და ტირეებს'),
  description: z.string().optional(),
  currentPrice: z.number().min(0, 'ფასი უნდა იყოს დადებითი'),
  originalPrice: z.number().min(0, 'ორიგინალური ფასი უნდა იყოს დადებითი').nullable().optional(),
  stock: z.number().min(0, 'საწყობი უნდა იყოს დადებითი').default(0),
  isNew: z.boolean().default(false),
  hasSale: z.boolean().default(false),
  rating: z.number().min(0).max(5).optional(),
  categoryId: z.number().optional(),
  variants: z.array(z.object({
    size: z.string().min(1, 'ზომა აუცილებელია'),
    stock: z.number().min(0, 'საწყობი უნდა იყოს დადებითი'),
    price: z.number().min(0, 'ფასი უნდა იყოს დადებითი').nullable().optional()
  })).default([]),
  imageUrls: z.array(z.string().min(1, 'URL აუცილებელია')).default([])
})

// GET - Fetch single product by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = parseInt(params.id)
    
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

// DELETE - Delete product by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = parseInt(params.id)
    
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

// PUT - Update product by ID
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = parseInt(params.id)
    
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
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        name: validatedData.name,
        slug: validatedData.slug,
        description: validatedData.description,
        currentPrice: validatedData.currentPrice,
        originalPrice: validatedData.originalPrice,
        sku: validatedData.stock.toString(),
        isNew: validatedData.isNew,
        hasSale: validatedData.hasSale,
        rating: validatedData.rating,
        categoryId: validatedData.categoryId,
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
