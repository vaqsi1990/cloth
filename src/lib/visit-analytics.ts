import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

const VISITOR_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isValidVisitorId(value: string): boolean {
  return VISITOR_ID_RE.test(value)
}

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
  visitorId: string
  ip: string
  path: string
  country?: string | null
}) {
  await prisma.siteVisit.create({
    data: {
      visitorId: input.visitorId,
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

function countUniqueVisitors(
  rows: Array<{ visitorId: string | null }>,
): number {
  return new Set(
    rows
      .map((row) => row.visitorId)
      .filter((id): id is string => typeof id === 'string' && id.length > 0),
  ).size
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
        select: { visitorId: true },
      }),
      prisma.siteVisit.findMany({
        where: { createdAt: { gte: weekStart } },
        select: { visitorId: true },
      }),
      prisma.siteVisit.findMany({
        where: { createdAt: { gte: monthStart } },
        select: { visitorId: true },
      }),
      prisma.$queryRaw<
        Array<{
          visitorId: string
          country: string | null
          pageViews: number
          lastSeen: Date
        }>
      >`
        SELECT
          "visitorId",
          MAX(country) as country,
          COUNT(*)::int as "pageViews",
          MAX("createdAt") as "lastSeen"
        FROM "SiteVisit"
        WHERE "createdAt" >= ${weekStart}
          AND "visitorId" IS NOT NULL
        GROUP BY "visitorId"
        ORDER BY MAX("createdAt") DESC
        LIMIT 50
      `,
    ])

  return {
    visitorsToday: countUniqueVisitors(todayVisits),
    visitorsWeek: countUniqueVisitors(weekVisits),
    visitorsMonth: countUniqueVisitors(monthVisits),
    pageViewsToday: todayVisits.length,
    pageViewsWeek: weekVisits.length,
    pageViewsMonth: monthVisits.length,
    recentVisitors: recentVisitors.map((row) => ({
      visitorId: row.visitorId,
      pageViews: row.pageViews,
      lastSeen: row.lastSeen,
      country: row.country,
    })),
  }
}
