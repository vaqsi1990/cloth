import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: Request,
  context: { params: Record<string, string> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const userId = context.params.id
    const { status, comment } = await req.json()

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      )
    }

    const verification = await prisma.userVerification.findUnique({
      where: { userId }
    })

    if (!verification) {
      return NextResponse.json(
        { success: false, error: 'Verification not found' },
        { status: 404 }
      )
    }

    const updated = await prisma.userVerification.update({
      where: { userId },
      data: {
        identityStatus: status,
        identityComment: status === 'REJECTED' ? comment || null : null,
        status,
        comment: status === 'REJECTED' ? comment || null : null,
      }
    })

    if (status === 'APPROVED') {
      await prisma.user.update({
        where: { id: userId },
        data: { verified: true }
      })
    }

    return NextResponse.json({ success: true, verification: updated })

  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    )
  }
}
