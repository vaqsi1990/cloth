import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateUniqueSKU } from '@/utils/skuUtils'
import { ensureUniqueProductSlug } from '@/lib/productSlug'
import { checkAndClearExpiredDiscounts, processExpiredDiscount } from '@/utils/discountUtils'

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

// GET - Fetch all products
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const gender = searchParams.get('gender')
    const isNew = searchParams.get('isNew')
    const search = searchParams.get('search')?.trim()
    
    // Show products based on status
    // All users see AVAILABLE, RENTED, and RESERVED products
    // Only MAINTENANCE products are hidden from non-admin users
    const isAdmin = session?.user?.role === 'ADMIN'
    
    const products = await prisma.product.findMany({
      where: {
        ...(isAdmin ? {} : { 
          status: {
            not: 'MAINTENANCE' // Non-admin users don't see maintenance products
          },
          approvalStatus: 'APPROVED',
          user: {
            blocked: false
          }
        }),
        ...(search ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } }
          ]
        } : {}),
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

    // Check and clear expired discounts
    const productIds = products
      .filter(p => p.discount && p.discountDays && p.discountStartDate)
      .map(p => p.id)
    
    if (productIds.length > 0) {
      await checkAndClearExpiredDiscounts(productIds)
      // Re-fetch products to get updated data
      const updatedProducts = await prisma.product.findMany({
        where: {
          ...(isAdmin ? {} : { 
            status: {
              not: 'MAINTENANCE'
            },
            approvalStatus: 'APPROVED',
            user: {
              blocked: false
            }
          }),
          ...(search ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
              { sku: { contains: search, mode: 'insensitive' } }
            ]
          } : {}),
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
        products: updatedProducts.map(processExpiredDiscount)
      })
    }

    return NextResponse.json({
      success: true,
      products: products.map(processExpiredDiscount)
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
      rentalPriceTiers: {
        orderBy: { minDays: 'asc' as const }
      }
    }

    const uniqueSlug = await ensureUniqueProductSlug(validatedData.slug)

    // Create product in database using Prisma (approval fields rely on DB defaults)
    const createdProduct = await prisma.product.create({
      data: {
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
        categoryId: validatedData.categoryId,
        isRentable: validatedData.isRentable,
        pricePerDay: validatedData.pricePerDay,
        maxRentalDays: validatedData.maxRentalDays,
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
            price: variant.price
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