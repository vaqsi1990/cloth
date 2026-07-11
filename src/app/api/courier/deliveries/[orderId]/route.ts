import { NextRequest, NextResponse } from 'next/server'
import { CourierDeliveryStatus } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireCourierSession } from '@/lib/courier-access'
import {
  courierOrderInclude,
  isCourierOrderEligible,
  mapCourierDelivery,
} from '@/lib/courier-delivery'

const updateSchema = z.object({
  action: z.enum(['claim', 'pickup', 'deliver', 'release']),
  note: z.string().max(1000).optional(),
})
console.log('updateSchema',)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    const access = await requireCourierSession()
    if (!access.ok) {
      return NextResponse.json(
        { success: false, error: access.error },
        { status: access.status },
      )
    }

    const { orderId: orderIdRaw } = await params
    const orderId = parseInt(orderIdRaw, 10)
    if (!Number.isFinite(orderId)) {
      return NextResponse.json(
        { success: false, error: 'არასწორი შეკვეთის ID' },
        { status: 400 },
      )
    }

    const body = updateSchema.parse(await request.json())
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: courierOrderInclude,
    })

    if (!order || !isCourierOrderEligible(order)) {
      return NextResponse.json(
        { success: false, error: 'შეკვეთა ვერ მოიძებნა ან მიტანა არ სჭირდება' },
        { status: 404 },
      )
    }

    if (body.action === 'claim') {
      if (order.courierId && order.courierId !== access.userId) {
        return NextResponse.json(
          { success: false, error: 'ეს მიტანა უკვე მინიჭებულია სხვა კურიერზე' },
          { status: 409 },
        )
      }

      const updated = await prisma.order.update({
        where: { id: orderId },
        data: {
          courierId: access.userId,
          courierStatus: CourierDeliveryStatus.PENDING,
        },
        include: courierOrderInclude,
      })

      return NextResponse.json({
        success: true,
        delivery: mapCourierDelivery(updated, access.userId),
        message: 'მიტანა მიგენიათ',
      })
    }

    if (!order.courierId || order.courierId !== access.userId) {
      return NextResponse.json(
        { success: false, error: 'ჯერ აიღეთ ეს მიტანა' },
        { status: 403 },
      )
    }

    if (body.action === 'release') {
      const updated = await prisma.order.update({
        where: { id: orderId },
        data: {
          courierId: null,
          courierStatus: null,
          courierNote: body.note ?? null,
          courierPickedUpAt: null,
          courierDeliveredAt: null,
        },
        include: courierOrderInclude,
      })

      return NextResponse.json({
        success: true,
        delivery: mapCourierDelivery(updated, access.userId),
        message: 'მიტანა გათავისუფლდა',
      })
    }

    if (body.action === 'pickup') {
      const updated = await prisma.order.update({
        where: { id: orderId },
        data: {
          courierStatus: CourierDeliveryStatus.PICKED_UP,
          courierPickedUpAt: new Date(),
          courierNote: body.note ?? order.courierNote,
        },
        include: courierOrderInclude,
      })

      return NextResponse.json({
        success: true,
        delivery: mapCourierDelivery(updated, access.userId),
        message: 'ნივთი აღებულია',
      })
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        courierStatus: CourierDeliveryStatus.DELIVERED,
        courierDeliveredAt: new Date(),
        courierNote: body.note ?? order.courierNote,
        status: order.status === 'PAID' ? 'SHIPPED' : order.status,
      },
      include: courierOrderInclude,
    })

    return NextResponse.json({
      success: true,
      delivery: mapCourierDelivery(updated, access.userId),
      message: 'მიტანა დასრულდა',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0]?.message ?? 'არასწორი მონაცემები' },
        { status: 400 },
      )
    }

    console.error('Error updating courier delivery:', error)
    return NextResponse.json(
      { success: false, error: 'მიტანის განახლება ვერ მოხერხდა' },
      { status: 500 },
    )
  }
}
