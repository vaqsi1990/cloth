import { prisma } from '@/lib/prisma'
import { isValidGeorgianIban, normalizeGeorgianIban } from '@/lib/iban'

export async function saveUserIbanVerification(userId: string, iban: string): Promise<string> {
  const normalized = normalizeGeorgianIban(iban)

  if (!isValidGeorgianIban(normalized)) {
    throw new Error('გთხოვთ შეიყვანოთ ქართული ბანკის IBAN (GE...)')
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      iban: normalized,
      verified: false,
    },
  })

  await prisma.userVerification.upsert({
    where: { userId },
    update: {
      identityStatus: 'PENDING',
      identityComment: null,
      status: 'PENDING',
      comment: null,
    },
    create: {
      userId,
      identityStatus: 'PENDING',
      status: 'PENDING',
    },
  })

  return normalized
}
