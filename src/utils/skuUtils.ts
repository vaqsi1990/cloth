import { prisma } from '@/lib/prisma'

/**
 * Generates a unique SKU code for a product
 * Format: PROD-{timestamp}-{random}
 * 
 * @returns Promise<string> A unique SKU code
 */
export async function generateUniqueSKU(): Promise<string> {
  let sku: string
  let isUnique = false
  let attempts = 0
  const maxAttempts = 10

  while (!isUnique && attempts < maxAttempts) {
    // Generate SKU: PROD-{timestamp}-{random alphanumeric}
    const timestamp = Date.now().toString(36).toUpperCase()
    const random = Math.random().toString(36).substring(2, 8).toUpperCase()
    sku = `PROD-${timestamp}-${random}`

    // Check if SKU already exists
    const existing = await prisma.product.findUnique({
      where: { sku: sku },
      select: { id: true }
    })

    if (!existing) {
      isUnique = true
    } else {
      attempts++
      // Wait a bit before retrying (to ensure different timestamp)
      await new Promise(resolve => setTimeout(resolve, 10))
    }
  }

  if (!isUnique) {
    // Fallback: use more random characters if we still have conflicts
    const fallbackSku = `PROD-${Date.now()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
    return fallbackSku
  }

  return sku!
}

