import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
  providers: [
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
          include: {
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
          // Use a parsable, easily-detected error prefix
          throw new Error(
            "BANNED:" +
            (user.banReason
              ? ` თქვენი ანგარიში დაბლოკილია: ${user.banReason}`
              : " თქვენი ანგარიში დაბლოკილია")
          )
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
          verificationStatus: user.verification?.status || null,
        }
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      type AuthorizedUser = {
        id: string
        email: string
        name?: string | null
        image?: string | null
        role?: string
        phone?: string | null
        location?: string | null
        personalId?: string | null
        verificationStatus?: string | null
      }

      if (user) {
        const u = user as AuthorizedUser
        if (typeof u.role === 'string') token.role = u.role
        if (typeof u.image === 'string' || u.image === null) token.image = u.image
        if (typeof u.phone === 'string' || u.phone === null) token.phone = u.phone
        if (typeof u.location === 'string' || u.location === null) token.location = u.location
        if (typeof u.personalId === 'string' || u.personalId === null) token.personalId = u.personalId
        if (typeof u.verificationStatus === 'string' || u.verificationStatus === null) token.verificationStatus = u.verificationStatus
      }

      // Refresh verification status from database on each request
      if (token.sub) {
        try {
          const userVerification = await prisma.userVerification.findUnique({
            where: { userId: token.sub },
            select: { status: true }
          })
          token.verificationStatus = userVerification?.status || null
        } catch (error) {
          console.error('Error fetching verification status:', error)
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
        }>
        const s = session as UpdatePayload
        token.image = s.image ?? token.image
        token.name = s.name ?? token.name
        token.email = s.email ?? token.email
        token.phone = s.phone ?? token.phone
        token.location = s.location ?? token.location
        token.personalId = s.personalId ?? token.personalId
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
        ;(session.user as { phone?: string | null }).phone = (token.phone as string | null | undefined) ?? undefined
        ;(session.user as { location?: string | null }).location = (token.location as string | null | undefined) ?? undefined
        ;(session.user as { personalId?: string | null }).personalId = (token.personalId as string | null | undefined) ?? undefined
        ;(session.user as { verificationStatus?: string | null }).verificationStatus = (token.verificationStatus as string | null | undefined) ?? undefined
      }
      return session
    }
  },
  pages: {
    signIn: "/auth/signin",
  },
  secret: process.env.NEXTAUTH_SECRET,
}
