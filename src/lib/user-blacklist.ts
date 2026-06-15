import type { BlacklistSource } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export type BlacklistUserSnapshot = {
  userName: string | null
  userEmail: string | null
  userPhone: string | null
  personalId: string | null
}

export async function getBlacklistUserSnapshot(
  userId: string,
): Promise<BlacklistUserSnapshot | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      phone: true,
      personalId: true,
    },
  })

  if (!user) return null

  return {
    userName: user.name,
    userEmail: user.email,
    userPhone: user.phone,
    personalId: user.personalId,
  }
}

export async function createBlacklistRecord(input: {
  userId: string
  reason: string
  source: BlacklistSource
  createdById?: string | null
  adminNotes?: string | null
}): Promise<void> {
  const snapshot = await getBlacklistUserSnapshot(input.userId)
  if (!snapshot) return

  const existingActive = await prisma.userBlacklistRecord.findFirst({
    where: {
      userId: input.userId,
      source: input.source,
      isActive: true,
    },
    select: { id: true },
  })

  if (existingActive) return

  await prisma.userBlacklistRecord.create({
    data: {
      userId: input.userId,
      userName: snapshot.userName,
      userEmail: snapshot.userEmail,
      userPhone: snapshot.userPhone,
      personalId: snapshot.personalId,
      reason: input.reason,
      adminNotes: input.adminNotes ?? null,
      source: input.source,
      createdById: input.createdById ?? null,
    },
  })
}

export async function resolveActiveBlacklistRecords(input: {
  userId: string
  resolvedById?: string | null
  source?: BlacklistSource
}): Promise<void> {
  await prisma.userBlacklistRecord.updateMany({
    where: {
      userId: input.userId,
      isActive: true,
      ...(input.source ? { source: input.source } : {}),
    },
    data: {
      isActive: false,
      resolvedAt: new Date(),
      resolvedById: input.resolvedById ?? null,
    },
  })
}

/** Backfill records for users already banned before blacklist existed. */
export async function syncMissingBlacklistRecords(): Promise<number> {
  const users = await prisma.user.findMany({
    where: { banned: true },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      personalId: true,
      banned: true,
      banReason: true,
    },
  })

  let created = 0

  for (const user of users) {
    const exists = await prisma.userBlacklistRecord.findFirst({
      where: {
        userId: user.id,
        source: 'MANUAL_BAN',
        isActive: true,
      },
      select: { id: true },
    })
    if (!exists) {
      await prisma.userBlacklistRecord.create({
        data: {
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          userPhone: user.phone,
          personalId: user.personalId,
          reason: user.banReason || 'ადმინისტრატორის მიერ დაბლოკვა',
          source: 'MANUAL_BAN',
        },
      })
      created++
    }
  }

  return created
}
