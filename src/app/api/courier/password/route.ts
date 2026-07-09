import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { isCourier } from '@/lib/roles'

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'მიმდინარე პაროლი აუცილებელია'),
  newPassword: z.string().min(6, 'ახალი პაროლი მინიმუმ 6 სიმბოლო უნდა იყოს'),
})

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isCourier(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'კურიერის წვდომა საჭიროა' },
        { status: 403 },
      )
    }

    const { currentPassword, newPassword } = passwordSchema.parse(await request.json())

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    })

    if (!user?.password) {
      return NextResponse.json(
        { success: false, error: 'მომხმარებელი ვერ მოიძებნა' },
        { status: 404 },
      )
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password)
    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'მიმდინარე პაროლი არასწორია' },
        { status: 400 },
      )
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: await bcrypt.hash(newPassword, 10) },
    })

    return NextResponse.json({
      success: true,
      message: 'პაროლი წარმატებით შეიცვალა',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 },
      )
    }

    console.error('Error changing courier password:', error)
    return NextResponse.json(
      { success: false, error: 'შეცდომა პაროლის შეცვლისას' },
      { status: 500 },
    )
  }
}
