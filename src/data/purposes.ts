export const PURPOSE_OPTIONS = [
  { slug: 'everyday', name: 'ყოველდღიური ტანსაცმელი' },
  { slug: 'wedding', name: 'საქორწილო და სადღესასწაულო' },
  { slug: 'sports', name: 'სათხილამურო და სპორტული' },
  { slug: 'cultural', name: 'კულტურული და თემატური' },
] as const

export const PURPOSE_NAME_BY_SLUG = PURPOSE_OPTIONS.reduce<Record<string, string>>((acc, purpose) => {
  acc[purpose.slug] = purpose.name
  return acc
}, {})

export const PURPOSE_SLUGS = PURPOSE_OPTIONS.map((purpose) => purpose.slug)

