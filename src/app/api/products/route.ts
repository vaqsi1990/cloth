import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateUniqueSKU } from '@/utils/skuUtils'

// Product validation schema
const productSchema = z.object({
  name: z.string().min(1, 'სახელი აუცილებელია'),
  slug: z.string().min(1, 'Slug აუცილებელია'),
  brand: z.string().optional(),
  description: z.string().optional(),
  stock: z.number().min(0, 'საწყობი უნდა იყოს დადებითი').default(0),
  gender: z.enum(['MEN', 'WOMEN', 'CHILDREN', 'UNISEX']).default('UNISEX'),
  color: z.string().optional(),
  location: z.string().optional(),
  sizeSystem: z.enum(['EU', 'US', 'UK', 'CN']).optional(),
  size: z.string().optional(),
  isNew: z.boolean().default(false),
  discount: z.number().int().min(0).max(100).optional(),
  rating: z.number().min(0).max(5).optional(),
  categoryId: z.number().optional(),
  isRentable: z.boolean().default(true),
  pricePerDay: z.number().min(0, 'ფასი უნდა იყოს დადებითი').optional(),
  maxRentalDays: z.number().optional(),
  deposit: z.number().min(0, 'გირაო უნდა იყოს დადებითი').optional(),
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

// GET - Fetch all products
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const gender = searchParams.get('gender')
    const isNew = searchParams.get('isNew')
    
    // Show products based on status
    // All users see AVAILABLE, RENTED, and RESERVED products
    // Only MAINTENANCE products are hidden from non-admin users
    const isAdmin = session?.user?.role === 'ADMIN'
    
    const products = await prisma.product.findMany({
      where: {
        ...(isAdmin ? {} : { 
          status: {
            not: 'MAINTENANCE' // Non-admin users don't see maintenance products
          }
        }),
        ...(category && category !== 'ALL' ? { 
          category: { 
            slug: category === 'DRESSES' ? 'dresses' :
                  category === 'TOPS' ? 'tops' :
                  category === 'BOTTOMS' ? 'bottoms' :
                  category === 'OUTERWEAR' ? 'outerwear' :
                  category === 'ACCESSORIES' ? 'accessories' : category
          } 
        } : {}),
        ...(gender && gender !== 'ALL' ? { 
          gender: gender === 'women' ? 'WOMEN' as const :
                  gender === 'men' ? 'MEN' as const :
                  gender === 'children' ? 'CHILDREN' as const : undefined
        } : {}),
        ...(isNew === 'true' ? { isNew: true } : {})
      },
      include: {
        category: true,
        images: {
          orderBy: { position: 'asc' }
        },
        variants: true,
        rentalPriceTiers: {
          orderBy: { minDays: 'asc' }
        },
        user: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
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
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user is blocked
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { 
        blocked: true 
      }
    })

    if (user?.blocked) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Your account requires identity verification. Please upload a document.',
          blocked: true
        },
        { status: 403 }
      )
    }

    const body = await request.json()
    
    // Validate the request body
    const validatedData = productSchema.parse(body)
    
    console.log('Creating product with data:', validatedData)
    
    // Generate unique SKU for the product
    const uniqueSKU = await generateUniqueSKU()
    
    // Create product in database using Prisma
    const newProduct = await prisma.product.create({
      data: {
        name: validatedData.name,
        slug: validatedData.slug,
        brand: validatedData.brand,
        description: validatedData.description,
        sku: uniqueSKU, // Auto-generated unique SKU
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
        deposit: validatedData.deposit,
        status: validatedData.status,
        userId: session.user.id, // Associate product with user
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
            price: variant.price,
            sizeSystem: variant.sizeSystem ?? validatedData.sizeSystem
          }))
        },
        // Create rental price tiers if provided
        rentalPriceTiers: validatedData.rentalPriceTiers ? {
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