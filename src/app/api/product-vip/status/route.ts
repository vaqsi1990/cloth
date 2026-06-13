import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isProductVipActive } from '@/lib/product-vip'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const productId = parseInt(req.nextUrl.searchParams.get('productId') || '', 10)
    if (Number.isNaN(productId)) {
      return NextResponse.json({ success: false, error: 'Invalid productId' }, { status: 400 })
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, userId: true, isVip: true, vipExpiresAt: true },
    })

    if (!product) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }

    const isAdmin = session.user.role === 'ADMIN'
    if (product.userId !== session.user.id && !isAdmin) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const pendingPayment = await prisma.productVipPayment.findFirst({
      where: {
        productId,
        userId: session.user.id,
        status: 'PENDING',
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      isVipActive: isProductVipActive(product),
      hasPendingPayment: Boolean(pendingPayment),
      vipExpiresAt: product.vipExpiresAt,
    })
  } catch {
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
