import { clerkMiddleware } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { extractApiKey } from '@/lib/api/apiKeyHeader'

// Routes that skip the session requirement because external callers use them.
// Every one of these handlers authenticates the caller itself:
// - /api/health: health check probe (no data)
// - /api/mcp/sse & /api/mcp/messages: Clerk session or MCP_ACCESS_TOKEN
// - /api/triggers/webhook/[token]: secret webhook token + optional HMAC signature
// - /api/triggers/cron/[id]: CRON_SECRET bearer (rejected when unset)
// - /api/a2a/manifest: public A2A agent card (no data)
// - /api/a2a/tasks: Clerk session or A2A_ACCESS_TOKEN
const isPublicRoute = (pathname: string) =>
  pathname === '/api/health' ||
  pathname.startsWith('/api/mcp/sse') ||
  pathname.startsWith('/api/mcp/messages') ||
  pathname.startsWith('/api/triggers/webhook/') ||
  pathname.startsWith('/api/triggers/cron/') ||
  pathname === '/api/a2a/manifest' ||
  pathname === '/api/a2a/tasks';

const protectedPrefixes = [
  '/dashboard',
  '/executions',
  '/versions',
  '/approvals',
  '/api',
];

const isProtectedRoute = (pathname: string) =>
  protectedPrefixes.some((prefix) => pathname.startsWith(prefix));

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req.nextUrl.pathname)) {
    return NextResponse.next();
  }

  // Requests carrying an org API key have no Clerk session. Let them reach the
  // handler, which validates the key; routes that don't accept keys still call
  // auth() and answer 401, so this fails closed.
  if (req.nextUrl.pathname.startsWith('/api/') && extractApiKey(req.headers)) {
    return NextResponse.next();
  }

  const { userId } = await auth()

  // Signed-in users hitting the landing page go straight to the dashboard
  if (userId && req.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  if (isProtectedRoute(req.nextUrl.pathname)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for Clerk's auto-proxy path
    '/__clerk/:path*',
    '/(api|trpc)(.*)',
  ],
}
