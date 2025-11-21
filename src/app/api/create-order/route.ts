import { NextRequest, NextResponse } from 'next/server'
import axios, { AxiosError } from 'axios'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { recordSellerTransactions } from '@/utils/sellerTransactions'
import { reevaluateUserBlocking } from '@/utils/revenue'
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


interface BOGBasketItem {
  quantity: number
  unit_price: number
  product_id: string
}

interface BOGSplitPayment {
  amount?: number | null
  percent?: number
  iban: string
  description?: string
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
    google_pay?: {
      external: boolean
      google_pay_token: string
    }
    split?: {
      split_payments: BOGSplitPayment[]
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
    paymentMethod: z.enum(['google_pay', 'card', 'apple_pay']).optional(),
    googlePayToken: z.string().optional()
  })
})

/**
 * Validate and transform cart items for BOG API
 */
function transformCartItemsToBasket(items: CartItemInput[]): BOGBasketItem[] {
  return items.map((item, index) => {
    const quantity = typeof item.qty === 'string' ? parseInt(item.qty, 10) : item.qty
    if (isNaN(quantity) || quantity <= 0) {
      throw new Error(`Invalid quantity for item at index ${index}: ${item.qty}`)
    }

    const unitPrice = typeof item.price === 'string' ? parseFloat(item.price) : item.price
    if (isNaN(unitPrice) || unitPrice <= 0) {
      throw new Error(`Invalid price for item at index ${index}: ${item.price}`)
    }

    const productIdRaw = item.productId || item.id
    if (!productIdRaw) {
      throw new Error(`Missing product ID for item at index ${index}`)
    }

    const productId = String(productIdRaw)

    return {
      quantity,
      unit_price: unitPrice,
      product_id: productId
    }
  })
}

/**
 * Collect unique product authors and their IBANs from cart items
 * Returns a map of userId -> iban
 */
async function collectProductAuthorsIBANs(productIds: (string | number)[]): Promise<Map<string, string>> {
  const ibanMap = new Map<string, string>()
  if (productIds.length === 0) return ibanMap

  const numericIds: number[] = productIds
    .map(id => {
      if (typeof id === 'string') {
        const parsed = parseInt(id, 10)
        return isNaN(parsed) ? null : parsed
      }
      return typeof id === 'number' ? id : null
    })
    .filter((id): id is number => id !== null)

  if (numericIds.length === 0) return ibanMap

  const products = await prisma.product.findMany({
    where: { id: { in: numericIds } },
    select: {
      id: true,
      userId: true,
      user: {
        select: {
          id: true,
          iban: true
        }
      }
    }
  })

  for (const product of products) {
    if (product.userId && product.user?.iban) {
      // Validate IBAN format
      if (product.user.iban.length >= 15 && product.user.iban.length <= 34) {
        ibanMap.set(product.userId, product.user.iban)
        console.log(`✅ Found IBAN for user ${product.userId} from User table: ${product.user.iban.substring(0, 8)}...`)
      } else {
        console.warn(`⚠️ Invalid IBAN format for user ${product.userId} (length: ${product.user.iban.length})`)
      }
    } else {
      console.warn(`⚠️ Product ${product.id} author (userId: ${product.userId}) has no IBAN in User table`)
    }
  }

  return ibanMap
}

/**
 * Get admin user IBAN from database
 */
async function getAdminIBAN(): Promise<string | null> {
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
    select: { iban: true }
  })
  return admin?.iban || null
}

/**
 * Build split payment configuration for BOG
 * 9% Admin + 91% First Seller
 */
async function buildSplitPaymentConfig(
  currency: string,
  paymentMethod: string | undefined,
  productIds: (string | number)[]
): Promise<{ split_payments: BOGSplitPayment[] } | null> {
  console.log('🔍 Building split payment config:', {
    currency,
    paymentMethod,
    productIdsCount: productIds.length
  })

  if (currency !== 'GEL') {
    console.warn('⚠️ Split payment only allowed for GEL currency')
    return null
  }

  const supportedMethods = ['card', 'google_pay', 'apple_pay']
  if (!paymentMethod || !supportedMethods.includes(paymentMethod)) {
    console.warn(`⚠️ Split payment not supported for payment method: ${paymentMethod || 'undefined'}`)
    return null
  }

  const adminIban = await getAdminIBAN()
  if (!adminIban) {
    console.warn('⚠️ Admin IBAN not found! Make sure there is a user with role=ADMIN and iban field set in User table.')
    return null
  }
  
  // Validate IBAN format (should be 34 characters for Georgian IBAN)
  if (adminIban.length < 15 || adminIban.length > 34) {
    console.warn(`⚠️ Admin IBAN format seems invalid (length: ${adminIban.length}). Expected 15-34 characters.`)
  }
  
  console.log('✅ Admin IBAN found from User table:', adminIban.substring(0, 8) + '...')

  const authorsIBANs = await collectProductAuthorsIBANs(productIds)
  if (authorsIBANs.size === 0) {
    console.warn('⚠️ No seller IBAN found!')
    return null
  }

  console.log(`✅ Found ${authorsIBANs.size} seller(s) with IBANs`)

  // მხოლოდ პირველი ავტორი – შენი ლოგიკით
  const sellerIban = [...authorsIBANs.values()][0]
  console.log('✅ Using seller IBAN:', sellerIban.substring(0, 8) + '...')

  // Build split payments array - amount must be null when using percent (per BOG API docs)
  const split_payments: BOGSplitPayment[] = [
    {
      amount: null, // Required: must be null when using percent
      percent: 9,
      iban: adminIban,
      description: 'Platform commission'
    },
    {
      amount: null, // Required: must be null when using percent
      percent: 91,
      iban: sellerIban,
      description: 'Seller earning'
    }
  ]

  const totalPercent = split_payments.reduce((sum, p) => sum + (p.percent || 0), 0)
  if (totalPercent !== 100) {
    console.error(`❌ Split percentages don't sum to 100: ${totalPercent}%`)
    return null
  }

  console.log('✅ Split payment config validated:', {
    adminPercent: 9,
    sellerPercent: 91,
    totalPercent
  })

  return { split_payments }
}

/**
 * Extract redirect URL from BOG API response
 */
function extractRedirectUrl(responseData: BOGResponse): string {
  const { links, _links, id, order_id } = responseData
  const allLinks = links || _links || {}
  const redirectUrl = allLinks.redirect?.href || allLinks.approve?.href

  if (redirectUrl) return redirectUrl

  const bogOrderId = id || order_id
  if (bogOrderId) {
    return `https://www.dressla.ge?order_id=${bogOrderId}`
  }

  throw new Error('Redirect URL not found in BOG response and could not be constructed')
}

// MAIN HANDLER
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const validated = orderDataSchema.parse(body)
    const { token, orderData } = validated

    if (!token) {
      return NextResponse.json({ 
        success: false,
        error: 'Missing token' 
      }, { status: 400 })
    }

    const { cart, totalAmount } = orderData
    const items = cart.items

    if (items.length === 0) {
      return NextResponse.json({ 
        success: false,
        error: 'Cart is empty' 
      }, { status: 400 })
    }

    const basket = transformCartItemsToBasket(items)

    const totalAmountNumber = typeof totalAmount === 'string'
      ? parseFloat(totalAmount)
      : totalAmount

    if (isNaN(totalAmountNumber) || totalAmountNumber <= 0) {
      return NextResponse.json(
        { 
          success: false,
          error: `Invalid total amount: ${totalAmount}` 
        },
        { status: 400 }
      )
    }

    const calculatedTotal = basket.reduce(
      (sum, item) => sum + item.quantity * item.unit_price,
      0
    )

    if (Math.abs(calculatedTotal - totalAmountNumber) > 0.01) {
      console.warn(
        `Total amount mismatch: calculated=${calculatedTotal}, provided=${totalAmountNumber}`
      )
    }

    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { 
          success: false,
          error: 'User not authenticated' 
        },
        { status: 401 }
      )
    }

    let user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        blocked: true,
        iban: true
      }
    })

    if (user?.blocked) {
      await reevaluateUserBlocking(session.user.id, 2)
      user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { blocked: true, iban: true }
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
    }

    if (!user?.iban) {
      return NextResponse.json(
        {
          success: false,
          error: 'გთხოვთ შეიყვანოთ ბანკის IBAN პროფილში. IBAN აუცილებელია ყიდვისთვის.',
          missingIban: true
        },
        { status: 403 }
      )
    }

    const userCart = await prisma.cart.findFirst({
      where: { userId: session.user.id },
      include: { items: true }
    })

    if (!userCart || userCart.items.length === 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Cart not found or empty' 
        },
        { status: 400 }
      )
    }

    if (userCart.userId !== session.user.id) {
      await prisma.cart.update({
        where: { id: userCart.id },
        data: { userId: session.user.id }
      })
    }

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
      rentalDays: item.rentalDays || null
    }))

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
          success: false,
          error: 'Failed to create order in database',
          message: orderError instanceof Error ? orderError.message : 'Unknown error occurred',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      )
    }

    const databaseOrderId = databaseOrder.id.toString()

    const productIds = userCart.items
      .map(item => item.productId)
      .filter((id): id is number => id !== null)

    const effectivePaymentMethod = orderData.paymentMethod || 'card'
    const splitConfig = await buildSplitPaymentConfig(
      'GEL',
      effectivePaymentMethod,
      productIds
    )

    if (splitConfig) {
      console.log('✅ Split payment config created:', JSON.stringify(splitConfig, null, 2))
    } else {
      console.log('⚠️ No split payment config (conditions not met)')
    }

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
      payment_method: [effectivePaymentMethod]
    }

    // Config merge
    const config: BOGRequestData['config'] = {}

    if (orderData.paymentMethod === 'google_pay' && orderData.googlePayToken) {
      config.google_pay = {
        external: true,
        google_pay_token: orderData.googlePayToken
      }
    }

    if (splitConfig) {
      config.split = {
        split_payments: splitConfig.split_payments
      }
    }

    if (Object.keys(config).length > 0) {
      bogRequestData.config = config
    }

    // Log split payment info separately for clarity
    if (splitConfig) {
      console.log('💰 Split Payment in Request:')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      splitConfig.split_payments.forEach((payment, index) => {
        console.log(`${index + 1}. ${payment.description}:`)
        console.log(`   IBAN: ${payment.iban.substring(0, 8)}...`)
        console.log(`   Percent: ${payment.percent}%`)
      })
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    }

    console.log('📤 BOG Request Data:', JSON.stringify({
      ...bogRequestData,
      config: bogRequestData.config ? {
        ...bogRequestData.config,
        google_pay: bogRequestData.config.google_pay
          ? { external: bogRequestData.config.google_pay.external, google_pay_token: '[REDACTED]' }
          : undefined,
        split: bogRequestData.config.split ? {
          split_payments: bogRequestData.config.split.split_payments.map(p => ({
            percent: p.percent,
            iban: p.iban.substring(0, 8) + '...',
            description: p.description
          }))
        } : undefined
      } : undefined
    }, null, 2))

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

      bogOrderId = response.data.id || response.data.order_id

      await prisma.order.update({
        where: { id: databaseOrder.id },
        data: { paymentId: bogOrderId || null }
      })

      console.log(`✅ Order ${databaseOrder.id} updated with BOG payment ID: ${bogOrderId}`)

      const paymentStatus = response.data.status
      if (paymentStatus === 'completed' && orderData.paymentMethod === 'google_pay') {
        await prisma.order.update({
          where: { id: databaseOrder.id },
          data: { status: 'PAID' }
        })

        await recordSellerTransactions(databaseOrder.id)

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

      const finalRedirectUrl = extractRedirectUrl(response.data)

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

      try {
        await prisma.order.delete({
          where: { id: databaseOrder.id }
        })
        console.log(`✅ Rolled back order ${databaseOrder.id} due to BOG payment failure`)
      } catch (deleteError) {
        console.error('❌ Error rolling back order:', deleteError)
      }

      throw bogError
    }
  } catch (error) {
    console.error('❌ Error in create-order endpoint:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.issues,
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      )
    }

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ message?: string; error?: string; details?: unknown }>
      const responseData = axiosError.response?.data
      const errorMessage = responseData?.message
        || responseData?.error
        || axiosError.message
        || 'BOG API error'

      console.error('❌ BOG API Error Details:', {
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
        data: responseData,
        requestData: axiosError.config?.data ? JSON.parse(axiosError.config.data) : null
      })

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          details: responseData || { message: axiosError.message },
          timestamp: new Date().toISOString()
        },
        { status: axiosError.response?.status || 500 }
      )
    }

    const errorMessage = error instanceof Error
      ? error.message
      : 'Order creation failed'

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
