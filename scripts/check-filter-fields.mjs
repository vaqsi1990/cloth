import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const products = await prisma.product.findMany({
  where: { approvalStatus: 'APPROVED', status: { notIn: ['MAINTENANCE', 'DAMAGED', 'RESERVED'] } },
  select: { id: true, name: true, size: true, color: true, sizeSystem: true },
  take: 20,
  orderBy: { createdAt: 'desc' },
})

console.log('Sample products size/color:')
for (const p of products) {
  console.log(`#${p.id} size=${JSON.stringify(p.size)} color=${JSON.stringify(p.color)} system=${p.sizeSystem}`)
}

await prisma.$disconnect()
