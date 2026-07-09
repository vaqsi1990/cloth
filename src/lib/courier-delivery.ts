import type {
  CourierDeliveryStatus,
  Order,
  OrderItem,
  Product,
  User,
  DeliveryCity,
} from '@prisma/client'
import { Prisma } from '@prisma/client'

type OrderItemWithProduct = OrderItem & {
  product: (Product & {
    user: Pick<User, 'id' | 'name' | 'phone' | 'pickupAddress' | 'address' | 'location'> | null
  }) | null
}

export type CourierOrderRecord = Order & {
  deliveryCity: DeliveryCity | null
  items: OrderItemWithProduct[]
}

export function orderNeedsCourierDelivery(order: Pick<Order, 'deliveryCityId' | 'deliveryPrice'>) {
  return Boolean(order.deliveryCityId) || (order.deliveryPrice ?? 0) > 0
}

export function isCourierOrderEligible(
  order: Pick<Order, 'status' | 'deliveryCityId' | 'deliveryPrice'>,
) {
  if (!orderNeedsCourierDelivery(order)) return false
  return order.status === 'PAID' || order.status === 'SHIPPED'
}

export function resolvePickupAddress(
  product: Pick<Product, 'pickupAddress' | 'location' | 'allowsPickup'> | null | undefined,
  seller: Pick<User, 'pickupAddress' | 'address' | 'location'> | null | undefined,
): string {
  if (product?.pickupAddress?.trim()) return product.pickupAddress.trim()
  if (product?.allowsPickup && seller?.pickupAddress?.trim()) {
    return seller.pickupAddress.trim()
  }
  if (seller?.address?.trim()) return seller.address.trim()
  if (product?.location?.trim()) return product.location.trim()
  if (seller?.location?.trim()) return seller.location.trim()
  return 'მისამართი არ არის მითითებული'
}

export function resolveDeliveryAddress(
  order: Pick<Order, 'address' | 'city' | 'note'> & {
    deliveryCity?: Pick<DeliveryCity, 'name'> | null
  },
): string {
  const parts = [
    order.address?.trim(),
    order.city?.trim(),
    order.deliveryCity?.name?.trim(),
  ].filter(Boolean)

  return parts.join(', ') || 'მისამართი არ არის მითითებული'
}

export function mapCourierDelivery(order: CourierOrderRecord, courierUserId: string) {
  const saleItems = order.items.filter((item) => item.isRental !== true)
  const pickups = saleItems.map((item) => {
    const seller = item.product?.user ?? null
    return {
      itemId: item.id,
      productId: item.productId,
      productName: item.productName,
      image: item.image,
      quantity: item.quantity,
      sellerName: seller?.name ?? 'გამყიდველი',
      sellerPhone: seller?.phone ?? null,
      pickupAddress: resolvePickupAddress(item.product, seller),
    }
  })

  return {
    orderId: order.id,
    orderStatus: order.status,
    courierStatus: order.courierStatus,
    courierId: order.courierId,
    assignedToMe: order.courierId === courierUserId,
    isUnassigned: !order.courierId,
    createdAt: order.createdAt,
    total: order.total,
    customer: {
      name: order.customerName,
      phone: order.phone,
      email: order.email,
    },
    delivery: {
      address: resolveDeliveryAddress(order),
      note: order.note,
    },
    pickups,
    courierNote: order.courierNote,
    courierPickedUpAt: order.courierPickedUpAt,
    courierDeliveredAt: order.courierDeliveredAt,
  }
}

export const courierOrderInclude = {
  deliveryCity: true,
  items: {
    where: {
      isRental: { not: true },
      sellerCanceledItem: false,
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          pickupAddress: true,
          location: true,
          allowsPickup: true,
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
              pickupAddress: true,
              address: true,
              location: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.OrderInclude

export function getCourierStatusLabel(status: CourierDeliveryStatus | null | undefined) {
  switch (status) {
    case 'PICKED_UP':
      return 'აღებულია'
    case 'DELIVERED':
      return 'მიტანილია'
    case 'PENDING':
    default:
      return 'მოლოდინში'
  }
}
