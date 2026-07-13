import { prisma } from '@/lib/prisma'

/** Admin/support list: PENDING first, then APPROVED, then REJECTED (newest within each group). */
export async function fetchProductIdsByApprovalPriority(
  take: number,
  offset: number,
): Promise<number[]> {
  const rows = await prisma.$queryRaw<{ id: number }[]>`
    SELECT id
    FROM "Product"
    WHERE "deletedAt" IS NULL
    ORDER BY
      CASE "approvalStatus"::text
        WHEN 'PENDING' THEN 0
        WHEN 'APPROVED' THEN 1
        WHEN 'REJECTED' THEN 2
        ELSE 3
      END ASC,
      "createdAt" DESC,
      id DESC
    LIMIT ${take}
    OFFSET ${offset}
  `

  return rows.map((row) => row.id)
}
