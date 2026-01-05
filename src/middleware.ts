import { withAuth } from "next-auth/middleware"
import { isAdminOrSupport } from "@/lib/roles"

export default withAuth(
  function middleware(req) {
    // Add any additional middleware logic here
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Check if user is trying to access admin routes (only ADMIN)
        if (req.nextUrl.pathname.startsWith("/admin")) {
          return token?.role === "ADMIN"
        }
        // Check if user is trying to access support routes (only SUPPORT)
        if (req.nextUrl.pathname.startsWith("/support")) {
          return token?.role === "SUPPORT"
        }
        // Allow authenticated users to access account routes
        if (req.nextUrl.pathname.startsWith("/account")) {
          return !!token
        }
        return true
      },
    },
  }
)

export const config = {
  matcher: ["/admin/:path*", "/support/:path*", "/account/:path*"]
}