import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { saveUserIbanVerification } from '@/lib/user-iban-verification'

const verificationSchema = z.object({
  entrepreneurCertificateUrl: z.string().url().optional().nullable(),
  iban: z.string().optional().nullable(),
})

const verificationSelect = {
  id: true,
  userId: true,
  idFrontUrl: true,
  idBackUrl: true,
  entrepreneurCertificateUrl: true,
  identityStatus: true,
  entrepreneurStatus: true,
  identityComment: true,
  entrepreneurComment: true,
  status: true,
  comment: true,
  createdAt: true,
  updatedAt: true,
} as const

// GET - Get current user's verification
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const verification = await prisma.userVerification.findUnique({
      where: { userId: session.user.id },
      select: verificationSelect,
    })

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { iban: true }
    })

    return NextResponse.json({ 
      success: true, 
      verification: verification ? {
        ...verification,
        userIban: user?.iban || null
      } : { userIban: user?.iban || null }
    })
  } catch (error) {
    console.error('Error fetching verification:', error)
    return NextResponse.json(
      { success: false, error: 'შეცდომა ვერიფიკაციის მიღებისას' },
      { status: 500 }
    )
  }
}

// PUT - Save IBAN verification or entrepreneur certificate
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { entrepreneurCertificateUrl, iban } = verificationSchema.parse(body)

    if (!iban && !entrepreneurCertificateUrl) {
      return NextResponse.json(
        { success: false, error: 'IBAN ან ინდმეწარმის საბუთი საჭიროა' },
        { status: 400 }
      )
    }

    if (iban) {
      try {
        await saveUserIbanVerification(session.user.id, iban)
      } catch (error) {
        return NextResponse.json(
          { success: false, error: 'IBAN არასწორია' },
          { status: 400 }
        )
      }
    }

    if (entrepreneurCertificateUrl) {
      await prisma.userVerification.upsert({
        where: { userId: session.user.id },
        update: {
          entrepreneurCertificateUrl,
          entrepreneurStatus: 'PENDING',
          entrepreneurComment: null,
        },
        create: {
          userId: session.user.id,
          entrepreneurCertificateUrl,
          entrepreneurStatus: 'PENDING',
          identityStatus: iban ? 'APPROVED' : 'PENDING',
          status: iban ? 'APPROVED' : 'PENDING',
        },
      })
    }

    const upserted = await prisma.userVerification.findUnique({
      where: { userId: session.user.id },
      select: verificationSelect,
    })

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { iban: true }
    })

    return NextResponse.json({
      success: true,
      message: iban
        ? 'IBAN წარმატებით შეინახა'
        : 'ინდმეწარმის საბუთი ატვირთულია და ელოდება ადმინისტრატორის დამოწმებას',
      verification: {
        ...upserted,
        userIban: user?.iban || null
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('Error updating verification:', error)
    return NextResponse.json(
      { success: false, error: 'შეცდომა ვერიფიკაციის განახლებისას' },
      { status: 500 }
    )
  }
}
