import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Fetch all active delivery cities (public)
export async function GET(request: NextRequest) {
  try {
    const cities = await prisma.deliveryCity.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json({
      success: true,
      cities
    })

  } catch (error) {
    console.error('Error fetching delivery cities:', error)
    return NextResponse.json(
      { success: false, error: 'Error fetching delivery cities' },
      { status: 500 }
    )
  }
}
