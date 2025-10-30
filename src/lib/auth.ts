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
        }
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = (user as any).role
        token.image = (user as any).image
        token.phone = (user as any).phone
        token.location = (user as any).location
        token.personalId = (user as any).personalId
      }

      // Update token when profile is updated
      if (trigger === "update" && session) {
        token.image = (session as any).image
        token.name = (session as any).name
        token.email = (session as any).email
        token.phone = (session as any).phone ?? token.phone
        token.location = (session as any).location ?? token.location
        token.personalId = (session as any).personalId ?? token.personalId
      }

      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.role = token.role as string
        session.user.image = token.image as string
        session.user.name = token.name as string
        session.user.email = token.email as string
        ;(session.user as any).phone = token.phone as string | undefined
        ;(session.user as any).location = token.location as string | undefined
        ;(session.user as any).personalId = token.personalId as string | undefined
      }
      return session
    }
  },
  pages: {
    signIn: "/auth/signin",
  },
  secret: process.env.NEXTAUTH_SECRET,
}
