import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { Prisma } from "@prisma/client"

const signupSchema = z.object({
  name: z.string().min(2, "სახელი უნდა იყოს მინიმუმ 2 სიმბოლო"),
  phone: z.string().min(6, "ტელეფონის ნომერი საჭიროა"),
  location: z.string().min(2, "ადგილმდებარეობა აუცილებელია"),
  personalId: z.string().min(6, "პირადობის ნომერი აუცილებელია"),
  email: z.string().email("არასწორი ელფოსტა"),
  password: z.string().min(6, "პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო"),
  code: z.string().length(6, "ვერიფიკაციის კოდი უნდა იყოს 6 სიმბოლო"),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = signupSchema.parse(body)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: {
        email: validatedData.email
      }
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "მომხმარებელი ამ ელფოსტით უკვე არსებობს" },
        { status: 400 }
      )
    }
        
    // Verify registration code (6-character alphanumeric)
    const regCode = await prisma.registrationCode.findFirst({
      where: {
        email: validatedData.email,
        code: validatedData.code,
        expiresAt: { gt: new Date() },
        usedAt: null,
      }
    })

    if (!regCode) {
      return NextResponse.json(
        { error: 'არასწორი ან ვადაგასული კოდი' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 12)

    // Create user
    const user = await prisma.user.create({
      data: {
        name: validatedData.name,
        phone: validatedData.phone,
        location: validatedData.location,
        personalId: validatedData.personalId,
        email: validatedData.email,
        password: hashedPassword,
        code: validatedData.code,
        role: "USER"
      }
    })
   // Clean up verified email record
   await prisma.registrationCode.update({
    where: { id: regCode.id },
    data: { usedAt: new Date() }
  })
  // Optionally remove other unused codes for this email
  await prisma.registrationCode.deleteMany({
    where: { email: validatedData.email, usedAt: null, expiresAt: { lt: new Date() } }
  })
    return NextResponse.json({
      success: true,
      message: "მომხმარებელი წარმატებით შეიქმნა",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    })

  } catch (error) {
    console.error("Signup error:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      )
    }
    // Handle Prisma unique constraint errors (e.g., duplicate email/phone/personalId)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = Array.isArray(error.meta?.target) ? (error.meta?.target as string[]) : [String(error.meta?.target || '')]
      let field = 'ველი'
      if (target.some(t => t.includes('email'))) field = 'ელფოსტა'
      else if (target.some(t => t.includes('phone'))) field = 'ტელეფონის ნომერი'
      else if (target.some(t => t.includes('personalId'))) field = 'პირადობის ნომერი'
      else if (target.some(t => t.includes('code'))) field = 'კოდი'

      return NextResponse.json(
        { success: false, error: `${field} უკვე გამოყენებულია` },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: "შეცდომა მომხმარებლის შექმნისას" },
      { status: 500 }
    )
  }
}
