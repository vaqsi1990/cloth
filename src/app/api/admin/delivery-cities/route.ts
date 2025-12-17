import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Fetch all delivery cities (admin only)
export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const cities = await prisma.deliveryCity.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [
        { isActive: 'desc' },
        { name: 'asc' }
      ]
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

// POST - Create a new delivery city (admin only)
export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, price, isActive } = body

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'ქალაქის სახელი აუცილებელია' },
        { status: 400 }
      )
    }

    if (price === undefined || price === null || typeof price !== 'number' || price < 0) {
      return NextResponse.json(
        { success: false, error: 'მიტანის ფასი აუცილებელია და უნდა იყოს დადებითი რიცხვი' },
        { status: 400 }
      )
    }

    // Check if city with same name already exists
    const existingCity = await prisma.deliveryCity.findUnique({
      where: { name: name.trim() }
    })

    if (existingCity) {
      return NextResponse.json(
        { success: false, error: 'ქალაქი ამ სახელით უკვე არსებობს' },
        { status: 400 }
      )
    }

    // Create new delivery city
    const newCity = await prisma.deliveryCity.create({
      data: {
        name: name.trim(),
        price: price,
        isActive: isActive !== undefined ? isActive : true
      }
    })

    return NextResponse.json({
      success: true,
      message: 'ქალაქი წარმატებით დაემატა',
      city: newCity
    })

  } catch (error) {
    console.error('Error creating delivery city:', error)
    return NextResponse.json(
      { success: false, error: 'Error creating delivery city' },
      { status: 500 }
    )
  }
}

// PUT - Update a delivery city (admin only)
export async function PUT(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { id, name, price, isActive } = body

    // Validation
    if (!id || typeof id !== 'number') {
      return NextResponse.json(
        { success: false, error: 'ქალაქის ID აუცილებელია' },
        { status: 400 }
      )
    }

    // Check if city exists
    const existingCity = await prisma.deliveryCity.findUnique({
      where: { id }
    })

    if (!existingCity) {
      return NextResponse.json(
        { success: false, error: 'ქალაქი ვერ მოიძებნა' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: {
      name?: string
      price?: number
      isActive?: boolean
    } = {}

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'ქალაქის სახელი არ შეიძლება იყოს ცარიელი' },
          { status: 400 }
        )
      }

      // Check if another city with same name exists
      const duplicateCity = await prisma.deliveryCity.findUnique({
        where: { name: name.trim() }
      })

      if (duplicateCity && duplicateCity.id !== id) {
        return NextResponse.json(
          { success: false, error: 'ქალაქი ამ სახელით უკვე არსებობს' },
          { status: 400 }
        )
      }

      updateData.name = name.trim()
    }

    if (price !== undefined) {
      if (typeof price !== 'number' || price < 0) {
        return NextResponse.json(
          { success: false, error: 'მიტანის ფასი უნდა იყოს დადებითი რიცხვი' },
          { status: 400 }
        )
      }
      updateData.price = price
    }

    if (isActive !== undefined) {
      if (typeof isActive !== 'boolean') {
        return NextResponse.json(
          { success: false, error: 'isActive უნდა იყოს boolean' },
          { status: 400 }
        )
      }
      updateData.isActive = isActive
    }

    // Update city
    const updatedCity = await prisma.deliveryCity.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      message: 'ქალაქი წარმატებით განახლდა',
      city: updatedCity
    })

  } catch (error) {
    console.error('Error updating delivery city:', error)
    return NextResponse.json(
      { success: false, error: 'Error updating delivery city' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a delivery city (admin only)
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ქალაქის ID აუცილებელია' },
        { status: 400 }
      )
    }

    const cityId = parseInt(id, 10)
    if (isNaN(cityId)) {
      return NextResponse.json(
        { success: false, error: 'არასწორი ID ფორმატი' },
        { status: 400 }
      )
    }

    // Check if city exists
    const existingCity = await prisma.deliveryCity.findUnique({
      where: { id: cityId },
      include: {
        _count: {
          select: {
            orders: true,
            carts: true
          }
        }
      }
    })

    if (!existingCity) {
      return NextResponse.json(
        { success: false, error: 'ქალაქი ვერ მოიძებნა' },
        { status: 404 }
      )
    }

    // Check if city is used in any orders or carts
    if (existingCity._count.orders > 0 || existingCity._count.carts > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'ქალაქი ვერ წაიშლება, რადგან იგი გამოიყენება შეკვეთებში ან კალათებში. გთხოვთ, ჯერ გააუქმოთ ის.' 
        },
        { status: 400 }
      )
    }

    // Delete city
    await prisma.deliveryCity.delete({
      where: { id: cityId }
    })

    return NextResponse.json({
      success: true,
      message: 'ქალაქი წარმატებით წაიშალა'
    })

  } catch (error) {
    console.error('Error deleting delivery city:', error)
    return NextResponse.json(
      { success: false, error: 'Error deleting delivery city' },
      { status: 500 }
    )
  }
}
