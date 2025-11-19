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
 * @param threshold - Revenue threshold in GEL (default: 2)
 * @returns true if user should be blocked, false otherwise
 */
export async function shouldBlockUser(userId: string, threshold: number = 2): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      verified: true, // პირადობის ვერიფიკაცია
      blocked: true, // ინდმეწარმის საბუთის ვერიფიკაცია
      _count: {
        select: { products: true },
      },
    },
  })

  if (!user) {
    return false
  }

  // თუ ინდმეწარმის საბუთი უკვე დამტკიცებულია (blocked=false), არ უნდა დაბლოკოს
  // ან თუ პირადობა დამტკიცებულია (verified=true), არ უნდა დაბლოკოს
  if (!user.blocked || user.verified) {
    return false
  }

  const hasProducts = (user._count?.products ?? 0) > 0

  if (!hasProducts) {
    return false
  }

  // Calculate revenue
  const revenue = await calculateUserRevenue(userId)

  // Block if revenue >= threshold and entrepreneur certificate not verified
  return revenue >= threshold
}

/**
 * Block user if revenue threshold is met and entrepreneur certificate is not verified
 * @param userId - The user ID to check and potentially block
 * @param threshold - Revenue threshold in GEL (default: 2)
 * @returns true if user was blocked, false otherwise
 */
export async function checkAndBlockUser(userId: string, threshold: number = 2): Promise<boolean> {
  const shouldBlock = await shouldBlockUser(userId, threshold)

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { blocked: shouldBlock },
    })
  } catch (error) {
    console.error('Failed to update user block status', { userId, error })
  }

  return shouldBlock
}

export async function reevaluateUserBlocking(userId: string, threshold: number = 2): Promise<void> {
  const shouldBlock = await shouldBlockUser(userId, threshold)
  await prisma.user.update({
    where: { id: userId },
    data: { blocked: shouldBlock },
  })
}

