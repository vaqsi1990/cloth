import { NextRequest, NextResponse } from 'next/server'
import { fetchBatchRentalStatus } from '@/lib/product-rental-status-batch'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const idsParam = searchParams.get('ids')

    if (!idsParam) {
      return NextResponse.json(
        { error: 'Product IDs are required' },
        { status: 400 },
      )
    }

    const productIds = idsParam
      .split(',')
      .map((id) => parseInt(id.trim(), 10))
      .filter((id) => !isNaN(id))

    if (productIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid product IDs' },
        { status: 400 },
      )
    }

    const statuses = await fetchBatchRentalStatus(productIds)

    const response = NextResponse.json({
      success: true,
      statuses,
    })
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=30, stale-while-revalidate=60',
    )
    return response
  } catch (error) {
    console.error('Batch rental status fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
