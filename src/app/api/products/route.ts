import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

// Product validation schema
const productSchema = z.object({
  name: z.string().min(1, 'სახელი აუცილებელია'),
  slug: z.string().min(1, 'Slug აუცილებელია'),
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

// GET - Fetch all products
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const isNew = searchParams.get('isNew')
    
    const products = await prisma.product.findMany({
      where: {
        ...(category && category !== 'ALL' ? { 
          category: { 
            slug: category === 'DRESSES' ? 'dresses' :
                  category === 'TOPS' ? 'tops' :
                  category === 'BOTTOMS' ? 'bottoms' :
                  category === 'OUTERWEAR' ? 'outerwear' :
                  category === 'ACCESSORIES' ? 'accessories' : category
          } 
        } : {}),
        ...(isNew === 'true' ? { isNew: true } : {})
      },
      include: {
        category: true,
        images: {
          orderBy: { position: 'asc' }
        },
        variants: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      products: products
    })
    
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
    const body = await request.json()
    
    // Validate the request body
    const validatedData = productSchema.parse(body)
    
    console.log('Creating product with data:', validatedData)
    
    // Create product in database using Prisma
    const newProduct = await prisma.product.create({
      data: {
        name: validatedData.name,
        slug: validatedData.slug,
        description: validatedData.description,
        currentPrice: validatedData.currentPrice,
        originalPrice: validatedData.originalPrice,
        sku: validatedData.stock.toString(), // Using stock as SKU for now
        isNew: validatedData.isNew,
        hasSale: validatedData.hasSale,
        rating: validatedData.rating,
        categoryId: validatedData.categoryId,
        // Create product images
        images: {
          create: validatedData.imageUrls.map((url, index) => ({
            url: url,
            alt: `${validatedData.name} - სურათი ${index + 1}`,
            position: index
          }))
        },
        // Create product variants
        variants: {
          create: validatedData.variants.map(variant => ({
            size: variant.size,
            stock: variant.stock,
            price: variant.price
          }))
        }
      },
      include: {
        images: true,
        variants: true,
        category: true
      }
    })
    
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