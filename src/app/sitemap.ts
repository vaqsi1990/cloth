import { MetadataRoute } from 'next'
import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/prisma'

const getCachedSitemapEntries = unstable_cache(
  async () => {
    const [products, authors] = await Promise.all([
      prisma.product.findMany({
        where: { approvalStatus: 'APPROVED' },
        select: { id: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 5000,
      }),
      prisma.user.findMany({
        where: { blocked: false },
        select: { id: true, updatedAt: true },
        take: 2000,
      }),
    ])
    return { products, authors }
  },
  ['sitemap-entries-v1'],
  { revalidate: 3600 },
)

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.dressla.ge'

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/shop`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/politics`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ]

  try {
    const { products, authors } = await getCachedSitemapEntries()

    const productPages: MetadataRoute.Sitemap = products.map((product) => ({
      url: `${baseUrl}/product/${product.id}`,
      lastModified: product.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))

    const authorPages: MetadataRoute.Sitemap = authors.map((author) => ({
      url: `${baseUrl}/author/${author.id}`,
      lastModified: author.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }))

    return [...staticPages, ...productPages, ...authorPages]
  } catch (error) {
    console.error('Error generating sitemap:', error)
    return staticPages
  }
}
