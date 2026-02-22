import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      phone?: string | null
      id: string
      email: string
      name?: string | null
      image?: string | null
      role: string
      location?: string | null
      address?: string | null
    }
  }

  interface User {
    id: string
    email: string
    name?: string | null
    image?: string | null
    role: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string
    image?: string | null
    phone?: string | null
    location?: string | null
    address?: string | null
  }
}
