import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdminOrSupport } from '@/lib/roles'

export async function PATCH(
  req: Request,
{ params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !isAdminOrSupport(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Admin or Support access required' },
        { status: 403 }
      )
    }

    const userId = (await params).id
    const { status, comment } = await req.json()

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
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

    const updated = await prisma.userVerification.update({
      where: { userId },
      data: {
        identityStatus: status,
        identityComment: status === 'REJECTED' ? comment || null : null,
        status,
        comment: status === 'REJECTED' ? comment || null : null,
      },
      select: {
        id: true,
        userId: true,
        idFrontUrl: true,
        idBackUrl: true,
        entrepreneurCertificateUrl: true,
        identityStatus: true,
        entrepreneurStatus: true,
        identityComment: true,
        entrepreneurComment: true,
        status: true,
        comment: true,
        createdAt: true,
        updatedAt: true,
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
