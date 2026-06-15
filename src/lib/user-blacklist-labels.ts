import type { BlacklistSource } from '@prisma/client'

export function getBlacklistSourceLabel(source: BlacklistSource): string {
  switch (source) {
    case 'MANUAL_BAN':
      return 'ადმინისტრატორის ბანი'
    case 'REVENUE_THRESHOLD':
      return 'შემოსავლის ზღვარი'
    default:
      return source
  }
}
