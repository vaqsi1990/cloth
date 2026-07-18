import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { isValidPhone, normalizePhone, phoneLookupVariants } from '@/lib/phone'
import { saveUserIbanVerification } from '@/lib/user-iban-verification'

const emptyToUndefined = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value

const normalizeIban = (value: unknown) => {
  if (typeof value !== 'string' || value.trim() === '') return undefined
  return value.replace(/\s+/g, '').toUpperCase()
}

const profileSchema = z.object({
  name: z.string().min(1, 'სახელი აუცილებელია'),
  email: z.string().email('არასწორი ელფოსტა'),
  image: z.preprocess(emptyToUndefined, z.string().nullable().optional()),
  phone: z.preprocess(
    emptyToUndefined,
    z.string()
      .transform(normalizePhone)
      .refine(isValidPhone, 'ტელეფონის ნომერი არასწორია. მაგ: 555123456 ან +995555123456')
      .optional()
  ),
  location: z.preprocess(emptyToUndefined, z.string().min(2, 'ადგილმდებარეობა არასწორია').optional()),
  lastName: z.preprocess(emptyToUndefined, z.string().min(2, 'გვარი არასწორია').optional()),
  address: z.preprocess(emptyToUndefined, z.string().min(2, 'მისამართი არასწორია').optional()),
  postalIndex: z.preprocess(emptyToUndefined, z.string().min(2, 'საფოსტო ინდექსი არასწორია').optional()),
  pickupAddress: z.preprocess(emptyToUndefined, z.string().min(2, 'ადგილზე მისამართვის მისამართი არასწორია').optional()),
  gender: z.enum(["MALE", "FEMALE", "OTHER"], { message: "სქესი არასწორია" }).optional(),
  dateOfBirth: z.preprocess(emptyToUndefined, z.string().optional()),
  iban: z.preprocess(
    normalizeIban,
    z.string()
      .min(22, 'IBAN აუცილებელია')
      .max(34, 'IBAN არასწორია')
      .regex(/^GE\d{2}[0-9A-Z]{16,}$/, 'გთხოვთ შეიყვანოთ ქართული ბანკის IBAN (GE...)')
      .optional()
  ),
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
    const { name, email, image, phone, location, lastName, address, postalIndex, pickupAddress, gender, dateOfBirth, iban } = profileSchema.parse(body)

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { phone: true, email: true },
    })

    const phoneWasCleared = typeof body.phone === 'string' && body.phone.trim() === ''
    let phoneToSave: string

    if (phone) {
      phoneToSave = phone
    } else if (phoneWasCleared || !currentUser?.phone) {
      return NextResponse.json(
        { success: false, error: 'ტელეფონის ნომერი საჭიროა' },
        { status: 400 }
      )
    } else {
      phoneToSave = currentUser.phone
    }

    // Email cannot be changed via profile (prevents account takeover).
    const emailToSave = currentUser?.email
    if (!emailToSave) {
      return NextResponse.json(
        { success: false, error: 'ელფოსტა ვერ მოიძებნა' },
        { status: 400 },
      )
    }

    // Check if phone is already taken by another user
    const existingPhone = await prisma.user.findFirst({
      where: {
        phone: { in: phoneLookupVariants(phoneToSave) },
        id: { not: session.user.id },
      },
    })
    if (existingPhone) {
      return NextResponse.json(
        { success: false, error: 'ტელეფონის ნომერი უკვე გამოყენებულია' },
        { status: 409 }
      )
    }

    // Check if personalId is already taken by another user
    // Note: personalId cannot be updated through this endpoint
    // It's only set during registration

    const userSelect = {
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
      pickupAddress: true,
      gender: true,
      dateOfBirth: true,
      iban: true,
    } as const

    if (iban !== undefined) {
      try {
        await saveUserIbanVerification(session.user.id, iban)
      } catch (error) {
        return NextResponse.json(
          { success: false, error: 'IBAN არასწორია' },
          { status: 400 }
        )
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name,
        email: emailToSave,
        image: image || null,
        phone: phoneToSave,
        location: location ?? undefined,
        lastName: lastName ?? undefined,
        address: address ?? undefined,
        postalIndex: postalIndex ?? undefined,
        pickupAddress: pickupAddress ?? undefined,
        gender: gender ?? undefined,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      },
      select: userSelect,
    })

    return NextResponse.json({
      success: true,
      message: 'პროფილი წარმატებით განახლდა',
      user: updatedUser,
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
        pickupAddress: true,
        gender: true,
        dateOfBirth: true,
        iban: true,
        freeDelivery: true,
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

    // Check if user has active rentals
    const now = new Date()
    
    // Check active rentals from Rental table
    const activeRentals = await prisma.rental.findFirst({
      where: {
        userId: session.user.id,
        status: {
          in: ['RESERVED', 'ACTIVE']
        },
        endDate: {
          gte: now // Rental hasn't ended yet
        }
      }
    })

    // Check active rental orders
    const activeRentalOrders = await prisma.order.findFirst({
      where: {
        userId: session.user.id,
        status: {
          in: ['PENDING', 'PAID', 'SHIPPED']
        },
        items: {
          some: {
            isRental: true,
            rentalEndDate: {
              gte: now // Rental period hasn't ended yet
            }
          }
        }
      }
    })

    if (activeRentals || activeRentalOrders) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'თქვენ გაქვთ აქტიური ქირები. გთხოვთ დააბრუნოთ პროდუქტები და შემდეგ სცადოთ პროფილის წაშლა.' 
        },
        { status: 400 }
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