import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { status, reason } = await request.json()

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      )
    }

    if (status === 'REJECTED' && (!reason || typeof reason !== 'string' || reason.trim().length === 0)) {
      return NextResponse.json(
        { success: false, error: 'Rejection reason is required' },
        { status: 400 }
      )
    }

    const resolvedParams = await params
    const productId = parseInt(resolvedParams.id)

    if (isNaN(productId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid product ID' },
        { status: 400 }
      )
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true }
    })

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        approvalStatus: status,
        approvedAt: status === 'APPROVED' ? new Date() : null,
        rejectionReason: status === 'REJECTED' ? reason : null
      },
      include: {
        images: true,
        category: true,
        purpose: true,
        variants: true
      }
    })

    return NextResponse.json({
      success: true,
      product: updatedProduct
    })
  } catch (error) {
    console.error('Error updating product approval status:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update approval status' },
      { status: 500 }
    )
  }
}

