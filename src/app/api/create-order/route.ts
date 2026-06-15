import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { reevaluateUserBlocking } from '@/utils/revenue'
import { bogTokenManager } from '@/lib/bog-token'
import { computeUserCartSubtotal } from '@/lib/cart-totals'
import { getCartItemPayablePrice } from '@/lib/cart-item-pricing'
import { validateVoucher } from '@/lib/voucher'
import { processExpiredDiscount } from '@/utils/discountUtils'
import { computePaymentSplitPercents } from '@/lib/platform-pricing'
import {
  cartProductPricingSelect,
  resolveCartItemBuyerListPrice,
} from '@/lib/resolve-cart-item-price'
import { syncCartItemBuyerListPrices } from '@/lib/sync-cart-prices'
import { z } from 'zod'
import { MAX_CART_ITEMS, MAX_CART_ITEM_QUANTITY, CART_SINGLE_ITEM_MESSAGE } from '@/lib/cart-limits'
import { toPrismaDeliverySpeed } from '@/lib/delivery'
import { markRentalProductsRented } from '@/lib/update-product-status'
import { findRentalDateConflict } from '@/lib/rental-date-conflicts'

interface CartItemInput {
  productId: string | number
  id?: string | number
  qty: string | number
  price: string | number
}

interface BOGBasketItem {
  quantity: number
  unit_price: number
  product_id: string
}

interface BOGSplitPayment {
  amount: number | null  // Required: null when using percent
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

interface BOGSplitPaymentResponse {
  description?: string
  iban?: string
  percent?: number
  amount?: number | string
  status?: string
}

interface BOGResponseData {
  id?: string
  order_id?: string
  links?: {
    redirect?: { href: string }
    approve?: { href: string }
  }
  _links?: {
    redirect?: { href: string }
    approve?: { href: string }
  }
  split?: {
    split_status?: string
    currency?: string
    request_channel?: string
    split_payments?: BOGSplitPaymentResponse[]
  }
}

const orderDataSchema = z.object({
  token: z.string().min(1),
  orderData: z.object({
    cart: z.object({
      items: z.array(z.object({
        productId: z.union([z.string(), z.number()]),
        id: z.union([z.string(), z.number()]).optional(),
        qty: z.union([z.string(), z.number()]),
        price: z.union([z.string(), z.number()])
      }))
    }),
    totalAmount: z.union([z.string(), z.number()]),
    orderId: z.string().min(1),
    deliveryOption: z.string().optional(),
    deliveryType: z.enum(['pickup', 'delivery']).optional(),
    deliveryCityId: z.union([z.string(), z.number()]).nullable().optional(),
    deliverySpeed: z.enum(['extra', 'standard']).nullable().optional(),
    deliveryPrice: z.union([z.string(), z.number()]).optional(),
    paymentMethod: z.enum(['google_pay', 'card', 'apple_pay']).optional(),
    googlePayToken: z.string().optional(),
    voucherCode: z.string().optional(),
    address: z.object({
      firstName: z.string(),
      lastName: z.string(),
      email: z.string().email()
    }).optional()
  })
})

function normalizeIban(iban?: string | null) {
  return iban ? iban.replace(/\s+/g, '').toUpperCase() : null
}

function validateSplitDescription(desc: string): string | undefined {
  if (!desc) return undefined
  const allowed = /^[0-9 /\-?:().,'+a-zA-Z]+$/
  if (!allowed.test(desc)) return undefined
  return desc.length > 25 ? desc.substring(0, 25) : desc
}

async function collectProductAuthorsIBANs(productIds: (string | number)[]) {
  const result = new Map<string, string>()

  const ids = productIds
    .map(id => typeof id === 'string' ? parseInt(id) : id)
    .filter(n => typeof n === 'number' && !isNaN(n))

  console.log('🔍 [IBAN] Collecting IBANs for product IDs:', ids)

  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, userId: true, user: { select: { iban: true } } }
  })

  console.log(`🔍 [IBAN] Found ${products.length} products`)

  for (const p of products) {
    console.log(`🔍 [IBAN] Product ${p.id} - userId: ${p.userId}, IBAN: ${p.user?.iban ? p.user.iban.substring(0, 8) + '...' : 'NOT FOUND'}`)
    if (p.user?.iban) {
      const norm = normalizeIban(p.user.iban)
      if (norm) {
        result.set(String(p.userId), norm)
        console.log(`✅ [IBAN] Added IBAN for user ${p.userId}: ${norm.substring(0, 8)}...${norm.substring(norm.length - 4)}`)
      } else {
        console.warn(`⚠️ [IBAN] Invalid IBAN format for user ${p.userId}: ${p.user.iban}`)
      }
    } else {
      console.warn(`⚠️ [IBAN] Product ${p.id} author (userId: ${p.userId}) has no IBAN`)
    }
  }

  console.log(`✅ [IBAN] Total unique seller IBANs collected: ${result.size}`)
  return result
}

/**
 * Get merchant account IBAN from environment variable
 * This is the BOG merchant account IBAN associated with BOG_CLIENT_ID/BOG_CLIENT_SECRET
 * The merchant account automatically receives payments, so we use it for the platform commission split
 */
function getMerchantIBAN(): string | null {
  const merchantIban = process.env.BOG_MERCHANT_IBAN
  if (!merchantIban) {
    console.error('❌ [IBAN] BOG_MERCHANT_IBAN environment variable not set!')
    console.error('   ⚠️ ACTION REQUIRED: Set BOG_MERCHANT_IBAN in .env file')
    console.error('   This should be the merchant account IBAN associated with your BOG API credentials')
    console.error('   You can find this IBAN in BOG Merchant Manager dashboard')
    return null
  }
  
  const normalized = normalizeIban(merchantIban)
  if (normalized) {
    console.log(`✅ [IBAN] Merchant IBAN found from env: ${normalized.substring(0, 8)}...${normalized.substring(normalized.length - 4)}`)
  } else {
    console.error(`❌ [IBAN] Invalid merchant IBAN format in BOG_MERCHANT_IBAN: ${merchantIban}`)
    console.error('   IBAN must start with GE and be 15-34 characters long')
  }
  return normalized
}

async function buildSplitPaymentConfig(
  paymentMethod: string | undefined,
  productIds: (string | number)[],
  totalAmount: number,
  productBuyerSubtotal: number,
  deliveryFee: number,
) {
  console.log('🔍 [SPLIT] Building split payment config...')
  console.log(`🔍 [SPLIT] Payment method: ${paymentMethod}, Product IDs: ${productIds.length}`)
  
  if (!paymentMethod || !['card', 'google_pay', 'apple_pay'].includes(paymentMethod)) {
    console.warn(`⚠️ [SPLIT] Payment method not supported for split: ${paymentMethod}`)
    return null
  }

  const merchantIban = getMerchantIBAN()
  
  const authors = await collectProductAuthorsIBANs(productIds)
  if (authors.size === 0) {
    console.error('❌ [SPLIT] No seller IBANs found - split config cannot be created')
    return null
  }

  const sellerIban = [...authors.values()][0] // first seller
  console.log(`✅ [SPLIT] Using seller IBAN: ${sellerIban.substring(0, 8)}...${sellerIban.substring(sellerIban.length - 4)}`)

  // If merchant IBAN is not available, BOG should automatically use merchant account from credentials
  // But according to BOG docs, split_payments must sum to 100%
  // So we'll try with only seller IBAN and see if BOG accepts it
  // If not, we might need to get merchant IBAN from BOG API or configuration
  
  const splitPercents = computePaymentSplitPercents(
    totalAmount,
    productBuyerSubtotal,
    deliveryFee,
  )
  if (!splitPercents) {
    console.error('❌ [SPLIT] Could not compute split percentages')
    return null
  }

  const split_payments: BOGSplitPayment[] = []
  
  if (merchantIban) {
    split_payments.push({
      amount: null,
      percent: splitPercents.platformPercent,
      iban: merchantIban,
      description: validateSplitDescription("Platform commission")
    })
  }
  
  split_payments.push({
    amount: null,
    percent: splitPercents.sellerPercent,
    iban: sellerIban,
    description: validateSplitDescription("Seller earning")
  })

  // Validate percentages sum to 100%
  const totalPercent = split_payments.reduce((sum, p) => sum + (p.percent || 0), 0)
  if (totalPercent !== 100) {
    console.error(`❌ [SPLIT] Split percentages don't sum to 100: ${totalPercent}%`)
    console.error(`   ⚠️ Merchant IBAN is required for split payment to work correctly`)
    console.error(`   ⚠️ BOG requires all split payments to sum to 100%`)
    console.error(`   ⚠️ Without merchant IBAN, split payment cannot be created`)
    return null
  }

  console.log('✅ [SPLIT] Split payment config created:')
  if (merchantIban) {
    console.log(`   📊 Merchant/Platform (${splitPercents.platformPercent}%): ${merchantIban.substring(0, 8)}...${merchantIban.substring(merchantIban.length - 4)}`)
  } else {
    console.log(`   📊 Merchant/Platform (${splitPercents.platformPercent}%): Will be handled automatically by BOG merchant account`)
  }
  console.log(`   📊 Seller (${splitPercents.sellerPercent}%): ${sellerIban.substring(0, 8)}...${sellerIban.substring(sellerIban.length - 4)}`)

  return { split_payments }
}

function buildBasketFromResolvedCartItems(
  items: Array<{
    productId: number | null
    quantity: number
    buyerListPrice: number
    product: {
      discount: number | null
      discountDays: number | null
      discountStartDate: Date | null
    } | null
  }>,
): BOGBasketItem[] {
  return items.map((item) => {
    const product = item.product ? processExpiredDiscount(item.product) : null
    const discount = product?.discount && product.discount > 0 ? product.discount : 0
    const unitPrice = getCartItemPayablePrice(item.buyerListPrice, discount)

    return {
      quantity: Number(item.quantity),
      unit_price: unitPrice,
      product_id: String(item.productId),
    }
  })
}

function transformCartItemsToBasket(items: CartItemInput[]): BOGBasketItem[] {
  return items.map((i) => ({
    quantity: Number(i.qty),
    unit_price: Number(i.price),
    product_id: String(i.productId || i.id)
  }))
}

function applyDiscountToBasket(
  basket: BOGBasketItem[],
  discount: number,
): BOGBasketItem[] {
  if (discount <= 0) return basket

  const basketTotal = basket.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0,
  )
  if (basketTotal <= 0) return basket

  const ratio = (basketTotal - discount) / basketTotal
  return basket.map((item) => ({
    ...item,
    unit_price: Math.round(item.unit_price * ratio * 100) / 100,
  }))
}

function extractRedirectUrl(responseData: BOGResponseData): string | undefined {
  const links = responseData.links || responseData._links || {}
  return links.redirect?.href || links.approve?.href
}

export async function POST(req: NextRequest) {
  try {
    const json = await req.json()
    const { orderData } = orderDataSchema.parse(json)

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { blocked: true, iban: true }
    })

    if (user?.blocked) {
      await reevaluateUserBlocking(session.user.id, 2)
    }

    if (!user?.iban) {
      return NextResponse.json({ missingIban: true, error: "Missing IBAN" }, { status: 403 })
    }

    const cart = await prisma.cart.findFirst({
      where: { userId: session.user.id },
      include: {
        items: {
          include: {
            product: {
              select: cartProductPricingSelect,
            },
          },
        },
      },
    })

    if (!cart || cart.items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'კალათა ცარიელია' },
        { status: 400 },
      )
    }

    if (
      cart.items.length > MAX_CART_ITEMS ||
      cart.items.some((item) => item.quantity > MAX_CART_ITEM_QUANTITY)
    ) {
      return NextResponse.json(
        { success: false, error: CART_SINGLE_ITEM_MESSAGE },
        { status: 400 },
      )
    }

    const resolvedCartItems = cart.items.map((item) => ({
      ...item,
      buyerListPrice: resolveCartItemBuyerListPrice({
        storedPrice: item.price,
        isRental: item.isRental ?? false,
        rentalDays: item.rentalDays,
        product: item.product,
      }),
    }))

    const rentalConflict = await findRentalDateConflict(
      resolvedCartItems
        .filter((item) => item.isRental && item.rentalStartDate && item.rentalEndDate && item.productId)
        .map((item) => ({
          productId: item.productId as number,
          productName: item.productName,
          size: item.size || 'default',
          rentalStartDate: item.rentalStartDate!.toISOString(),
          rentalEndDate: item.rentalEndDate!.toISOString(),
        })),
    )
    if (rentalConflict) {
      return NextResponse.json(
        { success: false, error: rentalConflict },
        { status: rentalConflict.includes('არასწორი') ? 400 : 409 },
      )
    }

    await syncCartItemBuyerListPrices(
      resolvedCartItems.map((item) => ({
        id: item.id,
        storedPrice: item.price,
        buyerListPrice: item.buyerListPrice,
      })),
    )

    const cartSubtotal = await computeUserCartSubtotal(session.user.id)

    let voucherDiscount = 0
    let voucherId: number | null = null
    let voucherCode: string | null = null

    if (orderData.voucherCode) {
      const voucherResult = await validateVoucher(
        orderData.voucherCode,
        session.user.id,
        cartSubtotal,
      )
      if (!voucherResult.valid) {
        return NextResponse.json(
          { success: false, error: voucherResult.message },
          { status: 400 },
        )
      }
      voucherDiscount = voucherResult.discountAmount
      voucherId = voucherResult.voucherId
      voucherCode = voucherResult.code
    }

    // Parse delivery info
    const deliveryCityId = orderData.deliveryCityId 
      ? (typeof orderData.deliveryCityId === 'string' ? parseInt(orderData.deliveryCityId, 10) : orderData.deliveryCityId)
      : null
    const deliveryPrice = orderData.deliveryPrice 
      ? (typeof orderData.deliveryPrice === 'string' ? parseFloat(orderData.deliveryPrice) : orderData.deliveryPrice)
      : null

    const deliveryFee =
      orderData.deliveryType === 'delivery' && deliveryPrice ? deliveryPrice : 0
    const productBuyerSubtotal =
      Math.round((cartSubtotal - voucherDiscount) * 100) / 100
    const total =
      Math.round((productBuyerSubtotal + deliveryFee) * 100) / 100

    let basket = buildBasketFromResolvedCartItems(resolvedCartItems)
    if (voucherDiscount > 0) {
      basket = applyDiscountToBasket(basket, voucherDiscount)
    }

    // Get delivery city name if delivery
    let deliveryCityName: string | null = null
    if (deliveryCityId) {
      const deliveryCity = await prisma.deliveryCity.findUnique({
        where: { id: deliveryCityId },
        select: { name: true }
      })
      deliveryCityName = deliveryCity?.name || null
    }

    const dbOrder = await prisma.order.create({
      data: {
        userId: session.user.id,
        customerName:
          orderData.address
            ? `${orderData.address.firstName} ${orderData.address.lastName}`.trim()
            : session.user.name || 'Customer',
        phone: session.user.phone || '',
        email: orderData.address?.email || session.user.email || '',
        address: orderData.deliveryOption || "",
        city: orderData.deliveryType === 'pickup' ? 'თბილისი' : (deliveryCityName || null),
        deliveryCityId: deliveryCityId,
        deliverySpeed: orderData.deliverySpeed
          ? toPrismaDeliverySpeed(orderData.deliverySpeed)
          : null,
        deliveryPrice: deliveryPrice,
        paymentMethod: "BOG Card Payment",
        total,
        voucherCode,
        voucherDiscount: voucherDiscount > 0 ? voucherDiscount : null,
        voucherId,
        status: "PENDING",
        items: {
          create: resolvedCartItems.map((i) => ({
            productId: i.productId,
            productName: i.productName,
            price: i.buyerListPrice,
            quantity: i.quantity,
            isRental: i.isRental ?? false,
            rentalStartDate: i.rentalStartDate,
            rentalEndDate: i.rentalEndDate,
            rentalDays: i.rentalDays,
            size: i.size,
            image: i.image,
          }))
        }
      }
    })

    const rentalProductIds = resolvedCartItems
      .filter((item) => item.isRental && item.productId)
      .map((item) => item.productId as number)
    await markRentalProductsRented(rentalProductIds)

    const productIds = cart.items.map(i => i.productId).filter((id): id is number => id !== null)
    const splitConfig = await buildSplitPaymentConfig(
      orderData.paymentMethod || 'card',
      productIds,
      total,
      productBuyerSubtotal,
      deliveryFee,
    )

    const requestData: BOGRequestData = {
      callback_url: "https://www.dressla.ge/api/payment-callback",
      external_order_id: String(dbOrder.id),
      purchase_units: {
        currency: "GEL",
        total_amount: total,
        basket
      },
      redirect_urls: {
        success: `https://www.dressla.ge/order-confirmation?status=success&orderId=${dbOrder.id}`,
        fail: `https://www.dressla.ge/payment-fail?orderId=${dbOrder.id}`
      },
      payment_method: [orderData.paymentMethod || 'card']
    }

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
      console.log('✅ [SPLIT] Split config added to BOG request:')
      console.log('   📋 Split payments:', JSON.stringify(splitConfig.split_payments.map(sp => ({
        amount: sp.amount,
        percent: sp.percent,
        iban: `${sp.iban.substring(0, 8)}...${sp.iban.substring(sp.iban.length - 4)}`,
        description: sp.description
      })), null, 2))
      
      // Validate split config before sending
      const totalPercent = splitConfig.split_payments.reduce((sum, p) => sum + (p.percent || 0), 0)
      if (totalPercent !== 100) {
        console.error(`❌ [SPLIT] CRITICAL: Split percentages don't sum to 100: ${totalPercent}%`)
        console.error('   Split payment will likely fail or be ignored by BOG')
      } else {
        console.log(`✅ [SPLIT] Split percentages sum to 100% - config is valid`)
      }
      
      // Check if merchant IBAN is included
      const hasMerchantIban = splitConfig.split_payments.some(sp => 
        sp.iban === process.env.BOG_MERCHANT_IBAN?.replace(/\s+/g, '').toUpperCase()
      )
      if (!hasMerchantIban) {
        console.warn('⚠️ [SPLIT] WARNING: Merchant IBAN not found in split payments')
        console.warn('   This might cause issues - merchant account should receive platform commission')
      }
    } else {
      console.warn('⚠️ [SPLIT] No split config - split payment will not be processed')
      console.warn('   ⚠️ Full payment amount will go to merchant account only')
    }

    if (Object.keys(config).length > 0) {
      requestData.config = config
      console.log('📤 [BOG] Request config keys:', Object.keys(config))
    }

    // Log the full request data (with redacted sensitive info)
    console.log('📤 [BOG] Full request data being sent:')
    console.log(JSON.stringify({
      ...requestData,
      config: requestData.config ? {
        ...requestData.config,
        google_pay: requestData.config.google_pay ? { 
          external: requestData.config.google_pay.external, 
          google_pay_token: '[REDACTED]' 
        } : undefined,
        split: requestData.config.split ? {
          split_payments: requestData.config.split.split_payments.map(sp => ({
            amount: sp.amount,
            percent: sp.percent,
            iban: `${sp.iban.substring(0, 8)}...${sp.iban.substring(sp.iban.length - 4)}`,
            description: sp.description
          }))
        } : undefined
      } : undefined
    }, null, 2))

    const response = await bogTokenManager.makeAuthenticatedRequest((token) =>
      axios.post(
        "https://api.bog.ge/payments/v1/ecommerce/orders",
        requestData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      )
    )

    console.log('✅ [BOG] Response received:')
    console.log('   Status:', response.status)
    console.log('   Order ID:', response.data.id || response.data.order_id)
    
    // Log full response to see if split info is included
    console.log('   📋 Full BOG Response:', JSON.stringify(response.data, null, 2))
    
    // Check for split information in response
    if (response.data.split) {
      console.log('✅ [SPLIT] Split information found in BOG response:')
      console.log('   Split Status:', response.data.split.split_status)
      console.log('   Currency:', response.data.split.currency)
      console.log('   Request Channel:', response.data.split.request_channel)
      if (response.data.split.split_payments) {
        console.log(`   Split Payments (${response.data.split.split_payments.length}):`)
        response.data.split.split_payments.forEach((sp: BOGSplitPaymentResponse, index: number) => {
          console.log(`     ${index + 1}. ${sp.description || 'Payment'}:`)
          console.log(`        IBAN: ${sp.iban ? sp.iban.substring(0, 8) + '...' + sp.iban.substring(sp.iban.length - 4) : 'N/A'}`)
          console.log(`        Percent: ${sp.percent || 'N/A'}%`)
          console.log(`        Amount: ${sp.amount || 'N/A'}`)
          console.log(`        Status: ${sp.status || 'N/A'}`)
        })
      }
    } else {
      if (splitConfig) {
        console.warn('⚠️ [SPLIT] WARNING: Split config was sent but BOG response does not include split information!')
        console.warn('   This might mean:')
        console.warn('   1. Split payment is NOT activated for your merchant account in BOG Merchant Manager')
        console.warn('   2. BOG rejected the split config silently')
        console.warn('   3. Split will be processed after payment completion (check callback)')
        console.warn('   ⚠️ ACTION REQUIRED: Contact BOG support to activate split payment for your merchant account')
      } else {
        console.log('ℹ️ [SPLIT] No split config was sent - split payment will not be processed')
      }
    }

    const bogOrderId = response.data.id || response.data.order_id

    await prisma.order.update({
      where: { id: dbOrder.id },
      data: { paymentId: bogOrderId }
    })

    const redirect = extractRedirectUrl(response.data)

    await prisma.cartItem.deleteMany({ where: { cartId: cart!.id } })

    return NextResponse.json({
      success: true,
      orderId: dbOrder.id,
      bogOrderId,
      redirectUrl: redirect
    })

  } catch (err) {
    console.error('❌ [ERROR] Order creation failed:', err)
    if (axios.isAxiosError(err)) {
      console.error('❌ [ERROR] BOG API Error:')
      console.error('   Status:', err.response?.status)
      console.error('   Status Text:', err.response?.statusText)
      console.error('   Response Data:', JSON.stringify(err.response?.data, null, 2))
      console.error('   Request Data:', JSON.stringify(err.config?.data ? JSON.parse(err.config.data) : null, null, 2))
      
      return NextResponse.json({ 
        success: false, 
        error: err.response?.data?.message || err.response?.data?.error || err.message || "BOG API error",
        details: err.response?.data
      }, { status: err.response?.status || 500 })
    }
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 })
  }
}
