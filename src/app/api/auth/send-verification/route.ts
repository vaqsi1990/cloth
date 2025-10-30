import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendVerificationEmail } from '@/lib/email';
import { z } from 'zod';

const sendVerificationSchema = z.object({
  email: z.string().email('გთხოვთ შეიყვანოთ სწორი ელ-ფოსტა'),
});

export async function POST(request: NextRequest) {
  try {
    console.log('Send verification API called')
    
  
    
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.error('Missing email configuration')
      return NextResponse.json(
        { error: 'ელ-ფოსტის კონფიგურაცია არ არის დაყენებული' },
        { status: 500 }
      );
    }
    
    const body = await request.json();
    console.log('Request body:', body)
    
    // Validate the request body
    const validatedData = sendVerificationSchema.parse(body);
    console.log('Validated data:', validatedData)
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    });
    
    if (existingUser) {
      console.log('User already exists:', validatedData.email)
      return NextResponse.json(
        { error: 'ამ ელ-ფოსტით მომხმარებელი უკვე არსებობს' },
        { status: 400 }
      );
    }
    
    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('Generated verification code:', verificationCode)
    
    // Set expiration time (10 minutes from now)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    console.log('Expires at:', expiresAt)
    
    // Delete any existing verification tokens for this email (identifier field in schema)
    await prisma.verificationToken.deleteMany({
      where: { identifier: validatedData.email }
    });
    console.log('Deleted existing tokens for:', validatedData.email)
    
    // Create new verification token
    const newToken = await prisma.verificationToken.create({
      data: {
        identifier: validatedData.email,
        token: verificationCode,
        expires: expiresAt,
      }
    });
    console.log('Created new token:', newToken)
    
    // Send verification email
    console.log('Sending verification email...')
    const emailResult = await sendVerificationEmail(validatedData.email, verificationCode);
    console.log('Email result:', emailResult)
    
    if (!emailResult.success) {
      console.log('Email sending failed')
      return NextResponse.json(
        { error: 'ვერიფიკაციის ელ-ფოსტის გაგზავნა ვერ მოხერხდა' },
        { status: 500 }
      );
    }
    
    console.log('Verification email sent successfully')
    return NextResponse.json({
      message: 'ვერიფიკაციის კოდი წარმატებით გაიგზავნა',
      email: validatedData.email
    });
    
  } catch (error) {
    console.error('Send verification error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'დაფიქსირდა შეცდომა' },
      { status: 500 }
    );
  }
}
