import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export function getClientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }

  return request.headers.get('x-real-ip') || null
}

export function getClientCountry(request: NextRequest): string | null {
  return request.headers.get('x-vercel-ip-country') || null
}

export async function recordSiteVisit(input: {
  ip: string
  path: string
  country?: string | null
}) {
  await prisma.siteVisit.create({
    data: {
      ip: input.ip,
      path: input.path.slice(0, 500),
      country: input.country ?? null,
    },
  })
}

function startOfDay(date = new Date()) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export async function getVisitAnalyticsSummary() {
  const now = new Date()
  const todayStart = startOfDay(now)
  const weekStart = new Date(now)
  weekStart.setDate(weekStart.getDate() - 7)
  const monthStart = new Date(now)
  monthStart.setDate(monthStart.getDate() - 30)

  const [todayVisits, weekVisits, monthVisits, recentVisitors] =
    await Promise.all([
      prisma.siteVisit.findMany({
        where: { createdAt: { gte: todayStart } },
        select: { ip: true },
      }),
      prisma.siteVisit.findMany({
        where: { createdAt: { gte: weekStart } },
        select: { ip: true },
      }),
      prisma.siteVisit.findMany({
        where: { createdAt: { gte: monthStart } },
        select: { ip: true },
      }),
      prisma.$queryRaw<
        Array<{
          ip: string
          country: string | null
          visits: number
          lastSeen: Date
        }>
      >`
        SELECT
          ip,
          MAX(country) as country,
          COUNT(*)::int as visits,
          MAX("createdAt") as "lastSeen"
        FROM "SiteVisit"
        WHERE "createdAt" >= ${weekStart}
        GROUP BY ip
        ORDER BY MAX("createdAt") DESC
        LIMIT 50
      `,
    ])

  const uniqueIpsToday = new Set(todayVisits.map((row) => row.ip)).size
  const uniqueIpsWeek = new Set(weekVisits.map((row) => row.ip)).size
  const uniqueIpsMonth = new Set(monthVisits.map((row) => row.ip)).size

  return {
    pageViewsToday: todayVisits.length,
    pageViewsWeek: weekVisits.length,
    uniqueIpsToday,
    uniqueIpsWeek,
    uniqueIpsMonth,
    recentVisitors: recentVisitors.map((row) => ({
      ip: row.ip,
      visits: row.visits,
      lastSeen: row.lastSeen,
      country: row.country,
    })),
  }
}
