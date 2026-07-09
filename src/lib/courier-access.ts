import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isCourier } from '@/lib/roles'

export async function requireCourierSession() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return {
      ok: false as const,
      status: 401,
      error: 'ავტორიზაცია საჭიროა',
    }
  }

  if (!isCourier(session.user.role)) {
    return {
      ok: false as const,
      status: 403,
      error: 'კურიერის წვდომა საჭიროა',
    }
  }

  return {
    ok: true as const,
    session,
    userId: session.user.id,
  }
}
