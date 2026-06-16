import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { datesMatch, expireStaleInquiries, normalizeDateOnly } from '@/lib/rental-inquiry'
import { resolveInquiryForDisplay } from '@/lib/rental-inquiry-guard'
import { recoverStaleUnpaidRentalState } from '@/lib/rental-order-holds'

type ProductInquiryConfig = {
  isRentable: boolean
  requiresInquiryBeforeRent: boolean
}

type InquiryRow = {
  id: number
  status: string
  onSiteAvailable: boolean | null
  expiresAt: Date
  startDate: Date
  endDate: Date
  chatRoomId: number | null
}

const ACTIVE_INQUIRY_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'BOOKED'] as const

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: true, inquiry: null })
    }

    const { id } = await params
    const productId = parseInt(id, 10)
    if (isNaN(productId)) {
      return NextResponse.json({ success: false, message: 'არასწორი ID' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    await expireStaleInquiries(prisma)
    await recoverStaleUnpaidRentalState({
      buyerId: session.user.id,
      productId,
    })

    const productRows = await prisma.$queryRaw<ProductInquiryConfig[]>`
      SELECT "isRentable", "requiresInquiryBeforeRent"
      FROM "Product"
      WHERE id = ${productId}
      LIMIT 1
    `
    const product = productRows[0] ?? null

    if (!product) {
      return NextResponse.json({ success: false, message: 'პროდუქტი ვერ მოიძებნა' }, { status: 404 })
    }

    const inquiries = (await prisma.rentalInquiry.findMany({
      where: {
        productId,
        buyerId: session.user.id,
        status: { in: [...ACTIVE_INQUIRY_STATUSES] },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        status: true,
        onSiteAvailable: true,
        expiresAt: true,
        startDate: true,
        endDate: true,
        chatRoomId: true,
      },
    })) as InquiryRow[]

    let matched: InquiryRow | null = null

    if (startDate && endDate) {
      const start = normalizeDateOnly(startDate)
      const end = normalizeDateOnly(endDate)
      const found = inquiries.find((i: InquiryRow) =>
        datesMatch(i.startDate, i.endDate, start, end),
      )
      matched = found ?? null
    } else {
      matched =
        inquiries.find((i) => i.status === 'APPROVED') ??
        inquiries.find((i) => i.status === 'BOOKED') ??
        inquiries.find((i) => i.status === 'PENDING') ??
        inquiries[0] ??
        null
    }

    if (matched && (matched.status === 'APPROVED' || matched.status === 'BOOKED')) {
      const fullInquiry = await prisma.rentalInquiry.findUnique({
        where: { id: matched.id },
      })
      if (fullInquiry) {
        const resolved = await resolveInquiryForDisplay(fullInquiry, session.user.id)
        matched = {
          ...matched,
          status: resolved.status,
        }
      }
    }

    return NextResponse.json({
      success: true,
      requiresInquiry: product.isRentable && product.requiresInquiryBeforeRent,
      inquiry: matched
        ? {
            id: matched.id,
            status: matched.status,
            onSiteAvailable: matched.onSiteAvailable,
            expiresAt: matched.expiresAt,
            startDate: matched.startDate,
            endDate: matched.endDate,
            chatRoomId: matched.chatRoomId,
          }
        : null,
      canBook: matched?.status === 'APPROVED' && matched.onSiteAvailable === true,
    })
  } catch (error) {
    console.error('GET product rental-inquiry:', error)
    return NextResponse.json({ success: false, message: 'შეცდომა' }, { status: 500 })
  }
}
