import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdminOrSupport } from '@/lib/roles'
import { revalidateProductCaches } from '@/lib/product-cache-revalidation'
import { revalidatePath } from 'next/cache'

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

    const body = await request.json()
    const featured = body?.featured === true

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
      select: { id: true, userId: true, approvalStatus: true },
    })

    if (!existingProduct) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 },
      )
    }

    if (featured && existingProduct.approvalStatus !== 'APPROVED') {
      return NextResponse.json(
        {
          success: false,
          error: 'მთავარ გვერდზე მხოლოდ დამტკიცებული პროდუქტი შეიძლება გამოჩნდეს',
        },
        { status: 400 },
      )
    }

    const product = await prisma.product.update({
      where: { id: productId },
      data: featured
        ? {
            featuredOnHomepage: true,
            homepageFeaturedAt: new Date(),
          }
        : {
            featuredOnHomepage: false,
            homepageFeaturedAt: null,
          },
      select: {
        id: true,
        featuredOnHomepage: true,
        homepageFeaturedAt: true,
        approvalStatus: true,
      },
    })

    revalidateProductCaches(productId, { authorId: existingProduct.userId })
    revalidatePath('/', 'page')

    return NextResponse.json({
      success: true,
      message: featured
        ? 'პროდუქტი დაემატა მთავარ გვერდზე'
        : 'პროდუქტი მოხსნილია მთავარი გვერდიდან',
      product,
    })
  } catch (error) {
    console.error('Error updating homepage featured status:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update homepage featured status' },
      { status: 500 },
    )
  }
}
