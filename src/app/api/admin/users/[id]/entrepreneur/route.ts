import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

    const userId = (await params).id
    const body = await request.json()
    const { status, comment } = body

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status. Must be APPROVED or REJECTED' },
        { status: 400 }
      )
    }

    const verification = await prisma.userVerification.findUnique({
      where: { userId },
      select: {
        userId: true,
      }
    })

    if (!verification) {
      return NextResponse.json(
        { success: false, error: 'Verification not found' },
        { status: 404 }
      )
    }

    const updateData = {
      entrepreneurStatus: status,
      entrepreneurComment: status === 'REJECTED' ? comment || null : null,
      status: status,
      comment: status === 'REJECTED' ? comment || null : null,
    }

    const updated = await prisma.userVerification.update({
      where: { userId },
      data: updateData,
    })

    if (status === 'APPROVED') {
      await prisma.user.update({
        where: { id: userId },
        data: { blocked: false },
      })
    }

    return NextResponse.json({ success: true, verification: updated })
  } catch (error) {
    console.error('Error updating entrepreneur verification:', error)
    return NextResponse.json(
      { success: false, error: 'Entrepreneur verification update failed' },
      { status: 500 }
    )
  }
}
