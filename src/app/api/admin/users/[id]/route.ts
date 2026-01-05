import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdminOrSupport } from '@/lib/roles'

// DELETE - Delete user by ID
export async function DELETE(
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
    const userId = resolvedParams.id

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!existingUser) {
      return NextResponse.json({
        success: false,
        message: 'მომხმარებელი ვერ მოიძებნა'
      }, { status: 404 })
    }

    // Prevent admin from deleting themselves
    if (userId === session.user.id) {
      return NextResponse.json(
        { success: false, error: 'თქვენ ვერ წაშლით საკუთარ თავს' },
        { status: 400 }
      )
    }

    // Delete user (cascade will handle related records)
    await prisma.user.delete({
      where: { id: userId }
    })

    return NextResponse.json({
      success: true,
      message: 'მომხმარებელი წარმატებით წაიშალა'
    })
    
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({
      success: false,
      message: 'შეცდომა მომხმარებლის წაშლისას'
    }, { status: 500 })
  }
}
