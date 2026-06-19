import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { prisma } from "@/lib/prisma"
import { prismaCacheStrategy } from "@/lib/prisma-cache"
import { normalizeEmail } from "@/lib/email-address"
import bcrypt from "bcryptjs"

// Validate required environment variables

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = normalizeEmail(credentials.email)

        const user = await prisma.user.findFirst({
          where: {
            email: { equals: email, mode: 'insensitive' },
          },
          ...prismaCacheStrategy({ swr: 60, ttl: 60 }),
          select: {
            id: true,
            email: true,
            password: true,
            name: true,
            role: true,
            image: true,
            phone: true,
            location: true,
            address: true,
            personalId: true,
            iban: true,
            banned: true,
            verification: {
              select: {
                status: true
              }
            }
          }
        })

        if (!user || !user.password) {
          return null
        }
        if (user.banned) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          image: user.image,
          phone: user.phone,
          location: user.location,
          address: user.address,
          personalId: user.personalId,
          iban: user.iban,
          verificationStatus: user.verification?.status || null,
        }
      }
    }),

  ],
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Handle Google OAuth sign in
      if (account?.provider === "google") {
        try {
          // Normalize email for consistent lookups
          const email = normalizeEmail(user.email ?? '')

          if (!email) {
            console.error("Google OAuth: No email provided")
            return false
          }

          // Check if user is banned (case-insensitive email match)
          const existingUser = await prisma.user.findFirst({
            where: { email: { equals: email, mode: 'insensitive' } },
            select: { id: true, banned: true, banReason: true, email: true }
          })

          if (existingUser?.banned) {
            console.log("BANNED USER BLOCKED")
            return false
          }

          // Link to existing account or create a new one
          if (account && email) {
            const dbUser = existingUser
              ? await prisma.user.update({
                  where: { id: existingUser.id },
                  data: {
                    email,
                    emailVerified: new Date(),
                    ...(user.image ? { image: user.image } : {}),
                  },
                })
              : await prisma.user.create({
                  data: {
                    email,
                    name: user.name || undefined,
                    image: user.image || undefined,
                    emailVerified: new Date(),
                    code: Math.random().toString(36).substring(2, 8).toUpperCase(),
                    role: "USER",
                  },
                })

            await prisma.account.upsert({
              where: {
                provider_providerAccountId: {
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                },
              },
              update: {
                userId: dbUser.id,
                refresh_token: account.refresh_token || undefined,
                access_token: account.access_token || undefined,
                expires_at: account.expires_at || undefined,
                token_type: account.token_type || undefined,
                scope: account.scope || undefined,
                id_token: account.id_token || undefined,
                session_state: account.session_state || undefined,
              },
              create: {
                userId: dbUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                refresh_token: account.refresh_token,
                access_token: account.access_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
                session_state: account.session_state,
              },
            })

            // Ensure JWT/session use the database user id, not Google's provider id
            user.id = dbUser.id
          }
        } catch (error: any) {
          if (error.message?.startsWith("BANNED:")) {
            throw error
          }
          console.error("Error in signIn callback for Google OAuth:", error)
          // Log more details for debugging
          if (error.code) {
            console.error("Error code:", error.code)
          }
          if (error.meta) {
            console.error("Error meta:", error.meta)
          }
          return false
        }
      }
      return true
    },
    async jwt({ token, user, trigger, session, account }) {
      type AuthorizedUser = {
        id: string
        email: string
        name?: string | null
        image?: string | null
        role?: string
        phone?: string | null
        location?: string | null
        address?: string | null
        personalId?: string | null
        iban?: string | null
        verificationStatus?: string | null
      }

      if (user) {
        const u = user as AuthorizedUser
        if (u.id) token.sub = u.id
        if (typeof u.email === 'string') token.email = normalizeEmail(u.email)
        if (typeof u.role === 'string') token.role = u.role
        if (typeof u.image === 'string' || u.image === null) token.image = u.image
        if (typeof u.phone === 'string' || u.phone === null) token.phone = u.phone
        if (typeof u.location === 'string' || u.location === null) token.location = u.location
        if (typeof u.address === 'string' || u.address === null) token.address = u.address
        if (typeof u.personalId === 'string' || u.personalId === null) token.personalId = u.personalId
        if (typeof u.iban === 'string' || u.iban === null) token.iban = u.iban
        if (typeof u.verificationStatus === 'string' || u.verificationStatus === null) token.verificationStatus = u.verificationStatus
      }

      const userDataSelect = {
        id: true,
        name: true,
        role: true,
        image: true,
        phone: true,
        location: true,
        address: true,
        personalId: true,
        iban: true,
        verification: {
          select: {
            status: true
          }
        }
      } as const

      const applyDbUserToToken = (dbUser: {
        id: string
        name: string | null
        role: string
        image: string | null
        phone: string | null
        location: string | null
        address: string | null
        personalId: string | null
        iban: string | null
        verification: { status: string } | null
      }) => {
        token.sub = dbUser.id
        token.name = dbUser.name
        token.role = dbUser.role
        token.image = dbUser.image
        token.phone = dbUser.phone ?? token.phone
        token.location = dbUser.location
        token.address = dbUser.address
        token.personalId = dbUser.personalId
        token.iban = dbUser.iban
        token.verificationStatus = dbUser.verification?.status || null
      }

      const applySessionUpdateToToken = (
        updateSession: unknown,
      ) => {
        type UpdatePayload = Partial<{
          image: string | null
          name: string | null
          email: string
          phone: string | null
          location: string | null
          address: string | null
          personalId: string | null
          iban: string | null
        }> & {
          user?: Partial<{
            phone: string | null
            iban: string | null
            image: string | null
            name: string | null
          }>
        }

        const s = updateSession as UpdatePayload
        const phone = s.phone ?? s.user?.phone
        const iban = s.iban ?? s.user?.iban
        const image = s.image ?? s.user?.image
        const name = s.name ?? s.user?.name

        if (image !== undefined) token.image = image
        if (name !== undefined) token.name = name
        if (s.email !== undefined) token.email = s.email
        if (phone !== undefined) token.phone = phone
        if (s.location !== undefined) token.location = s.location
        if (s.address !== undefined) token.address = s.address
        if (s.personalId !== undefined) token.personalId = s.personalId
        if (iban !== undefined) token.iban = iban
      }

      const findDbUserForToken = async (fresh = false) => {
        const cacheOptions = fresh ? {} : prismaCacheStrategy({ swr: 60, ttl: 60 })

        if (token.sub) {
          const byId = await prisma.user.findUnique({
            ...cacheOptions,
            where: { id: token.sub },
            select: userDataSelect,
          })
          if (byId) return byId
        }

        const email = typeof token.email === 'string' ? normalizeEmail(token.email) : null
        if (!email) return null

        return prisma.user.findFirst({
          ...cacheOptions,
          where: { email: { equals: email, mode: 'insensitive' } },
          select: userDataSelect,
        })
      }

      // For OAuth providers on first sign in, fetch user data from database
      if (account?.provider === "google") {
        try {
          const dbUser = await findDbUserForToken()
          if (dbUser) {
            applyDbUserToToken(dbUser)
          }
        } catch (error) {
          console.error('Error fetching user data in jwt callback:', error)
        }
      }

      // Refresh user data from database on each request (for OAuth users or when user data might have changed)
      if (token.sub && !account) {
        try {
          const dbUser = await findDbUserForToken(trigger === 'update')

          if (dbUser) {
            token.sub = dbUser.id
            token.name = dbUser.name ?? token.name
            // Always update role from database to ensure it's current
            token.role = dbUser.role
            if (!token.image && dbUser.image) token.image = dbUser.image
            token.phone = dbUser.phone ?? token.phone
            token.location = dbUser.location ?? token.location
            token.address = dbUser.address ?? token.address
            token.personalId = dbUser.personalId ?? token.personalId
            token.iban = dbUser.iban ?? token.iban
            token.verificationStatus = dbUser.verification?.status || null
          }
        } catch (error) {
          console.error('Error refreshing user data in jwt callback:', error)
        }
      }

      // Client session updates must run last so they are not overwritten.
      if (trigger === 'update' && session) {
        applySessionUpdateToToken(session)
      }

      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.role = (typeof token.role === 'string' ? token.role : session.user.role)
        session.user.image = (token.image as string | null) ?? session.user.image ?? null
        session.user.name = (token.name as string | null) ?? session.user.name ?? null
        session.user.email = (typeof token.email === 'string' ? token.email : session.user.email)
          ; (session.user as { phone?: string | null }).phone = (token.phone as string | null | undefined) ?? undefined
          ; (session.user as { location?: string | null }).location = (token.location as string | null | undefined) ?? undefined
          ; (session.user as { address?: string | null }).address = (token.address as string | null | undefined) ?? undefined
          ; (session.user as { personalId?: string | null }).personalId = (token.personalId as string | null | undefined) ?? undefined
          ; (session.user as { iban?: string | null }).iban = (token.iban as string | null | undefined) ?? undefined
          ; (session.user as { verificationStatus?: string | null }).verificationStatus = (token.verificationStatus as string | null | undefined) ?? undefined
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // Handle OAuth redirects - validate and allow same-origin redirects
      if (url.startsWith("/")) return `${baseUrl}${url}`
      if (new URL(url).origin === baseUrl) return url
      return baseUrl
    }
  },
  pages: {
    signIn: "/auth/signin",
  },
  secret: process.env.NEXTAUTH_SECRET,
}
