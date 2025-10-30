import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const profileSchema = z.object({
  name: z.string().min(1, 'სახელი აუცილებელია'),
  email: z.string().email('არასწორი ელფოსტა'),
  image: z.string().nullable().optional(),
  phone: z.string().min(6, 'ტელეფონის ნომერი არასწორია').optional(),
  location: z.string().min(2, 'ადგილმდებარეობა არასწორია').optional(),
  personalId: z.string().min(6, 'პირადობის ნომერი არასწორია').optional(),
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
    const { name, email, image, phone, location, personalId } = profileSchema.parse(body)

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

    // Check if personalId is already taken by another user
    if (personalId) {
      const existingPid = await prisma.user.findFirst({
        where: {
          personalId: personalId,
          id: { not: session.user.id }
        }
      })
      if (existingPid) {
        return NextResponse.json(
          { success: false, error: 'პირადობის ნომერი უკვე გამოიყენება' },
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
        personalId: personalId ?? undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        phone: true,
        location: true,
        personalId: true,
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

// GET - Get user profile
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user profile
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        createdAt: true,
        phone: true,
        location: true,
        personalId: true,
      }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'მომხმარებელი ვერ მოიძებნა' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      user
    })

  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json(
      { success: false, error: 'შეცდომა პროფილის მიღებისას' },
      { status: 500 }
    )
  }
}
