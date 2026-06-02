export type ProductCategory = {
  id: number
  name: string
  slug: string
}

/** Fallback list: women → men → children → other */
export const DEFAULT_PRODUCT_CATEGORIES: ProductCategory[] = [
  { id: 1, name: 'პალტოები და მოსასხამი', slug: 'paltoebi-da-mosaskhami' },
  { id: 2, name: 'კაბები', slug: 'kabebi' },
  { id: 3, name: 'ქალების ორ ნაწილად შეკრული კომპლექტები', slug: 'kalta-or-natsilad-shekruli-kompleqtebi' },
  { id: 4, name: 'შარვლები', slug: 'sharvlebi' },
  { id: 5, name: 'ქვედაბოლოები', slug: 'kvedabolobebi' },
  { id: 6, name: 'ქალების კოსტუმი', slug: 'kalta-kostumi' },
  { id: 7, name: 'საქორწინო კაბები', slug: 'sakortsino-kabebi' },
  { id: 8, name: 'სათხილამურო ქურთუკი', slug: 'sathilamuro-qurtuki' },
  { id: 9, name: 'სათხილამურო ტანსაცმელი', slug: 'sathilamuro-tansatsmeli' },
  { id: 10, name: 'სათვალე', slug: 'satvale' },
  { id: 11, name: 'სათხილამურო სათვალე', slug: 'sathilamuro-satvale' },
  { id: 12, name: 'ჩაფხუტი', slug: 'chapkhuti' },
  { id: 13, name: 'ტრადიციული ტანსაცმელი', slug: 'traditsiuli-tansatsmeli' },
  { id: 14, name: 'ტრადიციული და კულტურული ტანსაცმელი', slug: 'traditsiuli-da-kulturuli-tansatsmeli' },
  { id: 15, name: 'ქოსფლეის კოსტუმები', slug: 'qospleis-kostumebi' },
  { id: 16, name: 'შარვალ კოსტუმი', slug: 'sharval-kostumi' },
  { id: 17, name: 'პიჯაკი', slug: 'pijaki' },
  { id: 18, name: 'ბავშვთა კაბები', slug: 'bavshvta-kabebi' },
  { id: 19, name: 'ბავშვთა ტრადიციული ტანსაცმელი', slug: 'bavshvta-traditsiuli-tansatsmeli' },
  { id: 20, name: 'ბავშვთა სათხილამურო ტანსაცმელი', slug: 'bavshvta-sathilamuro-tansatsmeli' },
  { id: 21, name: 'თერმო ტანსაცმელი', slug: 'termo-tansatsmeli' },
  { id: 22, name: 'მეორე ფენა', slug: 'meore-pena' },
  { id: 23, name: 'აქსესუარები', slug: 'aksesuarebi' },
]

const WOMEN_CATEGORY_IDS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 13, 14, 15])
const MEN_CATEGORY_IDS = new Set([16, 17])
const CHILDREN_CATEGORY_IDS = new Set([18, 19, 20])
const ACCESSORY_CATEGORY_IDS = new Set([10, 11, 12, 23])
const ACCESSORY_CATEGORY_SLUGS = new Set([
  'aksesuarebi',
  'satvale',
  'sathilamuro-satvale',
  'chapkhuti',
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
