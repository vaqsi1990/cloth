import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      phone?: string | null
      location?: string | null
      personalId?: string | null
      verificationStatus?: string | null
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string
    image?: string | null
    phone?: string | null
    location?: string | null
    personalId?: string | null
    verificationStatus?: string | null
  }
}
