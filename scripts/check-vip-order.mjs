const res = await fetch('http://localhost:3000/api/products?page=1&limit=16')
const data = await res.json()
if (!data.success) {
  console.error('API failed', data)
  process.exit(1)
}
console.log('First page order:')
data.products.forEach((p, i) => {
  const vipActive = p.isVip && p.vipExpiresAt && new Date(p.vipExpiresAt) > new Date()
  console.log(`${i + 1}. id=${p.id} name=${p.name} vip=${vipActive}`)
})
const firstVipIndex = data.products.findIndex(
  (p) => p.isVip && p.vipExpiresAt && new Date(p.vipExpiresAt) > new Date(),
)
console.log('First VIP index (0-based):', firstVipIndex)
