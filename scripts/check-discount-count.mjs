import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const rows = await prisma.$queryRaw`
  SELECT id, name, discount, "discountDays", "discountStartDate"
  FROM "Product"
  WHERE discount IS NOT NULL AND discount > 0
  LIMIT 10
`

console.log('Products with discount field:', rows)

const active = await prisma.$queryRaw`
  SELECT COUNT(*)::int AS count
  FROM "Product" p
  WHERE p.status NOT IN ('MAINTENANCE', 'DAMAGED', 'RESERVED')
    AND p."approvalStatus" = 'APPROVED'
    AND p."userId" IS NOT NULL
    AND p.discount IS NOT NULL AND p.discount > 0 AND (
      p."discountStartDate" IS NULL OR p."discountDays" IS NULL OR
      (p."discountStartDate" + (p."discountDays" || ' days')::interval) > NOW()
    )
`

console.log('Active discounted (SQL):', active[0]?.count)

await prisma.$disconnect()
