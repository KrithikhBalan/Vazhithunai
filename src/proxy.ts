import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Edge proxy (formerly middleware) — lightweight route enforcement.
 * Firebase tokens are verified client-side via onAuthStateChanged;
 * this proxy handles the root redirect only.
 * Full server-side token verification comes in the security module.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Root → redirect to splash
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/splash", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimisation)
     * - favicon.ico
     * - public files
     * - API routes
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icon|sw.js|api).*)",
  ],
};
