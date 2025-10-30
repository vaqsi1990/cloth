import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const signupSchema = z.object({
  name: z.string().min(2, "სახელი უნდა იყოს მინიმუმ 2 სიმბოლო"),
  phone: z.string().min(6, "ტელეფონის ნომერი საჭიროა"),
  location: z.string().min(2, "ადგილმდებარეობა აუცილებელია"),
  personalId: z.string().min(6, "პირადობის ნომერი აუცილებელია"),
  email: z.string().email("არასწორი ელფოსტა"),
  password: z.string().min(6, "პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო"),
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
        role: "USER"
      }
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

    return NextResponse.json(
      { success: false, error: "შეცდომა მომხმარებლის შექმნისას" },
      { status: 500 }
    )
  }
}
