import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { token, email } = await request.json()

    if (!token || !email) {
      return NextResponse.json(
        { error: 'ტოკენი და ელ-ფოსტა საჭიროა' },
        { status: 400 }
      )
    }

    // Find the reset token
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        email: email.toLowerCase(),
        token: token,
        expires: {
          gt: new Date()
        }
      }
    })

    if (!resetToken) {
      return NextResponse.json(
        { error: 'არასწორი ან გაუქმებული ლინკი' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: 'ტოკენი ვალიდურია'
    })

  } catch (error) {
    console.error('Error verifying reset token:', error)
    return NextResponse.json(
      { error: 'სერვერის შეცდომა' },
      { status: 500 }
    )
  }
}
