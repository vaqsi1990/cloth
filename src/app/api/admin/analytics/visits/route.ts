import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getVisitAnalyticsSummary } from '@/lib/visit-analytics'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 },
      )
    }

    const analytics = await getVisitAnalyticsSummary()

    return NextResponse.json({
      success: true,
      analytics,
    })
  } catch (error) {
    console.error('Error fetching visit analytics:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics' },
      { status: 500 },
    )
  }
}
