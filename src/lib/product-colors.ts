export type ProductColor = {
  id: string
  label: string
  color: string
}

export const PRODUCT_COLORS: ProductColor[] = [
  { id: "black", label: "შავი", color: "#000000" },
  { id: "white", label: "თეთრი", color: "#FFFFFF" },
  { id: "red", label: "წითელი", color: "#FF0000" },
  { id: "blue", label: "ლურჯი", color: "#0000FF" },
  { id: "green", label: "მწვანე", color: "#008000" },
  { id: "yellow", label: "ყვითელი", color: "#FFFF00" },
  { id: "pink", label: "ვარდისფერი", color: "#FFC0CB" },
  { id: "purple", label: "იისფერი", color: "#800080" },
  { id: "gray", label: "ნაცრისფერი", color: "#808080" },
  { id: "beige", label: "ბეჟი", color: "#8B4513" },
  { id: "cream", label: "კრემისფერი", color: "#FFFDD0" },
  { id: "coffee", label: "ყავისფერი", color: "#6F4E37" },
  { id: "skyblue", label: "ცისფერი", color: "#87CEEB" },
]

export const PRODUCT_FORM_COLORS: ProductColor[] = [
  ...PRODUCT_COLORS,
  { id: "other", label: "სხვა ფერი", color: "#CCCCCC" },
]

/** Maps filter color id to product.color values (Georgian labels and English ids). */
export const PRODUCT_COLOR_FILTER_MAPPING: Record<string, string[]> = {
  black: ["შავი", "black"],
  white: ["თეთრი", "white"],
  red: ["წითელი", "red"],
  blue: ["ლურჯი", "blue"],
  green: ["მწვანე", "green"],
  yellow: ["ყვითელი", "yellow"],
  pink: ["ვარდისფერი", "pink"],
  purple: ["იისფერი", "purple"],
  gray: ["ნაცრისფერი", "gray"],
  beige: ["ბეჟი", "beige"],
  cream: ["კრემისფერი", "cream"],
  coffee: ["ყავისფერი", "coffee"],
  skyblue: ["ცისფერი", "skyblue"],
}

const COLOR_VALUE_TO_FILTER_ID = new Map<string, string>()

for (const color of PRODUCT_COLORS) {
  COLOR_VALUE_TO_FILTER_ID.set(color.id.toLowerCase(), color.id)
  COLOR_VALUE_TO_FILTER_ID.set(color.label.toLowerCase(), color.id)
}

for (const [id, variations] of Object.entries(PRODUCT_COLOR_FILTER_MAPPING)) {
  COLOR_VALUE_TO_FILTER_ID.set(id.toLowerCase(), id)
  for (const variation of variations) {
    COLOR_VALUE_TO_FILTER_ID.set(variation.toLowerCase(), id)
  }
}

/** Map DB product.color (Georgian label, English id, or custom text) → filter color id. */
export function resolveProductColorFilterId(
  color: string | null | undefined,
): string | null {
  const normalized = color?.trim().toLowerCase()
  if (!normalized) return null
  return COLOR_VALUE_TO_FILTER_ID.get(normalized) ?? null
}

/** Predefined swatches + any custom color strings found in the catalog. */
export function collectShopFilterColors(
  products: Array<{ color?: string | null }>,
): ProductColor[] {
  const result: ProductColor[] = [...PRODUCT_COLORS]
  const customSeen = new Set<string>()

  for (const product of products) {
    const raw = product.color?.trim()
    if (!raw) continue
    if (resolveProductColorFilterId(raw)) continue

    const key = raw.toLowerCase()
    if (customSeen.has(key)) continue
    customSeen.add(key)

    result.push({
      id: `custom:${key}`,
      label: raw,
      color: '#CCCCCC',
    })
  }

  return result
}
