import { prisma } from '@/lib/prisma'

/**
 * Generates a unique SKU code for a product
 * Format: Only numbers (e.g., 1234567890123456)
 * 
 * @returns Promise<string> A unique SKU code containing only digits
 */
export async function generateUniqueSKU(): Promise<string> {
  let sku: string
  let isUnique = false
  let attempts = 0
  const maxAttempts = 10

  while (!isUnique && attempts < maxAttempts) {
    // Generate SKU: timestamp (13 digits) + random 3 digits = 16 digits total
    const timestamp = Date.now().toString() // 13 digits
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0') // 3 digits
    sku = `${timestamp}${random}`

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
    // Fallback: use timestamp + more random digits if we still have conflicts
    const timestamp = Date.now().toString()
    const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0')
    const fallbackSku = `${timestamp}${random}`
    
    // Double-check fallback is unique
    const existing = await prisma.product.findUnique({
      where: { sku: fallbackSku },
      select: { id: true }
    })
    
    if (existing) {
      // Last resort: add more randomness
      return `${Date.now()}${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`
    }
    
    return fallbackSku
  }

  return sku!
}

