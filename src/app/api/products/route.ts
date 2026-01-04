import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateUniqueSKU } from '@/utils/skuUtils'
import { ensureUniqueProductSlug } from '@/lib/productSlug'
import { checkAndClearExpiredDiscounts, processExpiredDiscount } from '@/utils/discountUtils'
import { PURPOSE_NAME_BY_SLUG } from '@/data/purposes'

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
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const gender = searchParams.get('gender')
    const isNew = searchParams.get('isNew')
    const purpose = searchParams.get('purpose')
    const search = searchParams.get('search')?.trim()
    const cursor = searchParams.get('cursor')
    const cursorId = cursor ? parseInt(cursor, 10) : undefined
    
    // Show products based on status
    // RESERVED products are hidden from everyone (used for sold products)
    // MAINTENANCE and DAMAGED products are hidden from non-admin users
    const isAdmin = session?.user?.role === 'ADMIN'
    
    if (process.env.NODE_ENV === 'development') {
      console.time("db")
    }
    const products = await prisma.product.findMany({
      // @ts-ignore - cacheStrategy is available with Prisma Accelerate
      cacheStrategy: {
        swr: 60, // Stale-while-revalidating for 60 seconds
        ttl: 60, // Cache results for 60 seconds
      },
      take: 21, // Take one extra to check if there's more
      ...(cursorId ? {
        cursor: { id: cursorId },
        skip: 1
      } : {}),
      where: {
        // RESERVED products are hidden from everyone, including admins (sold products)
        status: {
          notIn: isAdmin 
            ? ['RESERVED'] // Admins don't see RESERVED (sold) products
            : ['MAINTENANCE', 'DAMAGED', 'RESERVED'] // Non-admin users don't see maintenance, damaged, or reserved (sold) products
        },
        ...(isAdmin ? {} : { 
          approvalStatus: 'APPROVED',
          user: {
            blocked: false
          }
        }),
        ...(search ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } },
            { brand: { contains: search, mode: 'insensitive' } },
            { category: { name: { contains: search, mode: 'insensitive' } } },
            { purpose: { name: { contains: search, mode: 'insensitive' } } }
            // Removed: description, color, location, purpose.slug, user.name for better performance
            // These can be added back if needed, but they slow down the query
          ]
        } : {}),
        ...(category && category !== 'ALL' ? { 
          category: {
            slug: category === 'DRESSES' ? 'dresses' :
                  category === 'TOPS' ? 'tops' :
                  category === 'BOTTOMS' ? 'bottoms' :
                  category === 'OUTERWEAR' ? 'outerwear' :
                  category === 'ACCESSORIES' ? 'accessories' : category.toLowerCase()
          }
        } : {}),
        ...(purpose ? {
          purpose: {
            slug: purpose
          }
        } : {}),
        ...(gender && gender !== 'ALL' ? { 
          gender: gender === 'women' ? 'WOMEN' as const :
                  gender === 'men' ? 'MEN' as const :
                  gender === 'children' ? 'CHILDREN' as const : undefined
        } : {}),
        ...(isNew === 'true' ? { isNew: true } : {})
      },
      select: {
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
        sizeSystem: true,
        size: true,
        isNew: true,
        discount: true,
        discountDays: true,
        discountStartDate: true,
        rating: true,
        categoryId: true,
        purposeId: true,
        userId: true,
        isRentable: true,
        pricePerDay: true,
        maxRentalDays: true,
        status: true,
        approvalStatus: true,
        createdAt: true,
        updatedAt: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        purpose: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        images: {
          select: {
            id: true,
            url: true,
            alt: true,
            position: true
          },
          orderBy: { position: 'asc' },
          take: 5 // Limit images to first 5 for better performance
        },
        variants: {
          select: {
            id: true,
            price: true
          }
        },
        rentalPriceTiers: {
          select: {
            id: true,
            minDays: true,
            pricePerDay: true
          },
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
      orderBy: [
        { createdAt: 'desc' },
        { id: 'desc' }
      ]
    })
    if (process.env.NODE_ENV === 'development') {
      console.timeEnd("db")
      console.log("finish")
    }

    // Check and clear expired discounts
    // First, identify which products have expired discounts (in memory)
    const productsWithExpiredDiscounts = products
      .filter(p => {
        if (!p.discount || !p.discountDays || !p.discountStartDate) {
          return false
        }
        const expirationDate = new Date(p.discountStartDate)
        expirationDate.setDate(expirationDate.getDate() + p.discountDays)
        return new Date() > expirationDate
      })
    
    // Clear expired discounts in DB (only for products that actually have expired discounts)
    // Update products in memory first for immediate response
    if (productsWithExpiredDiscounts.length > 0) {
      const expiredProductIds = productsWithExpiredDiscounts.map(p => p.id)
      
      // Update products in memory immediately
      products.forEach(product => {
        if (expiredProductIds.includes(product.id)) {
          product.discount = null
          product.discountDays = null
          product.discountStartDate = null
        }
      })
      
      // Update DB asynchronously (don't wait for it)
      prisma.product.updateMany({
        where: {
          id: { in: expiredProductIds }
        },
        data: {
          discount: null,
          discountDays: null,
          discountStartDate: null,
        }
      }).catch(err => {
        console.error('Error clearing expired discounts:', err)
      })
    }

    // Check if there's more data
    const hasMore = products.length > 20
    const productsToReturn = hasMore ? products.slice(0, 20) : products
    
    // Determine next cursor (last product's id if we got a full page)
    const nextCursor = hasMore && productsToReturn.length > 0
      ? productsToReturn[productsToReturn.length - 1].id.toString()
      : null

    const response = NextResponse.json({
      success: true,
      products: productsToReturn.map(processExpiredDiscount),
      nextCursor,
      hasMore
    })
    
    // Add cache headers for better performance (cache for 30 seconds)
    // Only cache if no search/filter is applied (static content)
    if (!search && !category && !purpose && !gender && !isNew) {
      response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60')
    }
    
    return response
    
  } catch (error) {
    console.timeEnd("db")
    console.log("finish")
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