import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthenticated = !!req.auth;

  // Protect dashboard routes
  if (pathname.startsWith("/closet") ||
      pathname.startsWith("/upload") ||
      pathname.startsWith("/outfits") ||
      pathname.startsWith("/recommendations") ||
      pathname.startsWith("/capsule") ||
      pathname.startsWith("/purchases") ||
      pathname.startsWith("/analytics") ||
      pathname.startsWith("/wear-tracking") ||
      pathname.startsWith("/style-quiz") ||
      pathname.startsWith("/pricing") ||
      pathname.startsWith("/settings") ||
      pathname.startsWith("/help") ||
      pathname.startsWith("/privacy")) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/closet/:path*",
    "/upload/:path*",
    "/outfits/:path*",
    "/recommendations/:path*",
    "/capsule/:path*",
    "/purchases/:path*",
    "/analytics/:path*",
    "/wear-tracking/:path*",
    "/style-quiz/:path*",
    "/pricing/:path*",
    "/settings/:path*",
    "/help/:path*",
    "/privacy/:path*",
  ],
};

