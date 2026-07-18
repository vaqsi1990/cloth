import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdminOrSupport } from '@/lib/roles'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !isAdminOrSupport(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Admin or Support access required' },
        { status: 403 },
      )
    }

    const { freeDelivery } = await request.json()
    if (typeof freeDelivery !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Invalid payload' },
        { status: 400 },
      )
    }

    const { id: userId } = await params

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { freeDelivery },
      select: {
        id: true,
        name: true,
        email: true,
        freeDelivery: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: freeDelivery
        ? 'უფასო მიტანა ჩაირთო'
        : 'უფასო მიტანა გამოირთო',
      user: updated,
    })
  } catch (error) {
    console.error('Error updating free delivery:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update free delivery' },
      { status: 500 },
    )
  }
}
