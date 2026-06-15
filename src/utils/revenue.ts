import { prisma } from '@/lib/prisma'

/**
 * Calculate total revenue for a user
 * Sum of all sales (from transactions with type SALE) + all rental payments (from transactions with type RENT)
 */
export async function calculateUserRevenue(userId: string): Promise<number> {
  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
    },
    select: {
      total: true,
    },
  })

  return transactions.reduce((sum, transaction) => sum + transaction.total, 0)
}
