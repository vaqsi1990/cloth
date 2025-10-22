// Example usage of Rental Price Tiers API

// 1. Set rental price tiers for a product (Admin only)
// POST /api/products/1/rental-prices
const setPriceTiers = async () => {
  const response = await fetch('/api/products/1/rental-prices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tiers: [
        { minDays: 4, pricePerDay: 20 },   // 4+ days: 20 ლარი დღეში
        { minDays: 7, pricePerDay: 12 },   // 7+ days: 12 ლარი დღეში
        { minDays: 28, pricePerDay: 8 }    // 28+ days: 8 ლარი დღეში
      ]
    })
  })
  
  const data = await response.json()
  console.log('Price tiers set:', data)
}

// 2. Get rental price tiers for a product
// GET /api/products/1/rental-prices
const getPriceTiers = async () => {
  const response = await fetch('/api/products/1/rental-prices')
  const data = await response.json()
  console.log('Price tiers:', data)
}

// 3. Calculate rental price for specific days
// GET /api/products/1/rental-price?days=10
const calculatePrice = async (days) => {
  const response = await fetch(`/api/products/1/rental-price?days=${days}`)
  const data = await response.json()
  console.log(`Price for ${days} days:`, data)
  
  // Example responses:
  // 3 days: Uses 4+ day tier (20 ლარი) = 60 ლარი
  // 10 days: Uses 7+ day tier (12 ლარი) = 120 ლარი  
  // 30 days: Uses 28+ day tier (8 ლარი) = 240 ლარი
}

// 4. Calculate rental price with POST request
// POST /api/products/1/rental-price
const calculatePricePost = async (days) => {
  const response = await fetch('/api/products/1/rental-price', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ days })
  })
  
  const data = await response.json()
  console.log(`Price for ${days} days:`, data)
}

// 5. Delete all price tiers for a product (Admin only)
// DELETE /api/products/1/rental-prices
const deletePriceTiers = async () => {
  const response = await fetch('/api/products/1/rental-prices', {
    method: 'DELETE'
  })
  
  const data = await response.json()
  console.log('Price tiers deleted:', data)
}

// Usage examples:
// setPriceTiers()
// getPriceTiers()
// calculatePrice(5)   // 5 days
// calculatePrice(15) // 15 days
// calculatePrice(30) // 30 days
