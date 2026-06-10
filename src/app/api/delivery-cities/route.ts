import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET - Fetch all active delivery cities (public)
export async function GET(request: NextRequest) {
  try {
    const cities = await prisma.deliveryCity.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        extraPrice: true,
        standardPrice: true,
        isActive: true,
      },
    })

    return NextResponse.json(
      {
        success: true,
        cities: cities.map((city) => ({
          ...city,
          extraPrice: Number(city.extraPrice),
          standardPrice: Number(city.standardPrice),
        })),
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      },
    )

  } catch (error) {
    console.error('Error fetching delivery cities:', error)
    return NextResponse.json(
      { success: false, error: 'Error fetching delivery cities' },
      { status: 500 }
    )
  }
}
