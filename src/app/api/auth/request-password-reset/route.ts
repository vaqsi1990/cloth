import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPasswordResetEmail } from '@/lib/email'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    console.log('Password reset request received')
    
    // Check environment variables
    console.log('Environment check:', {
      EMAIL_USER: process.env.EMAIL_USER,
      EMAIL_PASSWORD: process.env.EMAIL_PASSWORD ? 'SET' : 'NOT SET'
    })
    
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.error('Missing email configuration')
      return NextResponse.json(
        { error: 'ელ-ფოსტის კონფიგურაცია არ არის დაყენებული' },
        { status: 500 }
      );
    }
    
    const { email } = await request.json()
    console.log('Email received:', email)

    if (!email) {
      console.log('No email provided')
      return NextResponse.json(
        { error: 'ელ-ფოსტა საჭიროა' },
        { status: 400 }
      )
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })
    console.log('User found:', !!user)

    if (!user) {
      // Don't reveal if user exists or not for security
      console.log('User not found, returning generic message')
      return NextResponse.json({
        message: 'თუ ელ-ფოსტა არსებობს, პაროლის აღდგენის ლინკი გაიგზავნება'
      })
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    console.log('Generated reset token, expires:', resetTokenExpiry)

    // Save reset token to database
    await prisma.passwordResetToken.upsert({
      where: { email: email.toLowerCase() },
      update: {
        token: resetToken,
        expires: resetTokenExpiry
      },
      create: {
        email: email.toLowerCase(),
        token: resetToken,
        expires: resetTokenExpiry
      }
    })
    console.log('Reset token saved to database')

    // Send password reset email
    try {
      console.log('Attempting to send password reset email')
      await sendPasswordResetEmail(email, resetToken)
      console.log('Password reset email sent successfully')
    } catch (emailError) {
      console.error('Email sending failed:', emailError)
      // Delete the token if email fails
      await prisma.passwordResetToken.delete({
        where: { email: email.toLowerCase() }
      })
      return NextResponse.json(
        { error: 'ელ-ფოსტის გაგზავნა ვერ მოხერხდა. გთხოვთ სცადოთ მოგვიანებით' },
        { status: 500 }
      )
    }

    console.log('Password reset request completed successfully')
    return NextResponse.json({
      message: 'პაროლის აღდგენის ლინკი გაიგზავნა თქვენს ელ-ფოსტაზე'
    })

  } catch (error) {
    console.error('Error requesting password reset:', error)
    return NextResponse.json(
      { error: 'სერვერის შეცდომა' },
      { status: 500 }
    )
  }
}
