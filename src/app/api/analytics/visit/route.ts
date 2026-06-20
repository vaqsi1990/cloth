import { NextRequest, NextResponse } from 'next/server'
import {
  getClientCountry,
  getClientIp,
  recordSiteVisit,
} from '@/lib/visit-analytics'

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    if (!ip) {
      return NextResponse.json({ success: false, error: 'No IP' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const path =
      typeof body.path === 'string' && body.path.trim()
        ? body.path.trim()
        : '/'

    await recordSiteVisit({
      ip,
      path,
      country: getClientCountry(request),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error recording site visit:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to record visit' },
      { status: 500 },
    )
  }
}
