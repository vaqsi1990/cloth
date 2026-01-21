import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const cookieConsentSchema = z.object({
  essential: z.boolean(),
  performance: z.boolean(),
  functional: z.boolean(),
  targeting: z.boolean(),
  analytics: z.boolean(),
})

// POST - Save cookie consent
export async function POST(request: NextRequest) {
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
    const { essential, performance, functional, targeting, analytics } = cookieConsentSchema.parse(body)

    // Update user cookie consent preferences
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        cookieConsentEssential: essential,
        cookieConsentPerformance: performance,
        cookieConsentFunctional: functional,
        cookieConsentTargeting: targeting,
        cookieConsentAnalytics: analytics,
        cookieConsentTimestamp: new Date(),
      },
      select: {
        id: true,
        cookieConsentEssential: true,
        cookieConsentPerformance: true,
        cookieConsentFunctional: true,
        cookieConsentTargeting: true,
        cookieConsentAnalytics: true,
        cookieConsentTimestamp: true,
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Cookie პარამეტრები წარმატებით შენახულია',
      consent: {
        essential: updatedUser.cookieConsentEssential,
        performance: updatedUser.cookieConsentPerformance,
        functional: updatedUser.cookieConsentFunctional,
        targeting: updatedUser.cookieConsentTargeting,
        analytics: updatedUser.cookieConsentAnalytics,
        timestamp: updatedUser.cookieConsentTimestamp?.getTime() || Date.now(),
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('Error saving cookie consent:', error)
    return NextResponse.json(
      { success: false, error: 'შეცდომა cookie პარამეტრების შენახვისას' },
      { status: 500 }
    )
  }
}

// GET - Get cookie consent
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

    // Get user cookie consent preferences
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        cookieConsentEssential: true,
        cookieConsentPerformance: true,
        cookieConsentFunctional: true,
        cookieConsentTargeting: true,
        cookieConsentAnalytics: true,
        cookieConsentTimestamp: true,
      }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'მომხმარებელი ვერ მოიძებნა' },
        { status: 404 }
      )
    }

    // Check if user has given consent
    const hasConsent = user.cookieConsentTimestamp !== null

    return NextResponse.json({
      success: true,
      consent: hasConsent ? {
        essential: user.cookieConsentEssential,
        performance: user.cookieConsentPerformance,
        functional: user.cookieConsentFunctional,
        targeting: user.cookieConsentTargeting,
        analytics: user.cookieConsentAnalytics,
        timestamp: user.cookieConsentTimestamp?.getTime() || Date.now(),
      } : null
    })

  } catch (error) {
    console.error('Error fetching cookie consent:', error)
    return NextResponse.json(
      { success: false, error: 'შეცდომა cookie პარამეტრების მიღებისას' },
      { status: 500 }
    )
  }
}

// DELETE - Clear cookie consent (do not record rejection)
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        cookieConsentEssential: false,
        cookieConsentPerformance: false,
        cookieConsentFunctional: false,
        cookieConsentTargeting: false,
        cookieConsentAnalytics: false,
        cookieConsentTimestamp: null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error clearing cookie consent:', error)
    return NextResponse.json(
      { success: false, error: 'შეცდომა cookie პარამეტრების გასუფთავებისას' },
      { status: 500 }
    )
  }
}
