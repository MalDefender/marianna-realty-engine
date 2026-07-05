import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

/**
 * Edge middleware:
 *  - Gates /admin/* (except login) behind a valid session cookie.
 *  - Marks admin + API responses no-store / noindex so sensitive data is
 *    never cached by browsers/CDNs or indexed by search engines.
 *  API routes still re-verify auth with requireAdmin() (defense in depth).
 */
function harden(res: NextResponse): NextResponse {
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAdmin = pathname.startsWith("/admin");
  const isLogin = pathname === "/admin/login";

  // API routes: harden headers; each route enforces its own auth.
  // Exception: /api/image/* is public, non-sensitive and cacheable for speed.
  if (!isAdmin) {
    if (pathname.startsWith("/api/image")) return NextResponse.next();
    return harden(NextResponse.next());
  }

  // Admin login page is public.
  if (isLogin) return harden(NextResponse.next());

  // Gate the rest of /admin/*.
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
    return harden(NextResponse.redirect(url));
  }
  return harden(NextResponse.next());
}

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};
