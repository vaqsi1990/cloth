import type { Session } from 'next-auth'
import { prisma } from '@/lib/prisma'

export type AuthedUser = {
  id: string
  email: string
  phone: string | null
  role: string
  name: string | null
  banned: boolean
}

export async function requireAuthedUser(
  session: Session | null,
): Promise<
  | { ok: true; user: AuthedUser }
  | { ok: false; error: string; status: 401 | 403 }
> {
  if (!session?.user?.id) {
    return { ok: false, error: 'Authentication required', status: 401 }
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      phone: true,
      role: true,
      name: true,
      banned: true,
    },
  })

  if (!user) {
    return { ok: false, error: 'Authentication required', status: 401 }
  }

  if (user.banned) {
    return { ok: false, error: 'Account suspended', status: 403 }
  }

  return { ok: true, user }
}
