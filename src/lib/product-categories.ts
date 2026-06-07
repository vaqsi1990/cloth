export type ProductCategory = {
  id: number
  name: string
  slug: string
}

/** Primary DB categories (ids 1–23) — must match production Category table */
export const DEFAULT_PRODUCT_CATEGORIES: ProductCategory[] = [
  { id: 1, name: 'კაბები', slug: 'dresses' },
  { id: 2, name: 'ბლუზები', slug: 'tops' },
  { id: 3, name: 'შარვლები', slug: 'pants' },
  { id: 4, name: 'ქვედაბოლოები', slug: 'skirts' },
  { id: 5, name: 'ზედა ტანსაცმელი', slug: 'outerwear' },
  { id: 6, name: 'პალტოები და მოსასხამი', slug: 'coats' },
  { id: 7, name: 'საქორწინო კაბები', slug: 'wedding-dresses' },
  { id: 8, name: 'საღამოს ტანსაცმელი', slug: 'evening-wear' },
  { id: 9, name: 'სათხილამურო ქურთუკი', slug: 'ski-jacket' },
  { id: 10, name: 'თერმო ტანსაცმელი', slug: 'thermal-wear' },
  { id: 11, name: 'სათვალე', slug: 'goggles' },
  { id: 12, name: 'ჩაფხუტი', slug: 'helmet' },
  { id: 13, name: 'ტრადიციული ტანსაცმელი', slug: 'traditional' },
  { id: 14, name: 'ქოსფლეის კოსტუმები', slug: 'cosplay' },
  { id: 15, name: 'შარვალ კოსტუმი', slug: 'suit' },
  { id: 16, name: 'პიჯაკი', slug: 'blazer' },
  { id: 17, name: 'აქსესუარები', slug: 'accessories' },
  { id: 18, name: 'ბავშვთა კაბები', slug: 'kids-dresses' },
  { id: 19, name: 'ბავშვთა ტრადიციული ტანსაცმელი', slug: 'kids-traditional' },
  { id: 20, name: 'ბავშვთა სათხილამურო ტანსაცმელი', slug: 'kids-ski' },
  { id: 21, name: 'ყოველდღიური ტანსაცმელი', slug: 'everyday' },
  { id: 22, name: 'სპორტული ტანსაცმელი', slug: 'sportwear' },
  { id: 23, name: 'სადღესასწაულო ტანსაცმელი', slug: 'festive' },
  { id: 47, name: 'ბავშვების კალიასკა', slug: 'bavshvebis-kaliaska' },
  { id: 48, name: 'ბავშვების სათამაშოები', slug: 'bavshvebis-satamashoebi' },
]

const WOMEN_CATEGORY_IDS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 13, 14, 21, 22, 23])
const MEN_CATEGORY_IDS = new Set([15, 16])
const CHILDREN_CATEGORY_IDS = new Set([18, 19, 20, 47, 48])
const ACCESSORY_CATEGORY_IDS = new Set([11, 12, 17])
const ACCESSORY_CATEGORY_SLUGS = new Set(['accessories', 'goggles', 'helmet', 'aksesuarebi'])
const SIZE_OPTIONAL_CATEGORY_IDS = new Set([...ACCESSORY_CATEGORY_IDS, 47, 48])
const SIZE_OPTIONAL_CATEGORY_SLUGS = new Set([
  ...ACCESSORY_CATEGORY_SLUGS,
  'bavshvebis-kaliaska',
  'bavshvebis-satamashoebi',
])

export function isAccessoryCategory(category: ProductCategory | undefined | null): boolean {
  if (!category) return false
  if (ACCESSORY_CATEGORY_IDS.has(category.id)) return true
  if (ACCESSORY_CATEGORY_SLUGS.has(category.slug)) return true
  return category.name.toLowerCase().includes('აქსესუარ')
}

export function isAccessoryCategoryId(
  categoryId: number | undefined,
  categories: ProductCategory[],
): boolean {
  if (!categoryId) return false
  return isAccessoryCategory(categories.find((c) => c.id === categoryId))
}

export function isSizeOptionalCategory(category: ProductCategory | undefined | null): boolean {
  if (!category) return false
  if (isAccessoryCategory(category)) return true
  if (SIZE_OPTIONAL_CATEGORY_IDS.has(category.id)) return true
  if (SIZE_OPTIONAL_CATEGORY_SLUGS.has(category.slug)) return true
  const name = category.name.toLowerCase()
  return name.includes('კალიასკ') || name.includes('სათამაშო')
}

export function isSizeOptionalCategoryId(
  categoryId: number | undefined,
  categories: ProductCategory[],
): boolean {
  if (!categoryId) return false
  return isSizeOptionalCategory(categories.find((c) => c.id === categoryId))
}

function getCategoryGroup(category: ProductCategory): number {
  if (isAccessoryCategory(category)) return 3
  if (WOMEN_CATEGORY_IDS.has(category.id)) return 0
  if (MEN_CATEGORY_IDS.has(category.id)) return 1
  if (CHILDREN_CATEGORY_IDS.has(category.id)) return 2
  const name = category.name.toLowerCase()
  if (name.includes('ბავშვ')) return 2
  if (name.includes('ქალ')) return 0
  if (name.includes('შარვალ') || name.includes('პიჯაკ')) return 1
  return 4
}

/** Drop duplicate category names (keep lowest id = primary row) */
export function dedupeProductCategories<T extends ProductCategory>(
  categories: T[],
): T[] {
  const byName = new Map<string, T>()
  for (const category of categories) {
    const key = category.name.toLowerCase().trim()
    const existing = byName.get(key)
    if (!existing || category.id < existing.id) {
      byName.set(key, category)
    }
  }
  return [...byName.values()]
}

/** Sort: women → men → children → other; stable within group by id */
export function sortProductCategories<T extends ProductCategory>(categories: T[]): T[] {
  return [...categories].sort((a, b) => {
    const groupDiff = getCategoryGroup(a) - getCategoryGroup(b)
    if (groupDiff !== 0) return groupDiff
    return a.id - b.id
  })
}

const CATEGORY_GROUP_LABELS = ['ქალი', 'კაცი', 'ბავშვი', 'აქსესუარები', 'დანარჩენი'] as const

export type ProductCategoryGroup = {
  label: string
  categories: ProductCategory[]
}

/** Group categories for optgroup in select: ქალი → კაცი → ბავშვი → დანარჩენი */
export function groupProductCategories<T extends ProductCategory>(
  categories: T[],
): ProductCategoryGroup[] {
  const buckets: T[][] = [[], [], [], [], []]
  for (const category of sortProductCategories(categories)) {
    buckets[getCategoryGroup(category)].push(category)
  }
  return CATEGORY_GROUP_LABELS.map((label, index) => ({
    label,
    categories: buckets[index],
  })).filter((group) => group.categories.length > 0)
}

export const PRODUCT_GENDER_OPTIONS = [
  { value: 'WOMEN' as const, label: 'ქალისთვის' },
  { value: 'MEN' as const, label: 'კაცისთვის' },
  { value: 'CHILDREN' as const, label: 'ბავშვისთვის' },
  { value: 'UNISEX' as const, label: 'უნივერსალური' },
]

/** Legacy Georgian slugs / duplicate rows → primary DB slug (ids 1-23) */
const CATEGORY_SLUG_ALIASES: Record<string, string> = {
  kabebi: 'dresses',
  tops: 'tops',
  blouses: 'tops',
  bottoms: 'skirts',
  pants: 'pants',
  skirts: 'skirts',
  sharvlebi: 'pants',
  kvedabolobebi: 'skirts',
  outerwear: 'outerwear',
  coats: 'coats',
  'paltoebi-da-mosaskhami': 'coats',
  'wedding-dresses': 'wedding-dresses',
  'sakortsino-kabebi': 'wedding-dresses',
  'evening-wear': 'evening-wear',
  'ski-jacket': 'ski-jacket',
  'sathilamuro-qurtuki': 'ski-jacket',
  'thermal-wear': 'thermal-wear',
  'termo-tansatsmeli': 'thermal-wear',
  goggles: 'goggles',
  satvale: 'goggles',
  helmet: 'helmet',
  chapkhuti: 'helmet',
  traditional: 'traditional',
  'traditsiuli-tansatsmeli': 'traditional',
  cosplay: 'cosplay',
  'qospleis-kostumebi': 'cosplay',
  suit: 'suit',
  'sharval-kostumi': 'suit',
  blazer: 'blazer',
  pijaki: 'blazer',
  accessories: 'accessories',
  aksesuarebi: 'accessories',
  'kids-dresses': 'kids-dresses',
  'bavshvta-kabebi': 'kids-dresses',
  'kids-traditional': 'kids-traditional',
  'bavshvta-traditsiuli-tansatsmeli': 'kids-traditional',
  'kids-ski': 'kids-ski',
  'bavshvta-sathilamuro-tansatsmeli': 'kids-ski',
  'kalta-or-natsilad-shekruli-kompleqtebi': 'tops',
  'კაბები': 'dresses',
  'ბლუზები': 'tops',
  'შარვლები': 'pants',
  'ქვედაბოლოები': 'skirts',
  'ზედა ტანსაცმელი': 'outerwear',
  'პალტოები და მოსასხამი': 'coats',
  'საქორწინო კაბები': 'wedding-dresses',
  'საღამოს ტანსაცმელი': 'evening-wear',
  'სათხილამურო ქურთუკი': 'ski-jacket',
  'თერმო ტანსაცმელი': 'thermal-wear',
  'სათვალე': 'goggles',
  'ჩაფხუტი': 'helmet',
  'ტრადიციული ტანსაცმელი': 'traditional',
  'ქოსფლეის კოსტუმები': 'cosplay',
  'შარვალ კოსტუმი': 'suit',
  'პიჯაკი': 'blazer',
  'აქსესუარები': 'accessories',
  'ბავშვთა კაბები': 'kids-dresses',
  'ბავშვთა ტრადიციული ტანსაცმელი': 'kids-traditional',
  'ბავშვთა სათხილამურო ტანსაცმელი': 'kids-ski',
  'ბავშვების კალიასკა': 'bavshvebis-kaliaska',
  'ბავშვების სათამაშოები': 'bavshvebis-satamashoebi',
}

const categoryIdBySlug = new Map(
  DEFAULT_PRODUCT_CATEGORIES.map((c) => [c.slug, c.id]),
)

const categoryMetaById = new Map(
  DEFAULT_PRODUCT_CATEGORIES.map((c) => [c.id, { id: c.id, name: c.name, slug: c.slug }]),
)

/** Normalize category URL/filter param to canonical DB slug */
export function resolveCategorySlugParam(param: string): string {
  const trimmed = param.trim()
  const lower = trimmed.toLowerCase()

  if (CATEGORY_SLUG_ALIASES[lower]) return CATEGORY_SLUG_ALIASES[lower]
  if (CATEGORY_SLUG_ALIASES[trimmed]) return CATEGORY_SLUG_ALIASES[trimmed]
  if (categoryIdBySlug.has(lower)) return lower

  const byName = DEFAULT_PRODUCT_CATEGORIES.find(
    (c) => c.name === trimmed || c.name.toLowerCase() === lower,
  )
  if (byName) return byName.slug

  return lower
}

export function findCategoryByParam(
  param: string,
  categories: ProductCategory[],
): ProductCategory | undefined {
  const slug = resolveCategorySlugParam(param)
  return (
    categories.find((c) => c.slug === slug) ||
    categories.find((c) => c.name === param.trim()) ||
    categories.find((c) => c.slug === param.trim().toLowerCase())
  )
}

export function productMatchesCategoryFilter(
  product: { category?: { name?: string; slug?: string } | null },
  selected: string[],
  categories: ProductCategory[],
): boolean {
  if (selected.length === 0) return true
  if (!product.category) return false

  return selected.some((sel) => {
    const resolved = findCategoryByParam(sel, categories)
    const targetName = resolved?.name ?? sel
    const targetSlug = resolved?.slug ?? resolveCategorySlugParam(sel)

    return (
      product.category?.name === targetName ||
      product.category?.slug === targetSlug ||
      product.category?.name === sel ||
      product.category?.slug === sel
    )
  })
}

/** Resolve category query param → id without a DB round-trip (known slugs only). */
export function getCategoryIdBySlugParam(category: string): number | null {
  const slug = resolveCategorySlugParam(category)
  return categoryIdBySlug.get(slug) ?? null
}

/** Resolve category ids from static in-memory map (sync, no DB). */
export function getCategoryMetaByIdsSync(
  ids: number[],
): Map<number, { id: number; name: string; slug: string }> {
  const result = new Map<number, { id: number; name: string; slug: string }>()
  for (const id of ids) {
    const meta = categoryMetaById.get(id)
    if (meta) result.set(id, meta)
  }
  return result
}
