import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { computeCartItemSubtotal, computeUserCartSubtotal } from '@/lib/cart-totals'
import { validateVoucher } from '@/lib/voucher'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'ავტორიზაცია საჭიროა' },
        { status: 401 },
      )
    }

    const body = await request.json()
    const { code, cartItemId } = body

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { success: false, message: 'კოდი აუცილებელია' },
        { status: 400 },
      )
    }

    const parsedCartItemId =
      cartItemId !== undefined && cartItemId !== null
        ? typeof cartItemId === 'string'
          ? parseInt(cartItemId, 10)
          : cartItemId
        : null

    const cartSubtotal =
      parsedCartItemId && !Number.isNaN(parsedCartItemId)
        ? await computeCartItemSubtotal(session.user.id, parsedCartItemId)
        : await computeUserCartSubtotal(session.user.id)

    if (parsedCartItemId && cartSubtotal <= 0) {
      return NextResponse.json(
        { success: false, message: 'არჩეული ნივთი კალათაში ვერ მოიძებნა' },
        { status: 400 },
      )
    }
    const result = await validateVoucher(code, session.user.id, cartSubtotal)

    if (!result.valid) {
      return NextResponse.json({
        success: false,
        message: result.message,
      })
    }

    return NextResponse.json({
      success: true,
      voucher: {
        code: result.code,
        discountAmount: result.discountAmount,
        cartSubtotal: result.cartSubtotal,
        finalSubtotal: result.finalSubtotal,
      },
    })
  } catch (error) {
    console.error('Voucher validate error:', error)
    return NextResponse.json(
      { success: false, message: 'შეცდომა' },
      { status: 500 },
    )
  }
}
