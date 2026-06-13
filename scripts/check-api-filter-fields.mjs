const res = await fetch('http://localhost:3000/api/products?page=1&limit=16')
const data = await res.json()
for (const p of data.products || []) {
  console.log(`#${p.id} size=${JSON.stringify(p.size)} color=${JSON.stringify(p.color)}`)
}
