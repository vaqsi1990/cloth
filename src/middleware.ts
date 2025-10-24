import { withAuth } from "next-auth/middleware"

export default withAuth(
  function middleware(req) {
    // Add any additional middleware logic here
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Check if user is trying to access admin routes
        if (req.nextUrl.pathname.startsWith("/admin")) {
          return token?.role === "ADMIN"
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