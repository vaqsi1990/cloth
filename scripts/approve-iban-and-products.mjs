import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const usersWithIban = await prisma.user.updateMany({
  where: { iban: { not: null } },
  data: { verified: true },
})

const verifications = await prisma.userVerification.updateMany({
  where: {
    user: { iban: { not: null } },
  },
  data: {
    identityStatus: 'APPROVED',
    status: 'APPROVED',
    identityComment: null,
    comment: null,
  },
})

const products = await prisma.product.updateMany({
  where: { approvalStatus: 'PENDING' },
  data: {
    approvalStatus: 'APPROVED',
    approvedAt: new Date(),
    rejectionReason: null,
  },
})

console.log(JSON.stringify({
  usersWithIban: usersWithIban.count,
  verifications: verifications.count,
  products: products.count,
}, null, 2))

await prisma.$disconnect()
