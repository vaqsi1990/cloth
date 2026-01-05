import { withAuth } from "next-auth/middleware"
import { isAdminOrSupport } from "@/lib/roles"

export default withAuth(
  function middleware(req) {
    // Add any additional middleware logic here
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Check if user is trying to access admin routes
        if (req.nextUrl.pathname.startsWith("/admin")) {
          return isAdminOrSupport(token?.role as string)
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
  matcher: ["/admin/:path*", "/account/:path*"]
}