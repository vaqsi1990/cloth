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
  lastName: z.string().min(2, 'გვარი არასწორია').optional(),
  address: z.string().min(2, 'მისამართი არასწორია').optional(),
  postalIndex: z.string().min(2, 'საფოსტო ინდექსი არასწორია').optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"], { message: "სქესი არასწორია" }).optional(),
  dateOfBirth: z.string().optional(),
  // personalId is not included in schema - should not be updatable
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
    const { name, email, image, phone, location, lastName, address, postalIndex, gender, dateOfBirth } = profileSchema.parse(body)

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
    // Note: personalId cannot be updated through this endpoint
    // It's only set during registration

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name,
        email,
        image: image || null,
        phone: phone ?? undefined,
        location: location ?? undefined,
        lastName: lastName ?? undefined,
        address: address ?? undefined,
        postalIndex: postalIndex ?? undefined,
        gender: gender ?? undefined,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
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
        lastName: true,
        address: true,
        postalIndex: true,
        gender: true,
        dateOfBirth: true,
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
        lastName: true,
        address: true,
        postalIndex: true,
        gender: true,
        dateOfBirth: true,
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

// DELETE - Delete user profile (keep only personalId)
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user to preserve personalId
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { personalId: true }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'მომხმარებელი ვერ მოიძებნა' },
        { status: 404 }
      )
    }

    // Delete all user sessions to log them out
    await prisma.session.deleteMany({
      where: { userId: session.user.id }
    })

    // Clear all user data except personalId
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: null,
        lastName: null,
        email: `deleted_${Date.now()}@deleted.local`, // Set unique email to avoid conflicts
        phone: null,
        location: null,
        address: null,
        postalIndex: null,
        gender: null,
        dateOfBirth: null,
        password: null, // Clear password so they can't login
        image: null,
        emailVerified: null,
        banned: false,
        banReason: null,
        bannedAt: null,
        // personalId is preserved automatically (not in data object)
      }
    })

    // Delete user verification if exists
    await prisma.userVerification.deleteMany({
      where: { userId: session.user.id }
    })

    return NextResponse.json({
      success: true,
      message: 'პროფილი წარმატებით წაიშალა'
    })

  } catch (error) {
    console.error('Error deleting profile:', error)
    return NextResponse.json(
      { success: false, error: 'შეცდომა პროფილის წაშლისას' },
      { status: 500 }
    )
  }
}