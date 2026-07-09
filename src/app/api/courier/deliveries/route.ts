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

export async function GET(request: NextRequest) {
  try {
    const access = await requireCourierSession()
    if (!access.ok) {
      return NextResponse.json(
        { success: false, error: access.error },
        { status: access.status },
      )
    }

    const { searchParams } = new URL(request.url)
    const scope = searchParams.get('scope') ?? 'active'

    const orders = await prisma.order.findMany({
      where:
        scope === 'completed'
          ? {
              status: { in: ['PAID', 'SHIPPED'] },
              OR: [{ deliveryCityId: { not: null } }, { deliveryPrice: { gt: 0 } }],
              courierStatus: CourierDeliveryStatus.DELIVERED,
              courierId: access.userId,
            }
          : {
              status: { in: ['PAID', 'SHIPPED'] },
              OR: [{ deliveryCityId: { not: null } }, { deliveryPrice: { gt: 0 } }],
              NOT: { courierStatus: CourierDeliveryStatus.DELIVERED },
              AND: [
                {
                  OR: [{ courierId: null }, { courierId: access.userId }],
                },
              ],
            },
      include: courierOrderInclude,
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    const deliveries = orders
      .filter(isCourierOrderEligible)
      .map((order) => mapCourierDelivery(order, access.userId))

    return NextResponse.json({
      success: true,
      deliveries,
    })
  } catch (error) {
    console.error('Error fetching courier deliveries:', error)
    return NextResponse.json(
      { success: false, error: 'მიტანების ჩატვირთვა ვერ მოხერხდა' },
      { status: 500 },
    )
  }
}
