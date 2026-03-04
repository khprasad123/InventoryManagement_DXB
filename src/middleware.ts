import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const pathname = req.nextUrl.pathname;
    const token = req.nextauth.token;
    // Admin-only: user management
    if (pathname.startsWith("/settings/users")) {
      if (token?.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }
    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    "/select-org",
    "/dashboard/:path*",
    "/inventory/:path*",
    "/suppliers/:path*",
    "/clients/:path*",
    "/purchases/:path*",
    "/sales/:path*",
    "/expenses/:path*",
    "/reports/:path*",
    "/settings/:path*",
  ],
};
