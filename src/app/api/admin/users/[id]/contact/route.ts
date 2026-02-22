import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const contactSchema = z.object({
  email: z.string().email('არასწორი ელფოსტა').optional(),
  phone: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
})

// PUT - Admin updates user contact info (email, phone, address, location)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const resolvedParams = await params
    const userId = resolvedParams.id
    const body = await request.json()
    const data = contactSchema.parse(body)

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, phone: true },
    })

    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'მომხმარებელი ვერ მოიძებნა' },
        { status: 404 }
      )
    }

    if (data.email !== undefined) {
      const emailTaken = await prisma.user.findFirst({
        where: {
          email: data.email,
          id: { not: userId },
        },
      })
      if (emailTaken) {
        return NextResponse.json(
          { success: false, error: 'ელფოსტა უკვე გამოიყენება სხვა მომხმარებლის მიერ' },
          { status: 409 }
        )
      }
    }

    if (data.phone !== undefined && data.phone) {
      const phoneTaken = await prisma.user.findFirst({
        where: {
          phone: data.phone,
          id: { not: userId },
        },
      })
      if (phoneTaken) {
        return NextResponse.json(
          { success: false, error: 'ტელეფონის ნომერი უკვე გამოიყენება სხვა მომხმარებლის მიერ' },
          { status: 409 }
        )
      }
    }

    const updateData: {
      email?: string
      phone?: string | null
      location?: string | null
      address?: string | null
    } = {}
    if (data.email !== undefined) updateData.email = data.email
    if (data.phone !== undefined) updateData.phone = data.phone
    if (data.location !== undefined) updateData.location = data.location
    if (data.address !== undefined) updateData.address = data.address

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        location: true,
        address: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'კონტაქტის ინფორმაცია განახლდა',
      user: updatedUser,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      )
    }
    console.error('Error updating user contact:', error)
    return NextResponse.json(
      { success: false, error: 'შეცდომა კონტაქტის განახლებისას' },
      { status: 500 }
    )
  }
}
