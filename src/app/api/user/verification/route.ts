import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const verificationSchema = z.object({
  idFrontUrl: z.string().url().optional().nullable(),
  idBackUrl: z.string().url().optional().nullable(),
  entrepreneurCertificateUrl: z.string().url().optional().nullable(),
})

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
    })

    return NextResponse.json({ success: true, verification })
  } catch (error) {
    console.error('Error fetching verification:', error)
    return NextResponse.json(
      { success: false, error: 'შეცდომა ვერიფიკაციის მიღებისას' },
      { status: 500 }
    )
  }
}

// PUT - Create/update current user's verification (resets to PENDING)
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
    const { idFrontUrl, idBackUrl, entrepreneurCertificateUrl } = verificationSchema.parse(body)

    const upserted = await prisma.userVerification.upsert({
      where: { userId: session.user.id },
      update: {
        idFrontUrl: idFrontUrl ?? null,
        idBackUrl: idBackUrl ?? null,
        entrepreneurCertificateUrl: entrepreneurCertificateUrl ?? null,
        status: 'PENDING',
        comment: null,
      },
      create: {
        userId: session.user.id,
        idFrontUrl: idFrontUrl ?? null,
        idBackUrl: idBackUrl ?? null,
        entrepreneurCertificateUrl: entrepreneurCertificateUrl ?? null,
        status: 'PENDING',
      },
    })

    return NextResponse.json({
      success: true,
      message: 'დოკუმენტები ატვირთულია და ელოდება ადმინისტრატორის დამოწმებას',
      verification: upserted,
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


