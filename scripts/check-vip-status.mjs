import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const products = await prisma.product.findMany({
  where: { OR: [{ isVip: true }, { vipExpiresAt: { not: null } }] },
  select: { id: true, name: true, isVip: true, vipExpiresAt: true, approvalStatus: true },
})

const payments = await prisma.productVipPayment.findMany({
  orderBy: { createdAt: 'desc' },
  take: 5,
})

const product84 = await prisma.product.findUnique({
  where: { id: 84 },
  select: { id: true, name: true, isVip: true, vipExpiresAt: true, approvalStatus: true },
})

console.log('VIP products:', JSON.stringify(products, null, 2))
console.log('Payments:', JSON.stringify(payments, null, 2))
console.log('Product 84:', JSON.stringify(product84, null, 2))

await prisma.$disconnect()
