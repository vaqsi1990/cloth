export function productMatchesPanelSearch(
  product: {
    id: number
    name: string
    description?: string | null
    sku?: string | null
  },
  searchTerm: string,
): boolean {
  const query = searchTerm.trim().toLowerCase()
  if (!query) return true

  return (
    product.name.toLowerCase().includes(query) ||
    product.description?.toLowerCase().includes(query) ||
    product.sku?.toLowerCase().includes(query) ||
    String(product.id).includes(query)
  )
}
