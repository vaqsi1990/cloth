import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { isAdminOrSupport } from '@/lib/roles'

const statusSchema = z.object({
  status: z.enum(['PENDING', 'PAID', 'SHIPPED', 'CANCELED', 'REFUNDED'])
})

// PUT - Update order status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication and admin/support role
    const session = await getServerSession(authOptions)
    if (!session || !isAdminOrSupport(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Admin or Support access required' },
        { status: 403 }
      )
    }

    const resolvedParams = await params
    const orderId = parseInt(resolvedParams.id)
    const body = await request.json()
    const { status } = statusSchema.parse(body)

    if (isNaN(orderId)) {
      return NextResponse.json({
        success: false,
        message: 'არასწორი შეკვეთის ID'
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

    // Update order status
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { 
        status: status,
        updatedAt: new Date()
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: true
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'შეკვეთის სტატუსი წარმატებით განახლდა',
      order: updatedOrder
    })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('Error updating order status:', error)
    return NextResponse.json({
      success: false,
      message: 'შეცდომა სტატუსის განახლებისას'
    }, { status: 500 })
  }
}
