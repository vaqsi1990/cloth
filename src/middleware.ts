import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import { userNeedsPhoneNumber } from "@/lib/user-phone-required"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    if (
      token &&
      userNeedsPhoneNumber({
        role: typeof token.role === "string" ? token.role : null,
        phone: typeof token.phone === "string" ? token.phone : null,
      }) &&
      !path.startsWith("/auth/complete-phone")
    ) {
      return NextResponse.redirect(new URL("/auth/complete-phone", req.url))
    }
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname

        if (path.startsWith("/auth/complete-phone")) {
          return !!token
        }

        if (path.startsWith("/admin")) {
          return token?.role === "ADMIN"
        }

        if (path.startsWith("/support")) {
          return token?.role === "SUPPORT"
        }

        if (path.startsWith("/account")) {
          return !!token
        }

        return true
      },
    },
  }
)

export const config = {
  matcher: [
    "/admin/:path*",
    "/support/:path*",
    "/account/:path*",
    "/auth/complete-phone",
    "/checkout/:path*",
    "/order-confirmation/:path*",
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
}
