import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { bogTokenManager } from '@/lib/bog-token'
import { VIP_MONTHLY_PRICE_GEL } from '@/lib/product-vip'
import { getBogCallbackUrl, getSiteUrl } from '@/lib/site-url'

const paySchema = z.object({
  productId: z.number().int().positive(),
  returnTo: z.enum(['account', 'admin', 'support']).optional().default('account'),
})

function buildVipRedirectUrls(siteUrl: string, productId: number, returnTo: 'account' | 'admin' | 'support') {
  if (returnTo === 'admin') {
    return {
      success: `${siteUrl}/admin/products?vipSuccess=1&productId=${productId}`,
      fail: `${siteUrl}/admin/products?vipFailed=1&productId=${productId}`,
    }
  }

  if (returnTo === 'support') {
    return {
      success: `${siteUrl}/support/products?vipSuccess=1&productId=${productId}`,
      fail: `${siteUrl}/support/products?vipFailed=1&productId=${productId}`,
    }
  }

  return {
    success: `${siteUrl}/account/products?vipSuccess=1&productId=${productId}`,
    fail: `${siteUrl}/account/products?vipFailed=1&productId=${productId}`,
  }
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
}

function extractRedirectUrl(responseData: BOGResponseData): string | undefined {
  const links = responseData.links || responseData._links || {}
  return links.redirect?.href || links.approve?.href
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { productId, returnTo } = paySchema.parse(await req.json())

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, userId: true },
    })

    if (!product) {
      return NextResponse.json({ success: false, error: 'პროდუქტი ვერ მოიძებნა' }, { status: 404 })
    }

    const isAdmin = session.user.role === 'ADMIN'
    if (product.userId !== session.user.id && !isAdmin) {
      return NextResponse.json({ success: false, error: 'არავალიდური წვდომა' }, { status: 403 })
    }

    const pendingPayment = await prisma.productVipPayment.findFirst({
      where: {
        productId,
        userId: session.user.id,
        status: 'PENDING',
      },
      orderBy: { createdAt: 'desc' },
    })

    const vipPayment = pendingPayment ?? await prisma.productVipPayment.create({
      data: {
        productId,
        userId: session.user.id,
        amount: VIP_MONTHLY_PRICE_GEL,
        status: 'PENDING',
      },
    })

    const siteUrl = getSiteUrl()
    const redirectUrls = buildVipRedirectUrls(siteUrl, productId, returnTo)
    const requestData = {
      callback_url: getBogCallbackUrl(),
      external_order_id: `vip-${vipPayment.id}`,
      purchase_units: {
        currency: 'GEL',
        total_amount: VIP_MONTHLY_PRICE_GEL,
        basket: [
          {
            quantity: 1,
            unit_price: VIP_MONTHLY_PRICE_GEL,
            product_id: `vip-${productId}`,
          },
        ],
      },
      redirect_urls: redirectUrls,
      payment_method: ['card'],
    }

    const response = await bogTokenManager.makeAuthenticatedRequest((token) =>
      axios.post(
        'https://api.bog.ge/payments/v1/ecommerce/orders',
        requestData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      ),
    )

    const bogOrderId = response.data.id || response.data.order_id
    if (!bogOrderId) {
      return NextResponse.json(
        { success: false, error: 'BOG-დან გადახდის ბმული ვერ მივიღეთ' },
        { status: 502 },
      )
    }

    await prisma.productVipPayment.update({
      where: { id: vipPayment.id },
      data: { paymentId: String(bogOrderId) },
    })

    const redirectUrl = extractRedirectUrl(response.data)
    if (!redirectUrl) {
      return NextResponse.json(
        { success: false, error: 'გადახდის გვერდის ბმული ვერ მოიძებნა' },
        { status: 502 },
      )
    }

    return NextResponse.json({
      success: true,
      redirectUrl,
      vipPaymentId: vipPayment.id,
    })
  } catch (err) {
    console.error('VIP payment error:', err)
    if (axios.isAxiosError(err)) {
      return NextResponse.json(
        {
          success: false,
          error: err.response?.data?.message || err.message || 'BOG API error',
        },
        { status: err.response?.status || 500 },
      )
    }
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}
