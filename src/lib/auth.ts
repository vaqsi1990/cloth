import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { prisma } from "@/lib/prisma"
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

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          },
          // @ts-ignore - cacheStrategy is available with Prisma Accelerate
          cacheStrategy: {
            swr: 60, // Stale-while-revalidating for 60 seconds
            ttl: 60, // Cache results for 60 seconds
          },
          select: {
            id: true,
            email: true,
            password: true,
            name: true,
            role: true,
            image: true,
            phone: true,
            location: true,
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
          const email = user.email?.trim().toLowerCase()

          if (!email) {
            console.error("Google OAuth: No email provided")
            return false
          }

          // Check if user is banned
          const existingUser = await prisma.user.findUnique({
            where: { email },
            select: { banned: true, banReason: true }
          })

          if (existingUser?.banned) {
            console.log("BANNED USER BLOCKED")
            return false
          }

          // Create or update user account
          if (account && email) {
            const dbUser = await prisma.user.upsert({
              where: { email },
              update: {
                name: user.name || undefined,
                image: user.image || undefined,
                emailVerified: new Date(),
              },
              create: {
                email,
                name: user.name || undefined,
                image: user.image || undefined,
                emailVerified: new Date(),
                code: Math.random().toString(36).substring(2, 8).toUpperCase(),
                role: "USER",
              },
            })

            const existingAccount = await prisma.account.findFirst({
              where: {
                provider: "google",
                user: { email },
              },
            })
            
            if (!existingAccount) {
              await prisma.account.create({
                data: {
                  userId: dbUser.id,
                  type: account.type,
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
            
                  // OAuth tokens
                  access_token: account.access_token,
                  refresh_token: account.refresh_token,
                  expires_at: account.expires_at,
                  token_type: account.token_type,
                  scope: account.scope,
                  id_token: account.id_token,
                  session_state: account.session_state,
                },
              })
            }
            
            // Link Google account if not already linked
            await prisma.account.upsert({
              where: {
                provider_providerAccountId: {
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                },
              },
              update: {
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
        personalId?: string | null
        iban?: string | null
        verificationStatus?: string | null
      }

      if (user) {
        const u = user as AuthorizedUser
        if (typeof u.role === 'string') token.role = u.role
        if (typeof u.image === 'string' || u.image === null) token.image = u.image
        if (typeof u.phone === 'string' || u.phone === null) token.phone = u.phone
        if (typeof u.location === 'string' || u.location === null) token.location = u.location
        if (typeof u.personalId === 'string' || u.personalId === null) token.personalId = u.personalId
        if (typeof u.iban === 'string' || u.iban === null) token.iban = u.iban
        if (typeof u.verificationStatus === 'string' || u.verificationStatus === null) token.verificationStatus = u.verificationStatus
      }

      // For OAuth providers on first sign in, fetch user data from database
      if (account?.provider === "google" && token.sub) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.sub },
            select: {
              role: true,
              image: true,
              phone: true,
              location: true,
              personalId: true,
              iban: true,
              verification: {
                select: {
                  status: true
                }
              }
            }
          })

          if (dbUser) {
            token.role = dbUser.role
            token.image = dbUser.image
            token.phone = dbUser.phone
            token.location = dbUser.location
            token.personalId = dbUser.personalId
            token.iban = dbUser.iban
            token.verificationStatus = dbUser.verification?.status || null
          }
        } catch (error) {
          console.error('Error fetching user data in jwt callback:', error)
        }
      }

      // Refresh user data from database on each request (for OAuth users or when user data might have changed)
      if (token.sub && !account) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.sub },
            select: {
              role: true,
              image: true,
              phone: true,
              location: true,
              personalId: true,
              iban: true,
              verification: {
                select: {
                  status: true
                }
              }
            }
          })

          if (dbUser) {
            // Only update if not already set or if data has changed
            if (!token.role) token.role = dbUser.role
            if (!token.image && dbUser.image) token.image = dbUser.image
            if (!token.phone && dbUser.phone) token.phone = dbUser.phone
            if (!token.location && dbUser.location) token.location = dbUser.location
            if (!token.personalId && dbUser.personalId) token.personalId = dbUser.personalId
            if (!token.iban && dbUser.iban) token.iban = dbUser.iban
            token.verificationStatus = dbUser.verification?.status || null
          }
        } catch (error) {
          console.error('Error refreshing user data in jwt callback:', error)
        }
      }

      // Update token when profile is updated
      if (trigger === "update" && session) {
        type UpdatePayload = Partial<{
          image: string | null
          name: string | null
          email: string
          phone: string | null
          location: string | null
          personalId: string | null
          iban: string | null
        }>
        const s = session as UpdatePayload
        token.image = s.image ?? token.image
        token.name = s.name ?? token.name
        token.email = s.email ?? token.email
        token.phone = s.phone ?? token.phone
        token.location = s.location ?? token.location
        token.personalId = s.personalId ?? token.personalId
        token.iban = s.iban ?? token.iban
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
