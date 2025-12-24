import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Fetch all categories
export async function GET(request: NextRequest) {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' }
    })

    // Remove duplicates by id (in case of any data inconsistencies)
    const uniqueCategories = categories.filter((category, index, self) =>
      index === self.findIndex((c) => c.id === category.id)
    )

    // Also remove duplicates by name (in case same name exists with different ids)
    const deduplicatedCategories = uniqueCategories.filter((category, index, self) =>
      index === self.findIndex((c) => c.name.toLowerCase().trim() === category.name.toLowerCase().trim())
    )

    return NextResponse.json({
      success: true,
      categories: deduplicatedCategories
    })
    
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json({
      success: false,
      message: 'შეცდომა კატეგორიების მიღებისას'
    }, { status: 500 })
  }
}
