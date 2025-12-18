import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const profileSchema = z.object({
  name: z.string().min(1, 'სახელი აუცილებელია'),
  email: z.string().email('არასწორი ელფოსტა'),
  image: z.string().nullable().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  address: z.string().optional(),
  postalIndex: z.string().optional(),
  pickupAddress: z.string().optional()
})

// PUT - Update user profile
export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, email, image, phone, location, address, postalIndex, pickupAddress } = profileSchema.parse(body)

    // Check if email is already taken by another user
    const existingUser = await prisma.user.findFirst({
      where: {
        email: email,
        id: { not: session.user.id }
      }
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'ელფოსტა უკვე გამოიყენება' },
        { status: 409 }
      )
    }

    // Check if phone is already taken by another user
    if (phone) {
      const existingPhone = await prisma.user.findFirst({
        where: {
          phone: phone,
          id: { not: session.user.id }
        }
      })
      if (existingPhone) {
        return NextResponse.json(
          { success: false, error: 'ტელეფონი უკვე გამოიყენება' },
          { status: 409 }
        )
      }
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name,
        email,
        image: image || null,
        phone: phone ?? undefined,
        location: location ?? undefined,
        address: address ?? undefined,
        postalIndex: postalIndex ?? undefined,
        pickupAddress: pickupAddress ?? undefined
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        phone: true,
        location: true,
        address: true,
        postalIndex: true,
        pickupAddress: true
      }
    })

    return NextResponse.json({
      success: true,
      message: 'პროფილი წარმატებით განახლდა',
      user: updatedUser
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('Error updating profile:', error)
    return NextResponse.json(
      { success: false, error: 'შეცდომა პროფილის განახლებისას' },
      { status: 500 }
    )
  }
}
