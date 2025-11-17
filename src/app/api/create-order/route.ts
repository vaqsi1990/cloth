import { NextRequest, NextResponse } from 'next/server'
import axios, { AxiosError } from 'axios'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { recordSellerTransactions } from '@/utils/sellerTransactions'
// Email functions - uncomment if available
// import { sendOrderReceipt, sendOrderToAdmin } from '@/lib/email'
import { bogTokenManager } from '@/lib/bog-token'
import { z } from 'zod'

// Type definitions
interface CartItemInput {
  productId: string | number
  id?: string | number
  qty: string | number
  price: string | number
  name?: string
  image?: string
}

interface OrderDataInput {
  cart: {
    items: CartItemInput[]
  }
  totalAmount: string | number
  orderId: string
  deliveryOption?: string
  address?: {
    firstName: string
    lastName: string
    email: string
  }
  paymentMethod?: 'google_pay' | 'card'
  googlePayToken?: string
}

interface BOGBasketItem {
  quantity: number
  unit_price: number
  product_id: string
}

interface BOGRequestData {
  callback_url: string
  external_order_id: string
  purchase_units: {
    currency: string
    total_amount: number
    basket: BOGBasketItem[]
  }
  redirect_urls: {
    success: string
    fail: string
  }
  payment_method?: string[]
  config?: {
    google_pay: {
      external: boolean
      google_pay_token: string
    }
  }
}

interface BOGResponse {
  links?: {
    redirect?: { href: string }
    approve?: { href: string }
  }
  _links?: {
    redirect?: { href: string }
    approve?: { href: string }
  }
  id?: string
  order_id?: string
  status?: string
}

// Validation schema
const orderDataSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  orderData: z.object({
    cart: z.object({
      items: z.array(z.object({
        productId: z.union([z.string(), z.number()]),
        id: z.union([z.string(), z.number()]).optional(),
        qty: z.union([z.string(), z.number()]),
        price: z.union([z.string(), z.number()]),
        name: z.string().optional(),
        image: z.string().optional()
      })).min(1, 'Cart must have at least one item')
    }),
    totalAmount: z.union([z.string(), z.number()]),
    orderId: z.string().min(1, 'Order ID is required'),
    deliveryOption: z.string().optional(),
    address: z.object({
      firstName: z.string(),
      lastName: z.string(),
      email: z.string().email()
    }).optional(),
    paymentMethod: z.enum(['google_pay', 'card']).optional(),
    googlePayToken: z.string().optional()
  })
})

/**
 * Validate and transform cart items for BOG API
 */
function transformCartItemsToBasket(items: CartItemInput[]): BOGBasketItem[] {
  return items.map((item, index) => {
    // Validate and parse quantity
    const quantity = typeof item.qty === 'string' ? parseInt(item.qty, 10) : item.qty
    if (isNaN(quantity) || quantity <= 0) {
      throw new Error(`Invalid quantity for item at index ${index}: ${item.qty}`)
    }

    // Validate and parse price
    const unitPrice = typeof item.price === 'string' ? parseFloat(item.price) : item.price
    if (isNaN(unitPrice) || unitPrice <= 0) {
      throw new Error(`Invalid price for item at index ${index}: ${item.price}`)
    }

    // Get product ID (prefer productId, fallback to id)
    const productIdRaw = item.productId || item.id
    if (!productIdRaw) {
      throw new Error(`Missing product ID for item at index ${index}`)
    }
    
    // Convert product ID to string (BOG expects string)
    const productId = String(productIdRaw)

    return {
      quantity,
      unit_price: unitPrice,
      product_id: productId
    }
  })
}

/**
 * Extract redirect URL from BOG API response
 */
function extractRedirectUrl(responseData: BOGResponse): string {
  const { links, _links, id, order_id } = responseData
  
  // Try to get redirect URL from links
  const allLinks = links || _links || {}
  const redirectUrl = allLinks.redirect?.href || allLinks.approve?.href
  
  if (redirectUrl) {
    return redirectUrl
  }

  // Fallback: construct URL from order ID
  const bogOrderId = id || order_id
  if (bogOrderId) {
    return `https://www.dressla.ge?order_id=${bogOrderId}`
  }

  throw new Error('Redirect URL not found in BOG response and could not be constructed')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // Validate request body
    const validated = orderDataSchema.parse(body)
    const { token, orderData } = validated

    // Validate token (even though we use bogTokenManager, we still check it's provided)
    if (!token) {
      return NextResponse.json(
        { error: 'Missing token' },
        { status: 400 }
      )
    }

    const { cart, totalAmount, orderId } = orderData
    const items = cart.items

    // Validate that cart has items
    if (items.length === 0) {
      return NextResponse.json(
        { error: 'Cart is empty' },
        { status: 400 }
      )
    }

    // Transform cart items for BOG API
    const basket = transformCartItemsToBasket(items)
    // Validate and parse total amount
    const totalAmountNumber = typeof totalAmount === 'string' 
      ? parseFloat(totalAmount) 
      : totalAmount
    
    if (isNaN(totalAmountNumber) || totalAmountNumber <= 0) {
      return NextResponse.json(
        { error: `Invalid total amount: ${totalAmount}` },
        { status: 400 }
      )
    }

    // Calculate total from basket to ensure consistency
    const calculatedTotal = basket.reduce(
      (sum, item) => sum + (item.quantity * item.unit_price),
      0
    )

    // Warn if totals don't match (but don't fail the request)
    if (Math.abs(calculatedTotal - totalAmountNumber) > 0.01) {
      console.warn(
        `Total amount mismatch: calculated=${calculatedTotal}, provided=${totalAmountNumber}`
      )
    }

    // Get session and create order in database FIRST (before calling BOG)
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'User not authenticated' },
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
          error: 'Your account requires identity verification. Please upload a document.',
          blocked: true
        },
        { status: 403 }
      )
    }

    // Get the user's cart
    const userCart = await prisma.cart.findFirst({
      where: { userId: session.user.id },
      include: { items: true }
    })

    if (!userCart || userCart.items.length === 0) {
      return NextResponse.json(
        { error: 'Cart not found or empty' },
        { status: 400 }
      )
    }

    // Ensure the cart is properly linked to the user
    if (userCart.userId !== session.user.id) {
      await prisma.cart.update({
        where: { id: userCart.id },
        data: { userId: session.user.id }
      })
    }

    // Transform cart items to order items
    const orderItems = userCart.items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      image: item.image || null,
      size: item.size || null,
      price: item.price,
      quantity: item.quantity,
      isRental: item.isRental || false,
      rentalStartDate: item.rentalStartDate || null,
      rentalEndDate: item.rentalEndDate || null,
      rentalDays: item.rentalDays || null,
      deposit: item.deposit || null
    }))

    // Create the order in database FIRST (before calling BOG)
    let databaseOrder
    try {
      databaseOrder = await prisma.order.create({
        data: {
          userId: session.user.id,
          customerName: orderData.address 
            ? `${orderData.address.firstName} ${orderData.address.lastName}`
            : session.user.name || 'Customer',
          phone: session.user.phone || '',
          email: orderData.address?.email || session.user.email || null,
          address: orderData.deliveryOption || '',
          city: null,
          paymentMethod: 'BOG Card Payment',
          total: totalAmountNumber,
          status: 'PENDING',
          items: {
            create: orderItems
          }
        },
        include: {
          items: true,
          user: true
        }
      })

      console.log(`✅ Order created in database: ${databaseOrder.id}`)
    } catch (orderError) {
      console.error('❌ Error creating order in database:', orderError)
      return NextResponse.json(
        {
          error: 'Failed to create order in database',
          message: orderError instanceof Error ? orderError.message : 'Unknown error occurred',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      )
    }

    // Use database order ID in redirect URLs and as external_order_id
    const databaseOrderId = databaseOrder.id.toString()

    // Prepare the request data for BOG
    const bogRequestData: BOGRequestData = {
      callback_url: 'https://www.dressla.ge/api/payment-callback',
      external_order_id: databaseOrderId,
      purchase_units: {
        currency: 'GEL',
        total_amount: totalAmountNumber,
        basket: basket
      },
      redirect_urls: {
        success: `https://www.dressla.ge/order-confirmation?status=success&orderId=${databaseOrder.id}`,
        fail: `https://www.dressla.ge/payment-fail?orderId=${databaseOrder.id}`
      },
      ...(orderData.paymentMethod === 'google_pay' && orderData.googlePayToken ? {
        payment_method: ['google_pay'],
        config: {
          google_pay: {
            external: true,
            google_pay_token: orderData.googlePayToken
          }
        }
      } : {})
    }

    // Use token manager for automatic token refresh and retry
    console.log('🔑 Creating BOG payment order...')
    let response
    let bogOrderId
    
    try {
      response = await bogTokenManager.makeAuthenticatedRequest(
        async (validToken) => {
          return axios.post<BOGResponse>(
            'https://api.bog.ge/payments/v1/ecommerce/orders',
            bogRequestData,
            {
              headers: {
                Authorization: `Bearer ${validToken}`,
                'Accept-Language': 'ka',
                'Content-Type': 'application/json'
              },
              timeout: 30000
            }
          )
        }
      )

      console.log('✅ BOG API response received:', {
        status: response.status,
        orderId: response.data.id || response.data.order_id
      })

      // Extract redirect URL from BOG response
      bogOrderId = response.data.id || response.data.order_id

      // Update order with BOG payment ID
      await prisma.order.update({
        where: { id: databaseOrder.id },
        data: { paymentId: bogOrderId || null }
      })

      console.log(`✅ Order ${databaseOrder.id} updated with BOG payment ID: ${bogOrderId}`)

      // Check if payment is completed (for Google Pay, it might complete immediately)
      const paymentStatus = response.data.status
      if (paymentStatus === 'completed' && orderData.paymentMethod === 'google_pay') {
        // Update order status to PAID
        await prisma.order.update({
          where: { id: databaseOrder.id },
          data: { status: 'PAID' }
        })

        // Record seller transactions
        await recordSellerTransactions(databaseOrder.id)

        // Clear the cart after successful order creation
        await prisma.cartItem.deleteMany({
          where: { cartId: userCart.id }
        })

        console.log(`✅ Cart cleared for user: ${session.user.id}`)

        return NextResponse.json({
          success: true,
          orderId: databaseOrder.id,
          bogOrderId: bogOrderId || undefined,
          status: 'completed'
        })
      }

      // For regular card payments, extract redirect URL
      const finalRedirectUrl = extractRedirectUrl(response.data)

      // Send order receipt email to customer (non-blocking)
      // Uncomment if email functions are available
      // if (orderData.address?.email) {
      //   try {
      //     const customerName = orderData.address.firstName 
      //       ? `${orderData.address.firstName} ${orderData.address.lastName}`
      //       : 'Customer'
      //     await sendOrderReceipt(orderData.address.email, databaseOrder, customerName)
      //   } catch (emailError) {
      //     console.error('Failed to send order receipt email:', emailError)
      //   }
      // }

      // Send order info to admin (non-blocking)
      // Uncomment if email functions are available
      // try {
      //   await sendOrderToAdmin(databaseOrder)
      // } catch (adminEmailError) {
      //   console.error('Failed to send admin notification email:', adminEmailError)
      // }

      // Clear the cart after successful order creation
      await prisma.cartItem.deleteMany({
        where: { cartId: userCart.id }
      })

      console.log(`✅ Cart cleared for user: ${session.user.id}`)

      return NextResponse.json({
        success: true,
        redirectUrl: finalRedirectUrl,
        orderId: databaseOrder.id,
        bogOrderId: bogOrderId || undefined
      })

    } catch (bogError) {
      console.error('❌ Error creating BOG payment order:', bogError)
      
      // If BOG fails, we should delete the order we created (rollback)
      try {
        await prisma.order.delete({
          where: { id: databaseOrder.id }
        })
        console.log(`✅ Rolled back order ${databaseOrder.id} due to BOG payment failure`)
      } catch (deleteError) {
        console.error('❌ Error rolling back order:', deleteError)
      }
      
      // Re-throw to be handled by outer catch block
      throw bogError
    }
  } catch (error) {
    console.error('❌ Error in create-order endpoint:', error)

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.issues,
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      )
    }

    // Handle BOG API errors
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ message?: string; error?: string }>
      const errorMessage = axiosError.response?.data?.message 
        || axiosError.response?.data?.error 
        || 'BOG API error'
      
      return NextResponse.json(
        {
          error: errorMessage,
          details: axiosError.response?.data || {},
          timestamp: new Date().toISOString()
        },
        { status: axiosError.response?.status || 500 }
      )
    }

    // Handle other errors
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Order creation failed'

    return NextResponse.json(
      {
        error: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
