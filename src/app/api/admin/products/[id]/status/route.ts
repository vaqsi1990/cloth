import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdminOrSupport } from '@/lib/roles'
import {
  isProductStatus,
  updateProductStatus,
} from '@/lib/update-product-status'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !isAdminOrSupport(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Admin or Support access required' },
        { status: 403 },
      )
    }

    const { status } = await request.json()
    if (!isProductStatus(status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid status. Allowed: ${['AVAILABLE', 'RENTED', 'RESERVED', 'MAINTENANCE', 'DAMAGED'].join(', ')}`,
        },
        { status: 400 },
      )
    }

    const resolvedParams = await params
    const productId = parseInt(resolvedParams.id, 10)
    if (isNaN(productId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid product ID' },
        { status: 400 },
      )
    }

    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    })

    if (!existingProduct) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 },
      )
    }

    const product = await updateProductStatus(productId, status)

    return NextResponse.json({
      success: true,
      message: 'სტატუსი წარმატებით განახლდა',
      product,
    })
  } catch (error) {
    console.error('Error updating product status:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update product status' },
      { status: 500 },
    )
  }
}
