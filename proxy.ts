import { NextResponse, type NextRequest } from 'next/server';

/**
 * Next.js 16 proxy (formerly `middleware`). Runs before any route handler.
 * Today it's a permissive pass-through — auth is enforced client-side via the
 * `<ProtectedRoute>` wrapper + the API client's bearer-token interceptor — but
 * keeping the file lets us add per-path redirects (e.g. tenant subdomain →
 * /dashboard) without touching the renderer.
 */
export function proxy(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
