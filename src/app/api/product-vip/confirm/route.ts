import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { confirmPendingVipPaymentForProduct } from '@/lib/product-vip-payment'

const confirmSchema = z.object({
  productId: z.number().int().positive(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { productId } = confirmSchema.parse(await req.json())
    const result = await confirmPendingVipPaymentForProduct(productId, session.user.id)

    return NextResponse.json({
      success: result.activated,
      status: result.status,
    })
  } catch {
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}
