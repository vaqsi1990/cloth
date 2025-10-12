import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminPath = /^\/admin(\/.*)?$/.test(pathname);

  if (isAdminPath) {
    const basicAuth = request.headers.get("authorization");

    if (basicAuth) {
      const [user, pwd] = atob(basicAuth.split(" ")[1] || "").split(":");

      const validUser = process.env.BASIC_AUTH_USER;
      const validPassword = process.env.BASIC_AUTH_PASSWORD;

      if (user === validUser && pwd === validPassword) {
        return NextResponse.next();
      }
    }

    const url = request.nextUrl.clone();
    url.pathname = "/api/basicauth";
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|trpc|_next|_vercel|.*\\..*).*)'],
};