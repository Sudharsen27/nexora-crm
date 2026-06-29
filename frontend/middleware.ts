import { decodeJwt } from "jose";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAccessTokenFromCookie } from "@/lib/auth/tokens";

const publicPaths = ["/", "/login", "/register", "/forgot-password", "/reset-password"];
const authPaths = ["/login", "/register", "/forgot-password", "/reset-password"];
const protectedPrefixes = ["/create-organization"];

function isTokenValid(token: string): boolean {
  try {
    const payload = decodeJwt(token);
    if (!payload.exp) return false;
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

function isTenantRoute(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return false;
  const reserved = new Set(["login", "register", "create-organization", "forgot-password", "reset-password"]);
  return !reserved.has(segments[0]);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = getAccessTokenFromCookie(request.headers.get("cookie") ?? undefined);
  const authenticated = token ? isTokenValid(token) : false;

  const isPublic = publicPaths.includes(pathname);
  const isAuthPage = authPaths.includes(pathname);
  const isProtected =
    protectedPrefixes.some((prefix) => pathname.startsWith(prefix)) || isTenantRoute(pathname);

  if (isProtected && !authenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPage && authenticated) {
    return NextResponse.redirect(new URL("/create-organization", request.url));
  }

  if (isPublic && pathname === "/" && authenticated) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg$).*)"],
};
