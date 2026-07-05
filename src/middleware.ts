import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

/**
 * Edge middleware: gate /admin/* (except the login page) behind a valid
 * session cookie. This is a fast first check; API routes re-verify with
 * requireAdmin() as defense in depth.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAdmin = pathname.startsWith("/admin");
  const isLogin = pathname === "/admin/login";
  if (!isAdmin || isLogin) return NextResponse.next();

  const token = req.cookies.get("mr_session")?.value;
  const secret = process.env.AUTH_SECRET;
  let valid = false;
  if (token && secret && secret.length >= 16) {
    try {
      await jwtVerify(token, new TextEncoder().encode(secret));
      valid = true;
    } catch {
      valid = false;
    }
  }

  if (!valid) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
