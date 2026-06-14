import { NextRequest, NextResponse } from 'next/server'
import { fetchProductRentalStatus } from '@/lib/product-rental-status-batch'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const productId = parseInt(id)

    if (isNaN(productId)) {
      return NextResponse.json(
        { error: 'Invalid product ID' },
        { status: 400 }
      )
    }

    const { variants, activeRentals, totalActiveRentals, totalActiveOrders, totalActiveInquiries } =
      await fetchProductRentalStatus(productId)

    const response = NextResponse.json({
      success: true,
      productId,
      variants,
      activeRentals,
      totalActiveRentals,
      totalActiveOrders,
      totalActiveInquiries,
    })
    response.headers.set('Cache-Control', 'no-store')
    return response
  } catch (error) {
    console.error('Rental status fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
