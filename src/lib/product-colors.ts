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
  { id: "gray", label: "ნაცრისფერი", color: "#A52A2A" },
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
