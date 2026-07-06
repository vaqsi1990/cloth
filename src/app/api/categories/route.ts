import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { syncDefaultCategoriesToDb } from '@/lib/category-sync'
import {
  dedupeProductCategories,
  sortProductCategories,
} from '@/lib/product-categories'

// GET - Fetch all categories
export async function GET(request: NextRequest) {
  try {
    await syncDefaultCategoriesToDb()

    const categories = await prisma.category.findMany()

    // Remove duplicates by id (in case of any data inconsistencies)
    const uniqueCategories = categories.filter((category, index, self) =>
      index === self.findIndex((c) => c.id === category.id)
    )

    return NextResponse.json({
      success: true,
      categories: sortProductCategories(
        dedupeProductCategories(uniqueCategories),
      ),
    })
    
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json({
      success: false,
      message: 'შეცდომა კატეგორიების მიღებისას'
    }, { status: 500 })
  }
}
