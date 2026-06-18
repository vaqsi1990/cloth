import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { RentalInquiryStatus } from '@prisma/client'
import { isAdminOrSupport } from '@/lib/roles'
import { expireStaleInquiries } from '@/lib/rental-inquiry'
import { applyRentalInquirySellerResponse } from '@/lib/rental-inquiry-status'

const patchSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'CANCELLED']),
  onSiteAvailable: z.boolean().optional(),
  sellerNote: z.string().optional(),
})

const inquirySelect = {
  id: true,
  productId: true,
  buyerId: true,
  sellerId: true,
  startDate: true,
  endDate: true,
  size: true,
  estimatedTotal: true,
  status: true,
  onSiteAvailable: true,
  buyerMessage: true,
  sellerNote: true,
  chatRoomId: true,
  expiresAt: true,
  approvedAt: true,
  rejectedAt: true,
  createdAt: true,
  product: {
    select: { id: true, name: true, slug: true, sku: true, location: true },
  },
  buyer: { select: { id: true, name: true, email: true, phone: true } },
  seller: { select: { id: true, name: true, email: true } },
} as const

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'ავტორიზაცია საჭიროა' }, { status: 401 })
    }

    const { id } = await params
    const inquiryId = parseInt(id, 10)
    if (isNaN(inquiryId)) {
      return NextResponse.json({ success: false, message: 'არასწორი ID' }, { status: 400 })
    }

    await expireStaleInquiries(prisma)

    const inquiry = await prisma.rentalInquiry.findUnique({
      where: { id: inquiryId },
      select: inquirySelect,
    })

    if (!inquiry) {
      return NextResponse.json({ success: false, message: 'მოთხოვნა ვერ მოიძებნა' }, { status: 404 })
    }

    const canView =
      inquiry.buyerId === session.user.id ||
      inquiry.sellerId === session.user.id ||
      isAdminOrSupport(session.user.role)

    if (!canView) {
      return NextResponse.json({ success: false, message: 'წვდომა აკრძალულია' }, { status: 403 })
    }

    return NextResponse.json({ success: true, inquiry })
  } catch (error) {
    console.error('GET rental-inquiry:', error)
    return NextResponse.json({ success: false, message: 'შეცდომა' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'ავტორიზაცია საჭიროა' }, { status: 401 })
    }

    const { id } = await params
    const inquiryId = parseInt(id, 10)
    if (isNaN(inquiryId)) {
      return NextResponse.json({ success: false, message: 'არასწორი ID' }, { status: 400 })
    }

    const body = await request.json()
    const data = patchSchema.parse(body)

    await expireStaleInquiries(prisma)

    const inquiry = await prisma.rentalInquiry.findUnique({
      where: { id: inquiryId },
    })

    if (!inquiry) {
      return NextResponse.json({ success: false, message: 'მოთხოვნა ვერ მოიძებნა' }, { status: 404 })
    }

    const isBuyer = inquiry.buyerId === session.user.id
    const isSeller = inquiry.sellerId === session.user.id
    const isStaff = isAdminOrSupport(session.user.role)

    if (data.status === 'CANCELLED') {
      if (!isBuyer && !isStaff) {
        return NextResponse.json({ success: false, message: 'წვდომა აკრძალულია' }, { status: 403 })
      }
      if (inquiry.status !== RentalInquiryStatus.PENDING && inquiry.status !== RentalInquiryStatus.APPROVED) {
        return NextResponse.json({ success: false, message: 'მოთხოვნა ვერ გაუქმდება' }, { status: 400 })
      }
    } else {
      if (!isSeller && !isStaff) {
        return NextResponse.json({ success: false, message: 'მხოლოდ ავტორს შეუძლია პასუხის გაცემა' }, { status: 403 })
      }
      if (inquiry.status !== RentalInquiryStatus.PENDING) {
        return NextResponse.json({ success: false, message: 'მოთხოვნა უკვე დამუშავებულია' }, { status: 400 })
      }
    }

    if (data.status === 'APPROVED' && data.onSiteAvailable !== true) {
      return NextResponse.json({
        success: false,
        message: 'დასადასტურებლად მიუთითეთ რომ პროდუქტი ადგილზე ხელმისაწვდომია',
      }, { status: 400 })
    }

    const sellerStatus =
      data.status === 'APPROVED' ? 'APPROVED' : data.status === 'REJECTED' ? 'REJECTED' : null

    if (sellerStatus) {
      const result = await applyRentalInquirySellerResponse(
        prisma,
        inquiryId,
        inquiry.sellerId,
        sellerStatus,
        { sellerNote: data.sellerNote },
      )

      if (!result.ok) {
        const message =
          result.code === 'NOT_FOUND'
            ? 'მოთხოვნა ვერ მოიძებნა'
            : result.code === 'ALREADY_PROCESSED'
              ? 'მოთხოვნა უკვე დამუშავებულია'
              : 'წვდომა აკრძალულია'
        return NextResponse.json({ success: false, message }, { status: 400 })
      }

      const updated = await prisma.rentalInquiry.findUnique({
        where: { id: inquiryId },
        select: inquirySelect,
      })

      return NextResponse.json({
        success: true,
        message:
          sellerStatus === 'APPROVED'
            ? 'მოთხოვნა დადასტურდა'
            : 'მოთხოვნა უარყოფილია',
        inquiry: updated,
      })
    }

    const updated = await prisma.rentalInquiry.update({
      where: { id: inquiryId },
      data: {
        status: RentalInquiryStatus.CANCELLED,
        sellerNote: data.sellerNote || null,
      },
      select: inquirySelect,
    })

    if (inquiry.chatRoomId) {
      await prisma.chatMessage.create({
        data: {
          chatRoomId: inquiry.chatRoomId,
          content: 'მოთხოვნა გაუქმებულია.',
          adminId: inquiry.sellerId,
          isFromAdmin: true,
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: 'მოთხოვნა გაუქმდა',
      inquiry: updated,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: 'არასწორი მონაცემები' }, { status: 400 })
    }
    console.error('PATCH rental-inquiry:', error)
    return NextResponse.json({ success: false, message: 'შეცდომა' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'ავტორიზაცია საჭიროა' }, { status: 401 })
    }

    const { id } = await params
    const inquiryId = parseInt(id, 10)
    if (isNaN(inquiryId)) {
      return NextResponse.json({ success: false, message: 'არასწორი ID' }, { status: 400 })
    }

    const inquiry = await prisma.rentalInquiry.findUnique({
      where: { id: inquiryId },
      select: { id: true, buyerId: true, sellerId: true },
    })

    if (!inquiry) {
      return NextResponse.json({ success: false, message: 'მოთხოვნა ვერ მოიძებნა' }, { status: 404 })
    }

    const isBuyer = inquiry.buyerId === session.user.id
    const isSeller = inquiry.sellerId === session.user.id
    const isStaff = isAdminOrSupport(session.user.role)

    if (!isBuyer && !isSeller && !isStaff) {
      return NextResponse.json({ success: false, message: 'წვდომა აკრძალულია' }, { status: 403 })
    }

    await prisma.rentalInquiry.delete({
      where: { id: inquiryId },
    })

    return NextResponse.json({
      success: true,
      message: 'მოთხოვნა წაიშალა',
    })
  } catch (error) {
    console.error('DELETE rental-inquiry:', error)
    return NextResponse.json({ success: false, message: 'შეცდომა' }, { status: 500 })
  }
}
