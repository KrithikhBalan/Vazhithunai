// Purpose: Next.js Edge Proxy (Middleware) that intercepts incoming HTTP requests to handle global route redirection (e.g. routing "/" to "/splash").

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Root → redirect to splash screen
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
