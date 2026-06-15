import { prisma } from '@/lib/prisma'

const APPROVAL_SORT_PRIORITY: Record<string, number> = {
  PENDING: 0,
  APPROVED: 1,
  REJECTED: 2,
}

export type ApprovalSortableProduct = {
  id: number
  approvalStatus?: string | null
  createdAt: Date | string
}

export function sortProductsByApprovalPriority<T extends ApprovalSortableProduct>(
  products: T[],
): T[] {
  return [...products].sort((a, b) => {
    const aPriority = APPROVAL_SORT_PRIORITY[a.approvalStatus ?? 'APPROVED'] ?? 1
    const bPriority = APPROVAL_SORT_PRIORITY[b.approvalStatus ?? 'APPROVED'] ?? 1
    if (aPriority !== bPriority) return aPriority - bPriority

    const aTime = new Date(a.createdAt).getTime()
    const bTime = new Date(b.createdAt).getTime()
    if (aTime !== bTime) return bTime - aTime

    return b.id - a.id
  })
}

/** Admin/support list: PENDING first, then APPROVED, then REJECTED (newest within each group). */
export async function fetchProductIdsByApprovalPriority(
  take: number,
  offset: number,
): Promise<number[]> {
  const rows = await prisma.$queryRaw<{ id: number }[]>`
    SELECT id
    FROM "Product"
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

export function orderProductsByIdList<T extends { id: number }>(
  products: T[],
  ids: number[],
): T[] {
  const order = new Map(ids.map((id, index) => [id, index]))
  return [...products].sort(
    (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
  )
}
