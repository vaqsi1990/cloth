import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Get all chat rooms for admin
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({
        success: false,
        message: 'Admin access required'
      }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const whereClause: Record<string, unknown> = {}
    if (status && ['PENDING', 'ACTIVE', 'CLOSED'].includes(status)) {
      whereClause.status = status
    }

    // Use Prisma's findMany with proper relations instead of raw SQL
    const chatRooms = await prisma.chatRoom.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        admin: {
          select: {
            name: true,
            email: true
          }
        },
        messages: {
          select: {
            id: true
          }
        },
        _count: {
          select: {
            messages: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      skip,
      take: limit
    })

    const total = await prisma.chatRoom.count({
      where: whereClause
    })

    // Transform data to include proper user/admin objects
    const transformedChatRooms = chatRooms.map(room => ({
      id: room.id,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      status: room.status,
      guestName: room.guestName,
      guestEmail: room.guestEmail,
      user: room.user,
      admin: room.admin,
      _count: room._count,
      messages: []
    }))

    console.log(`✅ Admin fetched ${transformedChatRooms.length} chat rooms`)
    console.log('Chat rooms:', transformedChatRooms.map(r => ({ id: r.id, user: r.user?.name || r.guestName, status: r.status })))

    return NextResponse.json({
      success: true,
      chatRooms: transformedChatRooms,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Error fetching admin chat rooms:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - Update chat room status (assign to admin, close, etc.)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({
        success: false,
        message: 'Admin access required'
      }, { status: 401 })
    }

    const body = await request.json()
    const { chatRoomId, action } = body

    if (!chatRoomId || !action) {
      return NextResponse.json({
        success: false,
        message: 'Chat room ID and action are required'
      }, { status: 400 })
    }

    let updateData: Record<string, unknown> = {}

    switch (action) {
      case 'assign':
        updateData = {
          adminId: session.user.id,
          status: 'ACTIVE'
        }
        break
      case 'close':
        updateData = {
          status: 'CLOSED'
        }
        break
      case 'reopen':
        updateData = {
          status: 'ACTIVE'
        }
        break
      default:
        return NextResponse.json({
          success: false,
          message: 'Invalid action'
        }, { status: 400 })
    }

    const updatedChatRoom = await prisma.chatRoom.update({
      where: {
        id: chatRoomId
      },
      data: updateData,
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        admin: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      chatRoom: updatedChatRoom
    })

  } catch (error) {
    console.error('Error updating chat room:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete chat room
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({
        success: false,
        message: 'Admin access required'
      }, { status: 401 })
    }

    const body = await request.json()
    const { chatRoomId } = body

    if (!chatRoomId) {
      return NextResponse.json({
        success: false,
        message: 'Chat room ID is required'
      }, { status: 400 })
    }

    // Delete the chat room (messages will be deleted due to cascade)
    await prisma.chatRoom.delete({
      where: {
        id: chatRoomId
      }
    })

    console.log(`✅ Admin ${session.user.id} deleted chat room ${chatRoomId}`)

    return NextResponse.json({
      success: true,
      message: 'Chat room deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting chat room:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
