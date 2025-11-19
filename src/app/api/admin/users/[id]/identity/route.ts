import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const userId = params.id
    const body = await req.json()
    const { status, comment } = body

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
    console.error('Error updating identity verification:', error)
    return NextResponse.json(
      { success: false, error: 'Identity verification update failed' },
      { status: 500 }
    )
  }
}
