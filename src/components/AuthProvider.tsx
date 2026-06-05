'use client'

import { SessionProvider } from 'next-auth/react'
import type { Session } from 'next-auth'
import { ReactNode } from 'react'

interface AuthProviderProps {
  children: ReactNode
  session?: Session | null
}

export default function AuthProvider({ children, session }: AuthProviderProps) {
  return <SessionProvider session={session}>{children}</SessionProvider>
}
