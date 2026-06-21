import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { RentalInquiryStatus } from '@prisma/client'
import { isAdminOrSupport } from '@/lib/roles'
import {
  buildInquiryChatMessage,
  calcRentalBuyerPayableTotal,
  calcRentalDays,
  expireStaleInquiries,
  inquiryExpiresAt,
  isRentalEndBeforeStart,
  MAX_RENTAL_DAYS_DEFAULT,
  normalizeDateOnly,
} from '@/lib/rental-inquiry'
import { getOrCreateProductChatRoom } from '@/lib/rental-inquiry-chat'
import { sendRentalInquirySellerEmail } from '@/lib/rental-inquiry-email'
import {
  MAX_RENTAL_PERIOD_DAYS,
  validateSelfServeRentalDates,
} from '@/lib/rental-dates'

const createSchema = z.object({
  productId: z.number().int().positive(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  size: z.string().optional(),
  buyerMessage: z.string().optional(),
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
    select: {
      id: true,
      name: true,
      slug: true,
      sku: true,
      location: true,
      images: { select: { url: true }, orderBy: { position: 'asc' as const }, take: 1 },
    },
  },
  buyer: { select: { id: true, name: true, email: true, phone: true } },
  seller: { select: { id: true, name: true, email: true } },
} as const

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'ავტორიზაცია საჭიროა' }, { status: 401 })
    }

    await expireStaleInquiries(prisma)

    const { searchParams } = new URL(request.url)
    const scope = searchParams.get('scope') || 'buyer'
    const status = searchParams.get('status') as RentalInquiryStatus | null

    const where: {
      buyerId?: string
      sellerId?: string
      status?: RentalInquiryStatus
    } = {}

    if (isAdminOrSupport(session.user.role) && scope === 'all') {
      if (status) where.status = status
    } else if (scope === 'seller') {
      where.sellerId = session.user.id
      if (status) where.status = status
    } else {
      where.buyerId = session.user.id
      if (status) where.status = status
    }

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
    const limit = Math.min(
      Math.max(parseInt(searchParams.get('limit') || '50', 10) || 50, 1),
      100,
    )
    const skip = (page - 1) * limit

    const [inquiries, totalCount] = await Promise.all([
      prisma.rentalInquiry.findMany({
        where,
        select: inquirySelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.rentalInquiry.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      inquiries,
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    })
  } catch (error) {
    console.error('GET rental-inquiries:', error)
    return NextResponse.json({ success: false, message: 'შეცდომა' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'ავტორიზაცია საჭიროა' }, { status: 401 })
    }

    const body = await request.json()
    const data = createSchema.parse(body)

    await expireStaleInquiries(prisma)

    const product = await prisma.product.findUnique({
      where: { id: data.productId },
      select: {
        id: true,
        name: true,
        userId: true,
        location: true,
        isRentable: true,
        requiresInquiryBeforeRent: true,
        status: true,
        approvalStatus: true,
        maxRentalDays: true,
        pricePerDay: true,
        discount: true,
        discountDays: true,
        discountStartDate: true,
        rentalPriceTiers: { select: { minDays: true, pricePerDay: true }, orderBy: { minDays: 'asc' } },
      },
    })

    if (!product) {
      return NextResponse.json({ success: false, message: 'პროდუქტი ვერ მოიძებნა' }, { status: 404 })
    }

    if (!product.isRentable) {
      return NextResponse.json({ success: false, message: 'პროდუქტი არ იქირავება' }, { status: 400 })
    }

    if (product.approvalStatus !== 'APPROVED') {
      return NextResponse.json({
        success: false,
        message: 'პროდუქტი ჯერ არ არის დამტკიცებული',
      }, { status: 403 })
    }

    if (!product.userId) {
      return NextResponse.json({ success: false, message: 'ავტორი ვერ მოიძებნა' }, { status: 400 })
    }

    if (session.user.id === product.userId) {
      return NextResponse.json({ success: false, message: 'საკუთარ პროდუქტზე მოთხოვნა ვერ გაიგზავნება' }, { status: 400 })
    }

    if (product.status === 'MAINTENANCE' || product.status === 'DAMAGED') {
      return NextResponse.json({ success: false, message: 'პროდუქტი ამჟამად ხელმისაწვდომი არ არის' }, { status: 400 })
    }

    const start = normalizeDateOnly(data.startDate)
    const end = normalizeDateOnly(data.endDate)

    if (isRentalEndBeforeStart(start, end)) {
      return NextResponse.json({
        success: false,
        message: 'დასრულების თარიღი არ შეიძლება იყოს დაწყების წინ',
      }, { status: 400 })
    }

    if (start < normalizeDateOnly(new Date())) {
      return NextResponse.json({ success: false, message: 'დაწყების თარიღი ვერ იქნება წარსულში' }, { status: 400 })
    }

    const days = calcRentalDays(start, end)

    const calendarCheck = validateSelfServeRentalDates(start, end)
    if (!calendarCheck.ok) {
      return NextResponse.json({
        success: false,
        message: calendarCheck.message,
      }, { status: 400 })
    }

    const maxDays = Math.min(
      product.maxRentalDays || MAX_RENTAL_DAYS_DEFAULT,
      MAX_RENTAL_PERIOD_DAYS,
    )
    if (days > maxDays) {
      return NextResponse.json({
        success: false,
        message: `ქირაობა მაქსიმუმ ${maxDays} დღით შეიძლება`,
      }, { status: 400 })
    }

    const existingPending = await prisma.rentalInquiry.findFirst({
      where: {
        productId: data.productId,
        buyerId: session.user.id,
        status: RentalInquiryStatus.PENDING,
      },
    })

    if (existingPending) {
      return NextResponse.json({
        success: false,
        message: 'თქვენ უკვე გაქვთ მოლოდინში მოთხოვნა ამ პროდუქტზე',
        inquiryId: existingPending.id,
      }, { status: 400 })
    }

    const pricing = calcRentalBuyerPayableTotal(days, {
      rentalPriceTiers: product.rentalPriceTiers,
      pricePerDay: product.pricePerDay,
      discount: product.discount,
      discountDays: product.discountDays,
      discountStartDate: product.discountStartDate,
    })
    const estimatedTotal = pricing.buyerPayable
    const startStr = data.startDate.slice(0, 10)
    const endStr = data.endDate.slice(0, 10)

    const chatMessage = buildInquiryChatMessage({
      productName: product.name,
      startDate: startStr,
      endDate: endStr,
      size: data.size,
      location: product.location,
      estimatedTotal,
      hasDiscount: pricing.hasDiscount,
      buyerMessage: data.buyerMessage,
    })

    const chatRoomId = await getOrCreateProductChatRoom({
      productId: product.id,
      buyerId: session.user.id,
      sellerId: product.userId,
      initialMessage: chatMessage,
    })

    const inquiry = await prisma.rentalInquiry.create({
      data: {
        productId: data.productId,
        buyerId: session.user.id,
        sellerId: product.userId,
        startDate: start,
        endDate: end,
        size: data.size || null,
        estimatedTotal,
        buyerMessage: data.buyerMessage || null,
        chatRoomId,
        expiresAt: inquiryExpiresAt(),
        status: RentalInquiryStatus.PENDING,
      },
      select: inquirySelect,
    })

    void sendRentalInquirySellerEmail({
      inquiryId: inquiry.id,
      productId: inquiry.product.id,
      productName: inquiry.product.name,
      productSku: inquiry.product.sku,
      startDate: inquiry.startDate,
      endDate: inquiry.endDate,
      size: inquiry.size,
      estimatedTotal: pricing.buyerPayable,
      buyerListPrice: pricing.buyerListPrice,
      hasDiscount: pricing.hasDiscount,
      buyerName: inquiry.buyer.name,
      buyerMessage: inquiry.buyerMessage,
      sellerName: inquiry.seller.name,
      sellerEmail: inquiry.seller.email ?? '',
      sellerId: inquiry.sellerId,
    }).catch((error) => {
      console.error('[rental-inquiries] Seller notification email failed:', error)
    })

    return NextResponse.json({
      success: true,
      message: 'მოთხოვნა გაგზავნილია. ავტორი გადაამოწმებს ხელმისაწვდომობას.',
      inquiry,
      chatRoomId,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: 'არასწორი მონაცემები', errors: error.issues }, { status: 400 })
    }
    console.error('POST rental-inquiries:', error)
    return NextResponse.json({ success: false, message: 'შეცდომა' }, { status: 500 })
  }
}
