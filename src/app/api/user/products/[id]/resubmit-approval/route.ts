import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidateProductListCache } from '@/lib/product-list-query'
import { ownerProductListSelect } from '@/lib/product-owner-query'
import { processExpiredDiscount } from '@/lib/discount-helpers'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 },
      )
    }

    const resolvedParams = await params
    const productId = parseInt(resolvedParams.id, 10)

    if (Number.isNaN(productId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid product ID' },
        { status: 400 },
      )
    }

    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        userId: session.user.id,
      },
      select: {
        id: true,
        approvalStatus: true,
      },
    })

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 },
      )
    }

    if (product.approvalStatus !== 'REJECTED') {
      return NextResponse.json(
        {
          success: false,
          error: 'მხოლოდ უარყოფილი პროდუქტის ხელახლა გაგზავნაა შესაძლებელი',
        },
        { status: 400 },
      )
    }

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        approvalStatus: 'PENDING',
        approvedAt: null,
        rejectionReason: null,
      },
      select: ownerProductListSelect,
    })

    revalidateProductListCache()

    return NextResponse.json({
      success: true,
      message: 'პროდუქტი ხელახლა გაიგზავნა დამტკიცებაზე',
      product: processExpiredDiscount(updatedProduct),
    })
  } catch (error) {
    console.error('Error resubmitting product for approval:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to resubmit product for approval' },
      { status: 500 },
    )
  }
}
