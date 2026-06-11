import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { processExpiredDiscount } from '@/utils/discountUtils'
import { assertRentalInquiryApproved, markInquiryBooked } from '@/lib/rental-inquiry-guard'
import {
  MAX_CART_ITEMS,
  MAX_CART_ITEM_QUANTITY,
  CART_SINGLE_ITEM_MESSAGE,
} from '@/lib/cart-limits'
import {
  fromPrismaDeliverySpeed,
  getDeliveryPriceForCity,
  toPrismaDeliverySpeed,
} from '@/lib/delivery'

// Cart item validation schema
const cartItemSchema = z.object({
  productId: z.number(),
  productName: z.string(),
  image: z.string().optional(),
  size: z.string(),
  price: z.number(),
  quantity: z.number().min(1).max(MAX_CART_ITEM_QUANTITY),
  // Rental fields
  isRental: z.boolean().optional(),
  rentalStartDate: z.string().optional(),
  rentalEndDate: z.string().optional(),
  rentalDays: z.number().optional()
})

const cartDeliverySchema = z.object({
  deliveryType: z.enum(['pickup', 'delivery']),
  deliveryCityId: z.number().nullable().optional(),
  deliverySpeed: z.enum(['extra', 'standard']).nullable().optional(),
})

const cartSelect = {
  id: true,
  deliveryType: true,
  deliveryCityId: true,
  deliverySpeed: true,
  deliveryPrice: true,
  deliveryCity: {
    select: {
      id: true,
      name: true,
      extraPrice: true,
      standardPrice: true,
    },
  },
  items: {
    select: {
      id: true,
      productId: true,
      productName: true,
      image: true,
      size: true,
      price: true,
      quantity: true,
      isRental: true,
      rentalStartDate: true,
      rentalEndDate: true,
      rentalDays: true,
      product: {
        select: {
          id: true,
          name: true,
          allowsPickup: true,
          pickupAddress: true,
          discount: true,
          discountDays: true,
          discountStartDate: true,
          images: {
            select: {
              url: true,
              alt: true,
            },
          },
          rentalPriceTiers: {
            select: {
              id: true,
              minDays: true,
              pricePerDay: true,
              productId: true,
            },
            orderBy: { minDays: 'asc' as const },
          },
          user: {
            select: {
              id: true,
              pickupAddress: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc' as const,
    },
  },
} as const

function cartPickupAvailable(
  items: Array<{ product: { allowsPickup: boolean } | null }>,
): boolean {
  if (items.length === 0) {
    return true
  }
  return items.every((item) => item.product?.allowsPickup === true)
}

function buildCartResponse(cart: {
  id: number
  deliveryType: string | null
  deliveryCityId: number | null
  deliverySpeed: import('@prisma/client').DeliverySpeed | null
  deliveryPrice: number | null
  deliveryCity: {
    id: number
    name: string
    extraPrice: number
    standardPrice: number
  } | null
  items: Array<{
    id: number
    productId: number | null
    productName: string
    image: string | null
    size: string | null
    price: number
    quantity: number
    isRental: boolean | null
    rentalStartDate: Date | null
    rentalEndDate: Date | null
    rentalDays: number | null
    product: {
      id: number
      name: string
      allowsPickup: boolean
      pickupAddress: string | null
      discount: number | null
      discountDays: number | null
      discountStartDate: Date | null
      images: Array<{ url: string; alt: string | null }>
      rentalPriceTiers: Array<{
        id: number
        minDays: number
        pricePerDay: number
        productId: number
      }>
      user: { id: string; pickupAddress: string | null } | null
    } | null
  }>
}) {
  const processedItems = cart.items.map((item) => {
    const product = item.product ? processExpiredDiscount(item.product) : null
    const discount = product?.discount && product.discount > 0 ? product.discount : null

    return {
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      image: item.image || item.product?.images?.[0]?.url,
      size: item.size,
      price: item.price,
      quantity: item.quantity,
      isRental: item.isRental ?? false,
      rentalStartDate: item.rentalStartDate?.toISOString(),
      rentalEndDate: item.rentalEndDate?.toISOString(),
      rentalDays: item.rentalDays,
      discount,
      discountDays: product?.discountDays ?? null,
      discountStartDate: product?.discountStartDate?.toISOString() ?? null,
      sellerPickupAddress: item.product?.pickupAddress?.trim() || null,
    }
  })

  const itemsTotal = processedItems.reduce((sum, item) => {
    const itemPrice =
      item.discount && item.discount > 0 ? item.price - item.discount : item.price
    return sum + itemPrice * item.quantity
  }, 0)

  const deliverySpeed = fromPrismaDeliverySpeed(cart.deliverySpeed)
  const pickupAvailable = cartPickupAvailable(cart.items)
  const effectiveDeliveryType =
    !pickupAvailable && cart.deliveryType === 'pickup'
      ? 'delivery'
      : ((cart.deliveryType as 'pickup' | 'delivery' | null) || 'pickup')

  return {
    id: cart.id,
    items: processedItems,
    totalItems: cart.items.reduce((sum, item) => sum + item.quantity, 0),
    totalPrice: itemsTotal,
    pickupAvailable,
    delivery: {
      type: effectiveDeliveryType,
      cityId: cart.deliveryCityId,
      cityName: cart.deliveryCity?.name || null,
      speed: deliverySpeed,
      price: cart.deliveryPrice || 0,
    },
    totalWithDelivery:
      effectiveDeliveryType === 'delivery' && cart.deliveryPrice
        ? itemsTotal + cart.deliveryPrice
        : itemsTotal,
  }
}

async function enforceCartDeliveryRules(cartId: number) {
  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    select: cartSelect,
  })

  if (!cart) {
    return null
  }

  const pickupAvailable = cartPickupAvailable(cart.items)

  if (!pickupAvailable && cart.deliveryType === 'pickup') {
    return prisma.cart.update({
      where: { id: cartId },
      data: {
        deliveryType: 'delivery',
        deliveryCityId: null,
        deliverySpeed: null,
        deliveryPrice: null,
      },
      select: cartSelect,
    })
  }

  return cart
}

// GET - Fetch user's cart
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        message: 'Authentication required'
      }, { status: 401 })
    }

    // Find or create cart for user
    let cart = await prisma.cart.findUnique({
      where: { userId: session.user.id },
      // @ts-ignore - cacheStrategy is available with Prisma Accelerate
      cacheStrategy: {
        swr: 60, // Stale-while-revalidating for 60 seconds
        ttl: 60, // Cache results for 60 seconds
      },
      select: cartSelect,
    })

    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          userId: session.user.id,
          deliveryType: 'pickup',
        },
        select: cartSelect,
      })
    }

    const normalizedCart = (await enforceCartDeliveryRules(cart.id)) || cart

    return NextResponse.json({
      success: true,
      cart: buildCartResponse(normalizedCart),
    })

  } catch (error) {
    console.error('Error fetching cart:', error)
    return NextResponse.json({
      success: false,
      message: 'Error fetching cart'
    }, { status: 500 })
  }
}

// POST - Add item to cart
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Cart API POST received:', body)
    
    const validatedData = cartItemSchema.parse(body)
    console.log('Validated data:', validatedData)

    const session = await getServerSession(authOptions)
    console.log('Session:', session)
    
    if (!session?.user?.id) {
      console.log('No session found, returning 401')
      return NextResponse.json({
        success: false,
        message: 'Authentication required'
      }, { status: 401 })
    }

    let approvedInquiryId = 0
    if (
      validatedData.isRental &&
      validatedData.rentalStartDate &&
      validatedData.rentalEndDate
    ) {
      const inquiryCheck = await assertRentalInquiryApproved({
        productId: validatedData.productId,
        buyerId: session.user.id,
        startDate: validatedData.rentalStartDate,
        endDate: validatedData.rentalEndDate,
        size: validatedData.size,
      })
      if (!inquiryCheck.ok) {
        return NextResponse.json({
          success: false,
          message: inquiryCheck.message,
        }, { status: 403 })
      }
      approvedInquiryId = inquiryCheck.inquiryId
    }

    // Find or create cart for user
    let cart = await prisma.cart.findUnique({
      where: { userId: session.user.id }
    })
    console.log('Found cart:', cart)

    if (!cart) {
      console.log('Creating new cart for user:', session.user.id)
      cart = await prisma.cart.create({
        data: {
          userId: session.user.id
        }
      })
      console.log('Created cart:', cart)
    }

    // Check if item already exists in cart
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId: validatedData.productId,
        size: validatedData.size,
        isRental: validatedData.isRental || false,
        rentalStartDate: validatedData.rentalStartDate ? new Date(validatedData.rentalStartDate) : null,
        rentalEndDate: validatedData.rentalEndDate ? new Date(validatedData.rentalEndDate) : null
      }
    })
    console.log('Existing item:', existingItem)

    if (existingItem) {
      return NextResponse.json({
        success: true,
        message: 'Item already in cart'
      })
    }

    const existingItemCount = await prisma.cartItem.count({
      where: { cartId: cart.id }
    })

    if (existingItemCount >= MAX_CART_ITEMS) {
      return NextResponse.json({
        success: false,
        message: CART_SINGLE_ITEM_MESSAGE
      }, { status: 400 })
    }

    const product = await prisma.product.findUnique({
      where: { id: validatedData.productId },
      select: { allowsPickup: true },
    })

    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: validatedData.productId,
        productName: validatedData.productName,
        image: validatedData.image,
        size: validatedData.size,
        price: validatedData.price,
        quantity: MAX_CART_ITEM_QUANTITY,
        isRental: validatedData.isRental || false,
        rentalStartDate: validatedData.rentalStartDate ? new Date(validatedData.rentalStartDate) : null,
        rentalEndDate: validatedData.rentalEndDate ? new Date(validatedData.rentalEndDate) : null,
        rentalDays: validatedData.rentalDays
      }
    })

    if (!product?.allowsPickup) {
      await prisma.cart.update({
        where: { id: cart.id },
        data: {
          deliveryType: 'delivery',
          deliveryCityId: null,
          deliverySpeed: null,
          deliveryPrice: null,
        },
      })
    }

    if (approvedInquiryId) {
      await markInquiryBooked(approvedInquiryId)
    }

    return NextResponse.json({
      success: true,
      message: 'Item added to cart'
    })

  } catch (error) {
    console.error('Error adding to cart:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: 'Invalid data',
        errors: error.issues
      }, { status: 400 })
    }
    return NextResponse.json({
      success: false,
      message: 'Error adding to cart'
    }, { status: 500 })
  }
}

// PATCH - Update cart delivery settings
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        message: 'Authentication required',
      }, { status: 401 })
    }

    const body = await request.json()
    const data = cartDeliverySchema.parse(body)

    let cart = await prisma.cart.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    })

    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          userId: session.user.id,
          deliveryType: 'pickup',
        },
        select: { id: true },
      })
    }

    if (data.deliveryType === 'pickup') {
      const currentCart = await prisma.cart.findUnique({
        where: { id: cart.id },
        select: cartSelect,
      })

      if (currentCart && !cartPickupAvailable(currentCart.items)) {
        return NextResponse.json({
          success: false,
          message: 'ამ პროდუქტისთვის ხელმისაწვდომია მხოლოდ მიტანა',
        }, { status: 400 })
      }

      const updatedCart = await prisma.cart.update({
        where: { id: cart.id },
        data: {
          deliveryType: 'pickup',
          deliveryCityId: null,
          deliverySpeed: null,
          deliveryPrice: null,
        },
        select: cartSelect,
      })

      return NextResponse.json({
        success: true,
        message: 'მიღების ტიპი განახლდა',
        cart: buildCartResponse(updatedCart),
      })
    }

    if (!data.deliveryCityId) {
      return NextResponse.json({
        success: false,
        message: 'აირჩიეთ მიტანის ქალაქი',
      }, { status: 400 })
    }

    if (!data.deliverySpeed) {
      return NextResponse.json({
        success: false,
        message: 'აირჩიეთ მიტანის ტიპი (ექსტრა ან სტანდარტული)',
      }, { status: 400 })
    }

    const city = await prisma.deliveryCity.findFirst({
      where: {
        id: data.deliveryCityId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        extraPrice: true,
        standardPrice: true,
      },
    })

    if (!city) {
      return NextResponse.json({
        success: false,
        message: 'მიტანის ქალაქი ვერ მოიძებნა',
      }, { status: 400 })
    }

    const deliveryPrice = getDeliveryPriceForCity(city, data.deliverySpeed)

    const updatedCart = await prisma.cart.update({
      where: { id: cart.id },
      data: {
        deliveryType: 'delivery',
        deliveryCityId: city.id,
        deliverySpeed: toPrismaDeliverySpeed(data.deliverySpeed),
        deliveryPrice,
      },
      select: cartSelect,
    })

    return NextResponse.json({
      success: true,
      message: 'მიტანის პარამეტრები განახლდა',
      cart: buildCartResponse(updatedCart),
    })
  } catch (error) {
    console.error('Error updating cart delivery:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: 'Invalid data',
        errors: error.issues,
      }, { status: 400 })
    }
    return NextResponse.json({
      success: false,
      message: 'Error updating cart delivery',
    }, { status: 500 })
  }
}

// DELETE - Clear entire cart
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        message: 'Authentication required'
      }, { status: 401 })
    }

    const cart = await prisma.cart.findUnique({
      where: { userId: session.user.id }
    })

    if (cart) {
      await prisma.cartItem.deleteMany({
        where: { cartId: cart.id }
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Cart cleared'
    })

  } catch (error) {
    console.error('Error clearing cart:', error)
    return NextResponse.json({
      success: false,
      message: 'Error clearing cart'
    }, { status: 500 })
  }
}
