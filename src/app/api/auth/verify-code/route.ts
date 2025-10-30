import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const verifyCodeSchema = z.object({
  email: z.string().email('გთხოვთ შეიყვანოთ სწორი ელ-ფოსტა'),
  code: z.string().length(6, 'ვერიფიკაციის კოდი უნდა შეიცავდეს 6 ციფრს'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate the request body
    const validatedData = verifyCodeSchema.parse(body);
    
    // Find the verification token
    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        identifier: validatedData.email,
        token: validatedData.code,
        expires: {
          gt: new Date() // Token hasn't expired
        }
      }
    });
    
    if (!verificationToken) {
      return NextResponse.json(
        { error: 'არასწორი ან ვადაგასული ვერიფიკაციის კოდი' },
        { status: 400 }
      );
    }
    
    // Mark email as verified by creating a temporary record
    // This will be used during the actual registration
    await prisma.verifiedEmail.create({
      data: {
        email: validatedData.email,
        verifiedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes to complete registration
      }
    });
    
    // Delete the used verification token (composite unique: identifier + token)
    await prisma.verificationToken.delete({
      where: { identifier_token: { identifier: verificationToken.identifier, token: verificationToken.token } }
    });
    
    return NextResponse.json({
      message: 'ელ-ფოსტა წარმატებით გადამოწმდა',
      email: validatedData.email
    });
    
  } catch (error) {
    console.error('Verify code error:', error);
    
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
