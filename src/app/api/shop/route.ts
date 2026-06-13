import { NextRequest, NextResponse } from 'next/server'
import {
  getShopBundleCacheControl,
  loadShopBundle,
} from '@/lib/shop-bundle-query'

export async function GET(request: NextRequest) {
  try {
    const reqStart = Date.now()
    const { searchParams } = new URL(request.url)
    const forceFresh = searchParams.get('fresh') === '1'

    const bundle = await loadShopBundle({ searchParams, forceFresh })
    const reqTotalMs = Date.now() - reqStart

    const responseBody: Record<string, unknown> = {
      success: true,
      products: bundle.products,
      hasMore: bundle.hasMore,
      page: bundle.page,
      limit: bundle.limit,
      totalCount: null,
      totalPages: null,
      facets: bundle.facets,
      rentalStatus: bundle.rentalStatus,
      priceRange: bundle.priceRange,
    }

    if (process.env.NODE_ENV === 'development') {
      responseBody.timings = {
        requestMs: reqTotalMs,
        listMs: bundle.listMs ?? null,
        cacheSource: bundle.cacheSource ?? null,
        bundled: true,
      }
    }

    const response = NextResponse.json(responseBody)
    response.headers.set('Server-Timing', `app;dur=${reqTotalMs}`)
    response.headers.set('Cache-Control', getShopBundleCacheControl(searchParams))
    return response
  } catch (error) {
    console.error('Error fetching shop data:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'შეცდომა მაღაზიის მონაცემების მიღებისას',
      },
      { status: 500 },
    )
  }
}
