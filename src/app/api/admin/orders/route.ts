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
                userId: true, // Include userId to verify product has owner
                images: {
                  select: {
                    url: true,
                    alt: true
                  }
                },
                rentalPriceTiers: {
                  orderBy: { minDays: 'asc' }
                },
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    pickupAddress: true,
                    address: true
                  }
                }
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        deliveryCity: {
          select: {
            id: true,
            name: true,
            price: true,
            isActive: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Debug: Check for products without users
    let productsWithoutUsers = 0
    let productsWithUsers = 0
    let itemsWithoutProducts = 0
    
    orders.forEach(order => {
      order.items.forEach(item => {
        if (!item.product) {
          itemsWithoutProducts++
        } else if (item.product.userId && !item.product.user) {
          productsWithoutUsers++
          console.log(`⚠️ Product ${item.product.id} has userId ${item.product.userId} but user relation is null`)
        } else if (item.product.user) {
          productsWithUsers++
        }
      })
    })
    
    console.log(`📊 Order stats: ${productsWithUsers} products with users, ${productsWithoutUsers} products without users, ${itemsWithoutProducts} items without products`)

    return NextResponse.json({
      success: true,
      orders: orders
    })

  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { success: false, error: 'Error fetching orders' },
      { status: 500 }
    )
  }
}
