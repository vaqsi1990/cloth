import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { sendVerificationEmail } from '@/lib/email'

const schema = z.object({
  email: z.string().email('გთხოვთ შეიყვანოთ სწორი ელ-ფოსტა'),
})

function generateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = schema.parse(body)

    // Optional: block if user already exists
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: 'ამ ელ-ფოსტით მომხმარებელი უკვე არსებობს' },
        { status: 400 }
      )
    }

    // Invalidate previous codes for this email (cleanup)
    await prisma.registrationCode.deleteMany({ where: { email } })

    const code = generateCode()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    const created = await prisma.registrationCode.create({
      data: { email, code, expiresAt },
    })

    // Send verification email
    const emailResult = await sendVerificationEmail(email, created.code)

    if (!emailResult.success) {
      return NextResponse.json(
        { error: 'ელფოსტის გაგზავნის შეცდომა' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'ვერიფიკაციის კოდი გაიგზავნა',
      expiresAt: created.expiresAt,
    })
  } catch (error) {
    console.error('send-registration-code error', error)
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'სერვერის შეცდომა' }, { status: 500 })
  }
}


