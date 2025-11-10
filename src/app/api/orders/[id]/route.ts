import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET - Fetch single order by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const orderId = parseInt(resolvedParams.id)
    
    if (isNaN(orderId) || orderId <= 0) {
      return NextResponse.json({
        success: false,
        message: 'არასწორი შეკვეთის ID. გთხოვთ შეამოწმოთ URL მისამართი.'
      }, { status: 400 })
    }

    const session = await getServerSession(authOptions)
    
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        user: true
      }
    })

    if (!order) {
      return NextResponse.json({
        success: false,
        message: 'შეკვეთა ვერ მოიძებნა'
      }, { status: 404 })
    }

    // Check if user owns the order or is admin
    if (session && (session.user.role === 'ADMIN' || order.userId === session.user.id)) {
      return NextResponse.json({
        success: true,
        order: order
      })
    } else {
      return NextResponse.json(
        { 
          success: false, 
          message: 'თქვენ არ გაქვთ ამ შეკვეთის ნახვის უფლება' 
        },
        { status: 403 }
      )
    }
    
  } catch (error) {
    console.error('Error fetching order:', error)
    return NextResponse.json({
      success: false,
      message: 'შეცდომა შეკვეთის მიღებისას'
    }, { status: 500 })
  }
}

// PATCH - Update order status (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const resolvedParams = await params
    const orderId = parseInt(resolvedParams.id)
    
    if (isNaN(orderId) || orderId <= 0) {
      return NextResponse.json({
        success: false,
        message: 'არასწორი შეკვეთის ID. გთხოვთ შეამოწმოთ URL მისამართი.'
      }, { status: 400 })
    }

    const body = await request.json()
    const { status } = body

    if (!status || !['PENDING', 'PAID', 'SHIPPED', 'CANCELED', 'REFUNDED'].includes(status)) {
      return NextResponse.json({
        success: false,
        message: 'არასწორი სტატუსი'
      }, { status: 400 })
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: {
        items: true,
        user: true
      }
    })

    return NextResponse.json({
      success: true,
      message: 'შეკვეთის სტატუსი განახლდა',
      order: updatedOrder
    })
    
  } catch (error) {
    console.error('Error updating order:', error)
    return NextResponse.json({
      success: false,
      message: 'შეცდომა შეკვეთის განახლებისას'
    }, { status: 500 })
  }
}

// DELETE - Delete order (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const resolvedParams = await params
    const orderId = parseInt(resolvedParams.id)
    
    if (isNaN(orderId) || orderId <= 0) {
      return NextResponse.json({
        success: false,
        message: 'არასწორი შეკვეთის ID. გთხოვთ შეამოწმოთ URL მისამართი.'
      }, { status: 400 })
    }

    // Check if order exists
    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId }
    })

    if (!existingOrder) {
      return NextResponse.json({
        success: false,
        message: 'შეკვეთა ვერ მოიძებნა'
      }, { status: 404 })
    }

    // Delete order (this will cascade delete order items due to onDelete: Cascade)
    await prisma.order.delete({
      where: { id: orderId }
    })

    return NextResponse.json({
      success: true,
      message: 'შეკვეთა წაიშალა წარმატებით'
    })
    
  } catch (error) {
    console.error('Error deleting order:', error)
    return NextResponse.json({
      success: false,
      message: 'შეცდომა შეკვეთის წაშლისას'
    }, { status: 500 })
  }
}
