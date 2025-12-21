import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { processExpiredDiscount } from '@/utils/discountUtils'

// Cart item validation schema
const cartItemSchema = z.object({
  productId: z.number(),
  productName: z.string(),
  image: z.string().optional(),
  size: z.string(),
  price: z.number(),
  quantity: z.number().min(1),
  // Rental fields
  isRental: z.boolean().optional(),
  rentalStartDate: z.string().optional(),
  rentalEndDate: z.string().optional(),
  rentalDays: z.number().optional()
})

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
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                discount: true,
                discountDays: true,
                discountStartDate: true,
                images: {
                  select: {
                    url: true,
                    alt: true
                  }
                },
                rentalPriceTiers: {
                  orderBy: { minDays: 'asc' }
                },
                user: {
                  select: {
                    id: true,
                    pickupAddress: true
                  }
                }
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })

    if (!cart) {
      // Create new cart
      cart = await prisma.cart.create({
        data: {
          userId: session.user.id
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  discount: true,
                  discountDays: true,
                  discountStartDate: true,
                  images: {
                    select: {
                      url: true,
                      alt: true
                    }
                  },
                  user: {
                    select: {
                      id: true,
                      pickupAddress: true
                    }
                  }
                }
              }
            },
            orderBy: {
              createdAt: 'desc'
            }
          }
        }
      })
    }

    // Process items and check for expired discounts
    const processedItems = cart.items.map(item => {
      const product = item.product ? processExpiredDiscount(item.product) : null
      const discount = product?.discount && product.discount > 0 ? product.discount : null
      const finalPrice = discount ? (item.price - discount) : item.price
      
      return {
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        image: item.image || item.product?.images?.[0]?.url,
        size: item.size,
        price: item.price,
        quantity: item.quantity,
        isRental: item.isRental,
        rentalStartDate: item.rentalStartDate?.toISOString(),
        rentalEndDate: item.rentalEndDate?.toISOString(),
        rentalDays: item.rentalDays,
        discount: discount,
        discountDays: product?.discountDays ?? null,
        discountStartDate: product?.discountStartDate?.toISOString() ?? null,
        sellerPickupAddress: item.product?.user?.pickupAddress || null
      }
    })

    return NextResponse.json({
      success: true,
      cart: {
        id: cart.id,
        items: processedItems,
        totalItems: cart.items.reduce((sum, item) => sum + item.quantity, 0),
        totalPrice: processedItems.reduce((sum, item) => {
          const itemPrice = item.discount && item.discount > 0 
            ? (item.price - item.discount) 
            : item.price
          return sum + (itemPrice * item.quantity)
        }, 0)
      }
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
      console.log('Item already exists, updating quantity')
      // Update quantity if it's a purchase item
      if (!validatedData.isRental) {
        const updatedItem = await prisma.cartItem.update({
          where: { id: existingItem.id },
          data: {
            quantity: existingItem.quantity + validatedData.quantity
          }
        })
        console.log('Updated item:', updatedItem)
        return NextResponse.json({
          success: true,
          message: 'Item quantity updated in cart'
        })
      } else {
        console.log('Rental item already exists, returning error')
        return NextResponse.json({
          success: false,
          message: 'Rental item already exists in cart'
        }, { status: 400 })
      }
    } else {
      // Add new item to cart
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: validatedData.productId,
          productName: validatedData.productName,
          image: validatedData.image,
          size: validatedData.size,
          price: validatedData.price,
          quantity: validatedData.quantity,
          isRental: validatedData.isRental || false,
          rentalStartDate: validatedData.rentalStartDate ? new Date(validatedData.rentalStartDate) : null,
          rentalEndDate: validatedData.rentalEndDate ? new Date(validatedData.rentalEndDate) : null,
          rentalDays: validatedData.rentalDays
        }
      })
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
