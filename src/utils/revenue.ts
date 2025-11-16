import { prisma } from '@/lib/prisma'

/**
 * Calculate total revenue for a user
 * Sum of all sales (from transactions with type SALE) + all rental payments (from transactions with type RENT)
 * @param userId - The user ID to calculate revenue for
 * @returns Total revenue in GEL (₾)
 */
export async function calculateUserRevenue(userId: string): Promise<number> {
  const transactions = await prisma.transaction.findMany({
    where: {
      userId: userId,
    },
    select: {
      total: true,
      type: true,
    },
  })

  // Sum all transaction totals (both SALE and RENT)
  const totalRevenue = transactions.reduce((sum, transaction) => {
    return sum + transaction.total
  }, 0)

  return totalRevenue
}

/**
 * Check if user should be blocked based on revenue threshold
 * @param userId - The user ID to check
 * @param threshold - Revenue threshold in GEL (default: 100)
 * @returns true if user should be blocked, false otherwise
 */
export async function shouldBlockUser(userId: string, threshold: number = 100): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      verified: true,
      blocked: true,
    },
  })

  if (!user) {
    return false
  }

  // If already verified, don't block
  if (user.verified) {
    return false
  }

  // If already blocked, keep blocked
  if (user.blocked) {
    return true
  }

  // Calculate revenue
  const revenue = await calculateUserRevenue(userId)

  // Block if revenue >= threshold and not verified
  return revenue >= threshold
}

/**
 * Block user if revenue threshold is met and user is not verified
 * @param userId - The user ID to check and potentially block
 * @param threshold - Revenue threshold in GEL (default: 100)
 * @returns true if user was blocked, false otherwise
 */
export async function checkAndBlockUser(userId: string, threshold: number = 100): Promise<boolean> {
  const shouldBlock = await shouldBlockUser(userId, threshold)

  if (shouldBlock) {
    await prisma.user.update({
      where: { id: userId },
      data: { blocked: true },
    })
    return true
  }

  return false
}

