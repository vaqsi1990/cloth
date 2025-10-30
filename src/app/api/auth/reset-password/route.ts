import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { token, email, newPassword } = await request.json()

    if (!token || !email || !newPassword) {
      return NextResponse.json(
        { error: 'ყველა ველი საჭიროა' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო' },
        { status: 400 }
      )
    }

    // Find and verify the reset token
    // Find and verify the reset token
    console.log('Trying reset with email:', email, 'token:', token);
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: { email: email.toLowerCase(), token, expires: { gt: new Date() } }
    });
    console.log('Reset token found:', !!resetToken, resetToken);

    if (!resetToken) {
      return NextResponse.json( { error: 'არასწორი ან გაუქმებული ლინკი' }, { status: 400 });
    }

    if (!resetToken) {
      return NextResponse.json(
        { error: 'არასწორი ან გაუქმებული ლინკი' },
        { status: 400 }
      )
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'მომხმარებელი ვერ მოიძებნა' },
        { status: 404 }
      )
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12)

    // Update the user's password
    await prisma.user.update({
      where: { email: email.toLowerCase() },
      data: { password: hashedPassword }
    })

    // Delete the used reset token
    await prisma.passwordResetToken.delete({
      where: { id: resetToken.id }
    })

    return NextResponse.json({
      message: 'პაროლი წარმატებით შეიცვალა'
    })

  } catch (error) {
    console.error('Error resetting password:', error)
    return NextResponse.json(
      { error: 'სერვერის შეცდომა' },
      { status: 500 }
    )
  }
}
