export type ProductCategory = {
  id: number
  name: string
  slug: string
}

/** Primary DB categories (ids 1–23) — must match production Category table */
export const DEFAULT_PRODUCT_CATEGORIES: ProductCategory[] = [
  { id: 1, name: 'კაბა', slug: 'dresses' },
  { id: 2, name: 'ბლუზა', slug: 'tops' },
  { id: 3, name: 'შარვალი', slug: 'pants' },
  { id: 4, name: 'ქვედაბოლო', slug: 'skirts' },
  { id: 5, name: 'ზედა ტანსაცმელი', slug: 'outerwear' },
  { id: 6, name: 'პალტოები& მოსასხამი', slug: 'coats' },
  { id: 7, name: 'საქორწინო კაბა', slug: 'wedding-dresses' },
  { id: 8, name: 'საღამოს ტანსაცმელი', slug: 'evening-wear' },
  { id: 9, name: 'სათხილამურო ქურთუკი', slug: 'ski-jacket' },
  { id: 10, name: 'თერმო ტანსაცმელი', slug: 'thermal-wear' },
  { id: 44, name: 'მეორე ფენა', slug: 'meore-pena' },
  { id: 11, name: 'სათვალე', slug: 'goggles' },
  { id: 12, name: 'ჩაფხუტი', slug: 'helmet' },
  { id: 13, name: 'ტრადიციული ტანსაცმელი', slug: 'traditional' },
  { id: 14, name: 'ქოსფლეის კოსტუმი', slug: 'cosplay' },
  { id: 15, name: 'შარვალ კოსტუმი', slug: 'suit' },
  { id: 16, name: 'პიჯაკი', slug: 'blazer' },
  { id: 17, name: 'აქსესუარები', slug: 'accessories' },
  { id: 18, name: 'კაბა', slug: 'kids-dresses' },
  { id: 19, name: 'ტრადიციული და კულტურული', slug: 'kids-traditional' },
  { id: 20, name: 'სათხილამურო ტანსაცმელი', slug: 'kids-ski' },
  { id: 21, name: 'ყოველდღიური ტანსაცმელი', slug: 'everyday' },
  { id: 22, name: 'სპორტული ტანსაცმელი', slug: 'sportwear' },
  { id: 23, name: 'სადღესასწაულო კოსტუმი', slug: 'festive' },
  { id: 47, name: 'ბავშვების კალიასკა', slug: 'bavshvebis-kaliaska' },
  { id: 48, name: 'ბავშვების სათამაშოები', slug: 'bavshvebis-satamashoebi' },
  { id: 49, name: 'ტრადიციული და კულტურული', slug: 'traditional-cultural' },
  { id: 50, name: 'სათხილამურო ტანსაცმელი', slug: 'ski-wear' },
  { id: 51, name: 'სათხილამურო სათვალე', slug: 'ski-goggles' },
  { id: 52, name: 'ფეხსაცმელი', slug: 'women-footwear' },
  { id: 53, name: 'ჩანთა', slug: 'women-bags' },
  { id: 54, name: 'ფეხსაცმელი', slug: 'men-footwear' },
  { id: 55, name: 'ჩანთა', slug: 'men-bags' },
  { id: 56, name: 'ფეხსაცმელი', slug: 'kids-footwear' },
  { id: 57, name: 'ჩანთა', slug: 'kids-bags' },
  { id: 58, name: 'პალტოები& მოსასხამი', slug: 'men-coats' },
  { id: 59, name: 'სადღესასწაულო კოსტუმი', slug: 'men-festive-costume' },
  { id: 60, name: 'ბლუზა', slug: 'men-blouse' },
  { id: 61, name: 'ქოსფლეის კოსტუმი', slug: 'men-cosplay' },
  { id: 62, name: 'საღამოს პერანგი', slug: 'evening-shirt' },
  { id: 63, name: 'სვიტერი', slug: 'sweater' },
  { id: 64, name: 'შორტი', slug: 'shorts' },
  { id: 65, name: 'კომბინიზონი', slug: 'jumpsuit' },
  { id: 66, name: 'პერანგი', slug: 'shirt' },
  { id: 67, name: 'შარვალი', slug: 'men-pants' },
  { id: 68, name: 'ქვედაბოლო', slug: 'kids-skirts' },
  { id: 69, name: 'პალტოები& მოსასხამი', slug: 'kids-coats' },
  { id: 70, name: 'სადღესასწაულო კოსტუმი', slug: 'kids-festive-costume' },
  { id: 71, name: 'ბლუზა', slug: 'kids-blouse' },
  { id: 72, name: 'ქოსფლეის კოსტუმი', slug: 'kids-cosplay' },
  { id: 73, name: 'შარვალი', slug: 'kids-pants' },
]

/** Canonical women's shop taxonomy — order matches navigation and filters */
export const WOMEN_PRODUCT_CATEGORIES: ProductCategory[] = [
  { id: 1, name: 'კაბა', slug: 'dresses' },
  { id: 4, name: 'ქვედაბოლო', slug: 'skirts' },
  { id: 7, name: 'საქორწინო კაბა', slug: 'wedding-dresses' },
  { id: 6, name: 'პალტოები& მოსასხამი', slug: 'coats' },
  { id: 23, name: 'სადღესასწაულო კოსტუმი', slug: 'festive' },
  { id: 2, name: 'ბლუზა', slug: 'tops' },
  { id: 5, name: 'ზედა ტანსაცმელი', slug: 'outerwear' },
  { id: 50, name: 'სათხილამურო ტანსაცმელი', slug: 'ski-wear' },
  { id: 11, name: 'სათვალე', slug: 'goggles' },
  { id: 12, name: 'ჩაფხუტი', slug: 'helmet' },
  { id: 14, name: 'ქოსფლეის კოსტუმი', slug: 'cosplay' },
  { id: 22, name: 'სპორტული ტანსაცმელი', slug: 'sportwear' },
  { id: 49, name: 'ტრადიციული და კულტურული', slug: 'traditional-cultural' },
  { id: 52, name: 'ფეხსაცმელი', slug: 'women-footwear' },
  { id: 53, name: 'ჩანთა', slug: 'women-bags' },
  { id: 16, name: 'პიჯაკი', slug: 'blazer' },
  { id: 17, name: 'აქსესუარები', slug: 'accessories' },
  { id: 62, name: 'საღამოს პერანგი', slug: 'evening-shirt' },
  { id: 63, name: 'სვიტერი', slug: 'sweater' },
  { id: 64, name: 'შორტი', slug: 'shorts' },
  { id: 65, name: 'კომბინიზონი', slug: 'jumpsuit' },
  { id: 66, name: 'პერანგი', slug: 'shirt' },
  { id: 3, name: 'შარვალი', slug: 'pants' },
]

/** Canonical men's shop taxonomy — order matches navigation and filters */
export const MEN_PRODUCT_CATEGORIES: ProductCategory[] = [
  { id: 58, name: 'პალტოები& მოსასხამი', slug: 'men-coats' },
  { id: 59, name: 'სადღესასწაულო კოსტუმი', slug: 'men-festive-costume' },
  { id: 60, name: 'ბლუზა', slug: 'men-blouse' },
  { id: 5, name: 'ზედა ტანსაცმელი', slug: 'outerwear' },
  { id: 50, name: 'სათხილამურო ტანსაცმელი', slug: 'ski-wear' },
  { id: 11, name: 'სათვალე', slug: 'goggles' },
  { id: 12, name: 'ჩაფხუტი', slug: 'helmet' },
  { id: 61, name: 'ქოსფლეის კოსტუმი', slug: 'men-cosplay' },
  { id: 22, name: 'სპორტული ტანსაცმელი', slug: 'sportwear' },
  { id: 49, name: 'ტრადიციული და კულტურული', slug: 'traditional-cultural' },
  { id: 54, name: 'ფეხსაცმელი', slug: 'men-footwear' },
  { id: 55, name: 'ჩანთა', slug: 'men-bags' },
  { id: 16, name: 'პიჯაკი', slug: 'blazer' },
  { id: 17, name: 'აქსესუარები', slug: 'accessories' },
  { id: 62, name: 'საღამოს პერანგი', slug: 'evening-shirt' },
  { id: 63, name: 'სვიტერი', slug: 'sweater' },
  { id: 64, name: 'შორტი', slug: 'shorts' },
  { id: 65, name: 'კომბინიზონი', slug: 'jumpsuit' },
  { id: 66, name: 'პერანგი', slug: 'shirt' },
  { id: 67, name: 'შარვალი', slug: 'men-pants' },
]

/** Canonical children's shop taxonomy — order matches navigation and filters */
export const CHILDREN_PRODUCT_CATEGORIES: ProductCategory[] = [
  { id: 18, name: 'კაბა', slug: 'kids-dresses' },
  { id: 68, name: 'ქვედაბოლო', slug: 'kids-skirts' },
  { id: 69, name: 'პალტოები& მოსასხამი', slug: 'kids-coats' },
  { id: 70, name: 'სადღესასწაულო კოსტუმი', slug: 'kids-festive-costume' },
  { id: 71, name: 'ბლუზა', slug: 'kids-blouse' },
  { id: 5, name: 'ზედა ტანსაცმელი', slug: 'outerwear' },
  { id: 20, name: 'სათხილამურო ტანსაცმელი', slug: 'kids-ski' },
  { id: 11, name: 'სათვალე', slug: 'goggles' },
  { id: 12, name: 'ჩაფხუტი', slug: 'helmet' },
  { id: 72, name: 'ქოსფლეის კოსტუმი', slug: 'kids-cosplay' },
  { id: 22, name: 'სპორტული ტანსაცმელი', slug: 'sportwear' },
  { id: 19, name: 'ტრადიციული და კულტურული', slug: 'kids-traditional' },
  { id: 56, name: 'ფეხსაცმელი', slug: 'kids-footwear' },
  { id: 57, name: 'ჩანთა', slug: 'kids-bags' },
  { id: 16, name: 'პიჯაკი', slug: 'blazer' },
  { id: 17, name: 'აქსესუარები', slug: 'accessories' },
  { id: 62, name: 'საღამოს პერანგი', slug: 'evening-shirt' },
  { id: 63, name: 'სვიტერი', slug: 'sweater' },
  { id: 64, name: 'შორტი', slug: 'shorts' },
  { id: 65, name: 'კომბინიზონი', slug: 'jumpsuit' },
  { id: 66, name: 'პერანგი', slug: 'shirt' },
  { id: 73, name: 'შარვალი', slug: 'kids-pants' },
]

const WOMEN_CATEGORY_IDS = new Set(WOMEN_PRODUCT_CATEGORIES.map((category) => category.id))
const MEN_CATEGORY_IDS = new Set(MEN_PRODUCT_CATEGORIES.map((category) => category.id))
const CHILDREN_CATEGORY_IDS = new Set(CHILDREN_PRODUCT_CATEGORIES.map((category) => category.id))
const ACCESSORY_CATEGORY_IDS = new Set([11, 12, 17, 51])
const ACCESSORY_CATEGORY_SLUGS = new Set(['accessories', 'goggles', 'helmet', 'ski-goggles', 'aksesuarebi'])
const SIZE_OPTIONAL_CATEGORY_IDS = new Set([...ACCESSORY_CATEGORY_IDS, 47, 48, 53, 55, 57])
const SIZE_OPTIONAL_CATEGORY_SLUGS = new Set([
  ...ACCESSORY_CATEGORY_SLUGS,
  'bavshvebis-kaliaska',
  'bavshvebis-satamashoebi',
  'women-bags',
  'men-bags',
  'kids-bags',
])

const FOOTWEAR_CATEGORY_IDS = new Set([52, 54, 56])
const FOOTWEAR_CATEGORY_SLUGS = new Set(['women-footwear', 'men-footwear', 'kids-footwear'])

export function isFootwearCategory(category: ProductCategory | undefined | null): boolean {
  if (!category) return false
  if (FOOTWEAR_CATEGORY_IDS.has(category.id)) return true
  if (FOOTWEAR_CATEGORY_SLUGS.has(category.slug)) return true
  return category.slug.endsWith('-footwear')
}

export function isFootwearCategoryId(
  categoryId: number | undefined,
  categories: ProductCategory[],
): boolean {
  if (!categoryId) return false
  return isFootwearCategory(categories.find((c) => c.id === categoryId))
}

export function getFootwearGenderFromCategory(
  category: ProductCategory | undefined | null,
): 'WOMEN' | 'MEN' | 'CHILDREN' | null {
  if (!category || !isFootwearCategory(category)) return null
  if (category.slug === 'men-footwear') return 'MEN'
  if (category.slug === 'kids-footwear') return 'CHILDREN'
  return 'WOMEN'
}

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
  const name = category.name.trim().toLowerCase()
  if (name.includes('კალიასკ') || name.includes('სათამაშო') || name.includes('ჩანთ')) {
    return true
  }
  if (name.includes('სათვალ')) return true
  if (name.includes('აქსესუარ')) return true
  return false
}

export function isSizeOptionalShopContext(input: {
  categoryParam?: string | null
  selectedCategories?: string[]
  categories?: ProductCategory[]
}): boolean {
  const categories = input.categories ?? DEFAULT_PRODUCT_CATEGORIES

  if (input.categoryParam) {
    const category = findCategoryByParam(input.categoryParam, categories)
    if (category && isSizeOptionalCategory(category)) return true
  }

  return (input.selectedCategories ?? []).some((selectedCategory) => {
    const category =
      categories.find((entry) => entry.name === selectedCategory) ??
      findCategoryByParam(selectedCategory, categories)
    if (category) return isSizeOptionalCategory(category)

    const normalized = selectedCategory.trim().toLowerCase()
    return (
      normalized.includes('ჩანთ') ||
      normalized.includes('სათვალ') ||
      normalized.includes('აქსესუარ')
    )
  })
}

export function isSizeOptionalCategoryId(
  categoryId: number | undefined,
  categories: ProductCategory[],
): boolean {
  if (!categoryId) return false
  return isSizeOptionalCategory(categories.find((c) => c.id === categoryId))
}

export function clearVariantSizes<
  T extends {
    size?: string | null
    sizes?: string[] | null
    sizeDetails?: Array<{ size: string; price: number; stock: number }> | null
    sizeSystem?: string | null
  },
>(variants: T[]): T[] {
  return variants.map((variant) => ({
    ...variant,
    size: undefined,
    sizes: undefined,
    sizeDetails: undefined,
    sizeSystem: undefined,
  }))
}

export function isChildrenProductCategory(
  category: ProductCategory | string | null | undefined,
  categories: ProductCategory[] = DEFAULT_PRODUCT_CATEGORIES,
): boolean {
  if (!category) return false

  if (typeof category === 'string') {
    const trimmed = category.trim()
    if (!trimmed) return false
    const lower = trimmed.toLowerCase()
    if (lower.includes('ბავშვ') || lower.includes('kids') || lower.includes('bavshv')) {
      return true
    }
    const resolved = findCategoryByParam(trimmed, categories)
    if (resolved) {
      return (
        CHILDREN_CATEGORY_IDS.has(resolved.id) ||
        resolved.name.toLowerCase().includes('ბავშვ')
      )
    }
    return false
  }

  return (
    CHILDREN_CATEGORY_IDS.has(category.id) ||
    category.name.toLowerCase().includes('ბავშვ')
  )
}

function getCategoryGroups(category: ProductCategory): number[] {
  const groups: number[] = []
  if (WOMEN_CATEGORY_IDS.has(category.id)) groups.push(0)
  if (MEN_CATEGORY_IDS.has(category.id)) groups.push(1)
  if (CHILDREN_CATEGORY_IDS.has(category.id)) groups.push(2)
  if (isAccessoryCategory(category)) groups.push(3)
  if (groups.length === 0) {
    const name = category.name.toLowerCase()
    if (name.includes('ბავშვ')) groups.push(2)
    else if (name.includes('ქალ')) groups.push(0)
    else if (name.includes('შარვალ') || name.includes('პიჯაკ')) groups.push(1)
    else groups.push(4)
  }
  return groups
}

function getCategoryGroup(category: ProductCategory): number {
  return getCategoryGroups(category)[0] ?? 4
}

/** Drop duplicate category names and ids (keep canonical DEFAULT row per id) */
export function dedupeProductCategories<T extends ProductCategory>(
  categories: T[],
): T[] {
  const defaultById = new Map(DEFAULT_PRODUCT_CATEGORIES.map((c) => [c.id, c]))
  const byId = new Map<number, T>()

  for (const category of categories) {
    const canonical = defaultById.get(category.id)

    if (byId.has(category.id)) {
      if (canonical) {
        byId.set(category.id, canonical as T)
      }
      continue
    }

    const nameKey = category.name.toLowerCase().trim()
    const duplicateName = [...byId.values()].find(
      (existing) => existing.name.toLowerCase().trim() === nameKey,
    )
    if (duplicateName) {
      const keepCanonical =
        canonical &&
        duplicateName.name.toLowerCase().trim() === canonical.name.toLowerCase().trim()
      if (keepCanonical) {
        byId.delete(duplicateName.id)
        byId.set(category.id, canonical as T)
      }
      continue
    }

    byId.set(category.id, (canonical ?? category) as T)
  }

  return [...byId.values()]
}

/** Form selects: canonical defaults merged with DB rows (real ids from API by slug). */
export function mergeProductCategoriesWithDefaults<T extends ProductCategory>(
  apiCategories: T[],
): ProductCategory[] {
  const apiBySlug = new Map(
    apiCategories.map((category) => [category.slug, category]),
  )
  const defaultSlugs = new Set(DEFAULT_PRODUCT_CATEGORIES.map((c) => c.slug))

  const fromDefaults = DEFAULT_PRODUCT_CATEGORIES.map(
    (defaultCategory) => apiBySlug.get(defaultCategory.slug) ?? defaultCategory,
  )
  const extras = apiCategories.filter((category) => !defaultSlugs.has(category.slug))

  return sortProductCategories(
    dedupeProductCategories([...fromDefaults, ...extras]),
  )
}

/** Merge API rows into canonical women's list (preserves order). */
export function mergeWomenProductCategories<T extends ProductCategory>(
  apiCategories: T[] = [],
): ProductCategory[] {
  const bySlug = new Map(apiCategories.map((category) => [category.slug, category]))
  const byId = new Map(apiCategories.map((category) => [category.id, category]))

  return WOMEN_PRODUCT_CATEGORIES.map((template) => {
    const fromApi = bySlug.get(template.slug) ?? byId.get(template.id)
    if (!fromApi) return template
    return { ...fromApi, name: template.name }
  })
}

/** Merge API rows into canonical men's list (preserves order). */
export function mergeMenProductCategories<T extends ProductCategory>(
  apiCategories: T[] = [],
): ProductCategory[] {
  const bySlug = new Map(apiCategories.map((category) => [category.slug, category]))
  const byId = new Map(apiCategories.map((category) => [category.id, category]))

  return MEN_PRODUCT_CATEGORIES.map((template) => {
    const fromApi = bySlug.get(template.slug) ?? byId.get(template.id)
    if (!fromApi) return template
    return { ...fromApi, name: template.name }
  })
}

/** Merge API rows into canonical children's list (preserves order). */
export function mergeChildrenProductCategories<T extends ProductCategory>(
  apiCategories: T[] = [],
): ProductCategory[] {
  const bySlug = new Map(apiCategories.map((category) => [category.slug, category]))
  const byId = new Map(apiCategories.map((category) => [category.id, category]))

  return CHILDREN_PRODUCT_CATEGORIES.map((template) => {
    const fromApi = bySlug.get(template.slug) ?? byId.get(template.id)
    if (!fromApi) return template
    return { ...fromApi, name: template.name }
  })
}

/** All predefined categories + API rows; always shows full shop taxonomy in filters */
export function collectShopFilterCategories(
  _apiCategories?: ProductCategory[],
): ProductCategory[] {
  return sortProductCategories([...DEFAULT_PRODUCT_CATEGORIES])
}

export function collectShopFilterCategoriesForGender(
  gender: 'women' | 'men' | 'children' | null | undefined,
  apiCategories?: ProductCategory[],
): ProductCategory[] {
  const all = collectShopFilterCategories(apiCategories)
  if (!gender) return all
  if (gender === 'men') return mergeMenProductCategories(apiCategories ?? all)
  if (gender === 'women') return mergeWomenProductCategories(apiCategories ?? all)
  if (gender === 'children') return mergeChildrenProductCategories(apiCategories ?? all)
  return all
}

/** Admin/support product list filters — MEN/WOMEN/CHILDREN/UNISEX/ALL */
export function collectPanelFilterCategoriesForGender(
  gender: 'ALL' | ProductGender,
  apiCategories?: ProductCategory[],
): ProductCategory[] {
  const base = apiCategories?.length
    ? sortProductCategories(dedupeProductCategories(apiCategories))
    : collectShopFilterCategories()

  if (gender === 'ALL' || gender === 'UNISEX') {
    return base
  }
  if (gender === 'MEN') return mergeMenProductCategories(base)
  if (gender === 'WOMEN') return mergeWomenProductCategories(base)
  if (gender === 'CHILDREN') return mergeChildrenProductCategories(base)
  return base
}

/** Map any DB/legacy category row to canonical primary slug (ids 1–23, 47–48). */
export function resolveCanonicalCategorySlug(
  category:
    | { id?: number | null; name?: string | null; slug?: string | null }
    | null
    | undefined,
): string | null {
  if (!category) return null

  if (category.id != null) {
    const byId = DEFAULT_PRODUCT_CATEGORIES.find((c) => c.id === category.id)
    if (byId) return byId.slug
    const legacySlug = LEGACY_CATEGORY_ID_TO_SLUG[category.id]
    if (legacySlug) return legacySlug
  }

  const slug = category.slug?.trim().toLowerCase()
  if (slug) {
    const canonical = CATEGORY_SLUG_ALIASES[slug] ?? slug
    if (categoryIdBySlug.has(canonical)) return canonical
  }

  const name = category.name?.trim()
  if (name) {
    const byAlias = CATEGORY_SLUG_ALIASES[name] ?? CATEGORY_SLUG_ALIASES[name.toLowerCase()]
    if (byAlias) return byAlias
    const byName = DEFAULT_PRODUCT_CATEGORIES.find((c) => c.name === name)
    if (byName) return byName.slug
  }

  return slug ?? null
}

/** Canonical display meta for shop filters and product cards. */
export function resolveCanonicalCategory(
  category:
    | { id?: number | null; name?: string | null; slug?: string | null }
    | null
    | undefined,
): ProductCategory | null {
  const slug = resolveCanonicalCategorySlug(category)
  if (!slug) return null
  return DEFAULT_PRODUCT_CATEGORIES.find((c) => c.slug === slug) ?? null
}

/** All slugs (canonical + legacy aliases) that belong to one primary category. */
export function getAliasSlugsForCanonical(canonicalSlug: string): string[] {
  const slugs = new Set<string>([canonicalSlug])
  for (const [alias, canonical] of Object.entries(CATEGORY_SLUG_ALIASES)) {
    if (canonical === canonicalSlug) {
      slugs.add(alias)
    }
  }
  return [...slugs]
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
    for (const groupIndex of getCategoryGroups(category)) {
      buckets[groupIndex].push(category)
    }
  }

  for (let index = 0; index < buckets.length; index += 1) {
    const seen = new Set<number>()
    buckets[index] = buckets[index].filter((category) => {
      if (seen.has(category.id)) return false
      seen.add(category.id)
      return true
    })
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

export type ProductGender = (typeof PRODUCT_GENDER_OPTIONS)[number]['value']

function getGenderGroupIndex(gender: ProductGender): number {
  if (gender === 'WOMEN') return 0
  if (gender === 'MEN') return 1
  if (gender === 'CHILDREN') return 2
  return -1
}

export function categoryMatchesProductGender(
  category: ProductCategory,
  gender: ProductGender,
): boolean {
  if (gender === 'UNISEX') return true
  if (isAccessoryCategory(category)) return true

  const targetGroup = getGenderGroupIndex(gender)
  return getCategoryGroups(category).includes(targetGroup)
}

export function filterProductCategoriesByGender<T extends ProductCategory>(
  categories: T[],
  gender: ProductGender | null | undefined,
): T[] {
  if (!gender) return []
  if (gender === 'MEN') {
    return mergeMenProductCategories(categories) as T[]
  }
  if (gender === 'WOMEN') {
    return mergeWomenProductCategories(categories) as T[]
  }
  if (gender === 'CHILDREN') {
    return mergeChildrenProductCategories(categories) as T[]
  }
  return sortProductCategories(
    categories.filter((category) => categoryMatchesProductGender(category, gender)),
  )
}

/** Single optgroup per gender in product forms — no duplicate rows under კაცი/ბავშვი. */
export function groupProductCategoriesForGender<T extends ProductCategory>(
  categories: T[],
  gender?: ProductGender | null,
): ProductCategoryGroup[] {
  if (!gender || gender === 'UNISEX') {
    return groupProductCategories(categories)
  }

  if (gender === 'MEN') {
    return [
      {
        label: CATEGORY_GROUP_LABELS[1],
        categories: mergeMenProductCategories(categories),
      },
    ]
  }

  if (gender === 'WOMEN') {
    return [
      {
        label: CATEGORY_GROUP_LABELS[0],
        categories: mergeWomenProductCategories(categories),
      },
    ]
  }

  if (gender === 'CHILDREN') {
    return [
      {
        label: CATEGORY_GROUP_LABELS[2],
        categories: mergeChildrenProductCategories(categories),
      },
    ]
  }

  const primaryIndex = getGenderGroupIndex(gender)
  const primary: T[] = []
  const accessories: T[] = []

  for (const category of sortProductCategories(categories)) {
    if (isAccessoryCategory(category)) {
      accessories.push(category)
      continue
    }
    if (getCategoryGroups(category).includes(primaryIndex)) {
      primary.push(category)
    }
  }

  const groups: ProductCategoryGroup[] = []
  if (primary.length > 0) {
    groups.push({
      label: CATEGORY_GROUP_LABELS[primaryIndex],
      categories: primary,
    })
  }
  if (accessories.length > 0) {
    groups.push({
      label: CATEGORY_GROUP_LABELS[3],
      categories: accessories,
    })
  }
  return groups
}

export function isCategoryValidForProductGender(
  categoryId: number | undefined,
  gender: ProductGender | null | undefined,
  categories: ProductCategory[],
): boolean {
  if (!categoryId || !gender) return false
  const category = categories.find((entry) => entry.id === categoryId)
  if (!category) return false
  return categoryMatchesProductGender(category, gender)
}

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
  'meore-pena': 'meore-pena',
  goggles: 'goggles',
  satvale: 'goggles',
  helmet: 'helmet',
  chapkhuti: 'helmet',
  traditional: 'traditional',
  'traditsiuli-tansatsmeli': 'traditional',
  'traditsiuli-da-kulturuli-tansatsmeli': 'traditional-cultural',
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
  'kids-skirts': 'kids-skirts',
  'kids-coats': 'kids-coats',
  'kids-festive-costume': 'kids-festive-costume',
  'kids-blouse': 'kids-blouse',
  'kids-cosplay': 'kids-cosplay',
  'kids-pants': 'kids-pants',
  'kids-traditional': 'kids-traditional',
  'bavshvta-traditsiuli-tansatsmeli': 'kids-traditional',
  'kids-ski': 'kids-ski',
  'bavshvta-sathilamuro-tansatsmeli': 'kids-ski',
  'ski-wear': 'ski-wear',
  'sathilamuro-tansatsmeli': 'ski-wear',
  'ski-goggles': 'ski-goggles',
  'sathilamuro-satvale': 'ski-goggles',
  'kalta-or-natsilad-shekruli-kompleqtebi': 'tops',
  'კაბები': 'dresses',
  'კაბა': 'dresses',
  'ბლუზები': 'tops',
  'შარვლები': 'pants',
  'ქვედაბოლოები': 'skirts',
  'ქვედაბოლო': 'skirts',
  'ზედა ტანსაცმელი': 'outerwear',
  'პალტოები და მოსასხამი': 'coats',
  'საქორწინო კაბები': 'wedding-dresses',
  'საქორწინო კაბა': 'wedding-dresses',
  'საქორწილო კაბები': 'wedding-dresses',
  'საღამოს ტანსაცმელი': 'evening-wear',
  'სათხილამურო ქურთუკი': 'ski-jacket',
  'თერმო ტანსაცმელი': 'thermal-wear',
  'მეორე ფენა': 'meore-pena',
  'სათვალე': 'goggles',
  'ჩაფხუტი': 'helmet',
  'ტრადიციული ტანსაცმელი': 'traditional',
  'ტრადიციული და კულტურული ტანსაცმელი': 'traditional-cultural',
  'ტრადიციული და კულტურული': 'traditional-cultural',
  'ქოსფლეის კოსტუმები': 'cosplay',
  'შარვალ კოსტუმი': 'suit',
  'პიჯაკი': 'blazer',
  'აქსესუარები': 'accessories',
  'ბავშვთა კაბები': 'kids-dresses',
  'ბავშვთა ტრადიციული ტანსაცმელი': 'kids-traditional',
  'ბავშვთა სათხილამურო ტანსაცმელი': 'kids-ski',
  'სათხილამურო ტანსაცმელი': 'ski-wear',
  'სათხილამურო სათვალე': 'ski-goggles',
  'სადღესასწაულო ტანსაცმელი': 'festive',
  'ყოველდღიური ტანსაცმელი': 'everyday',
  'ბავშვების კალიასკა': 'bavshvebis-kaliaska',
  'ბავშვების სათამაშოები': 'bavshvebis-satamashoebi',
  'women-footwear': 'women-footwear',
  'women-bags': 'women-bags',
  'men-footwear': 'men-footwear',
  'men-bags': 'men-bags',
  'kids-footwear': 'kids-footwear',
  'kids-bags': 'kids-bags',
  'ქალის ფეხსაცმელი': 'women-footwear',
  'ქალის ჩანთა': 'women-bags',
  'კაცის ფეხსაცმელი': 'men-footwear',
  'კაცის ჩანთა': 'men-bags',
  'ბავშვის ფეხსაცმელი': 'kids-footwear',
  'ბავშვის ჩანთა': 'kids-bags',
  'men-coats': 'men-coats',
  'paltoebi-mosaskhami': 'men-coats',
  'პალტოები& მოსასხამი': 'men-coats',
  'men-festive-costume': 'men-festive-costume',
  'სადღესასწაულო კოსტუმი': 'men-festive-costume',
  'festive': 'festive',
  'men-blouse': 'men-blouse',
  'ბლუზა': 'men-blouse',
  'men-cosplay': 'men-cosplay',
  'ქოსფლეის კოსტუმი': 'men-cosplay',
  'evening-shirt': 'evening-shirt',
  'საღამოს პერანგი': 'evening-shirt',
  'საღამური პერანგი': 'evening-shirt',
  'sweater': 'sweater',
  'სვიტერი': 'sweater',
  'shorts': 'shorts',
  'შორტი': 'shorts',
  'jumpsuit': 'jumpsuit',
  'კომბინიზონი': 'jumpsuit',
  'shirt': 'shirt',
  'პერანგი': 'shirt',
  'men-pants': 'men-pants',
  'შარვალი': 'men-pants',
  pecsapertmeli: 'women-footwear',
  qalispecsapertmeli: 'women-footwear',
  qalischanta: 'women-bags',
  kacispecsapertmeli: 'men-footwear',
  kacischanta: 'men-bags',
  bavshvispecsapertmeli: 'kids-footwear',
  bavshvischanta: 'kids-bags',
}

const categoryIdBySlug = new Map(
  DEFAULT_PRODUCT_CATEGORIES.map((c) => [c.slug, c.id]),
)

const categoryMetaById = new Map(
  DEFAULT_PRODUCT_CATEGORIES.map((c) => [c.id, { id: c.id, name: c.name, slug: c.slug }]),
)

/** Legacy duplicate Category rows (ids 24+) → canonical primary slug */
const LEGACY_CATEGORY_ID_TO_SLUG: Record<number, string> = {
  24: 'dresses',
  25: 'tops',
  26: 'pants',
  27: 'skirts',
  29: 'wedding-dresses',
  30: 'ski-jacket',
  31: 'kids-ski',
  33: 'goggles',
  35: 'traditional',
  36: 'kids-traditional',
  37: 'cosplay',
  38: 'suit',
  39: 'blazer',
  40: 'kids-dresses',
  41: 'kids-traditional',
  42: 'kids-ski',
  43: 'thermal-wear',
  45: 'coats',
  46: 'accessories',
}

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
  product: {
    categoryId?: number | null
    category?: { id?: number; name?: string; slug?: string } | null
  },
  selected: string[],
  categories: ProductCategory[],
): boolean {
  if (selected.length === 0) return true

  const productSlug = resolveCanonicalCategorySlug(
    product.category ??
      (product.categoryId != null ? { id: product.categoryId } : null),
  )
  if (!productSlug) return false

  return selected.some((sel) => {
    const resolved = findCategoryByParam(sel, categories)
    const targetSlug = resolved?.slug ?? resolveCategorySlugParam(sel)
    return productSlug === targetSlug
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

/** Per canonical shop category slug — totals from raw DB categoryId rows. */
export function buildShopCategoryFacetCounts(
  rows: Array<{
    categoryId: number
    categorySlug: string | null
    categoryName: string | null
    count: number
  }>,
): Record<string, number> {
  const countByCanonicalSlug = new Map<string, number>()

  for (const row of rows) {
    const canonicalSlug = resolveCanonicalCategorySlug({
      id: row.categoryId,
      slug: row.categorySlug,
      name: row.categoryName,
    })
    if (!canonicalSlug) continue
    countByCanonicalSlug.set(
      canonicalSlug,
      (countByCanonicalSlug.get(canonicalSlug) ?? 0) + row.count,
    )
  }

  return Object.fromEntries(countByCanonicalSlug)
}
