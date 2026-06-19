import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { isValidPhone, normalizePhone, phoneLookupVariants } from '@/lib/phone'

const phoneSchema = z.object({
  phone: z
    .string()
    .min(1, 'ტელეფონის ნომერი საჭიროა')
    .transform(normalizePhone)
    .refine(isValidPhone, 'ტელეფონის ნომერი არასწორია. მაგ: 555123456 ან +995555123456'),
})

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 },
      )
    }

    const body = await request.json()
    const { phone } = phoneSchema.parse(body)

    const existingPhone = await prisma.user.findFirst({
      where: {
        phone: { in: phoneLookupVariants(phone) },
        id: { not: session.user.id },
      },
      select: { id: true },
    })

    if (existingPhone) {
      return NextResponse.json(
        { success: false, error: 'ტელეფონის ნომერი უკვე გამოყენებულია' },
        { status: 409 },
      )
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { phone },
      select: { phone: true },
    })

    return NextResponse.json({
      success: true,
      message: 'ტელეფონის ნომერი წარმატებით შენახულია',
      phone: updatedUser.phone,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 },
      )
    }

    console.error('Error saving phone:', error)
    return NextResponse.json(
      { success: false, error: 'შეცდომა ტელეფონის შენახვისას' },
      { status: 500 },
    )
  }
}
