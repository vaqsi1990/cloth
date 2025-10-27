import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Fetch all orders (admin only)
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

    const orders = await prisma.order.findMany({
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                status: true,
                images: {
                  select: {
                    url: true,
                    alt: true
                  }
                },
                rentalPriceTiers: {
                  orderBy: { minDays: 'asc' }
                }
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Filter items to exclude those with AVAILABLE product status
    // Also filter out entire orders if all items are AVAILABLE
    const filteredOrders = orders
      .map(order => ({
        ...order,
        items: order.items.filter(item => {
          // If product relationship exists and product status is AVAILABLE, exclude the item
          console.log('Filtering item:', item.productId, 'Product status:', item.product?.status)
          if (item.product && item.product.status === 'AVAILABLE') {
            console.log('Excluding item with AVAILABLE status')
            return false
          }
          // If product relationship doesn't exist, keep the item
          return true
        })
      }))
      .filter(order => {
        // Exclude orders that have no items after filtering
        return order.items.length > 0
      })
    
    console.log('Filtered orders length:', filteredOrders.length)
    console.log('Total orders before filter:', orders.length)

    return NextResponse.json({
      success: true,
      orders: filteredOrders
    })

  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { success: false, error: 'Error fetching orders' },
      { status: 500 }
    )
  }
}
