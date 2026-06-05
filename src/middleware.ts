import { NextRequest, NextResponse } from 'next/server'

// Rate limiter configuration
const WINDOW_MS = 60_000          // 1-minute window
const MAX_REQUESTS = 100           // max requests per window per IP
const MAX_BODY_BYTES = 1 * 1024 * 1024  // 1 MB max request body

// In-memory store: IP -> { count, windowStart }
const rateLimitStore = new Map<string, { count: number; windowStart: number }>()

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

function rateLimit(ip: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now()
  const entry = rateLimitStore.get(ip)

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    // New window
    rateLimitStore.set(ip, { count: 1, windowStart: now })
    return { allowed: true, remaining: MAX_REQUESTS - 1, resetIn: WINDOW_MS }
  }

  if (entry.count >= MAX_REQUESTS) {
    const resetIn = WINDOW_MS - (now - entry.windowStart)
    return { allowed: false, remaining: 0, resetIn }
  }

  entry.count++
  return {
    allowed: true,
    remaining: MAX_REQUESTS - entry.count,
    resetIn: WINDOW_MS - (now - entry.windowStart),
  }
}

export function middleware(req: NextRequest) {
  const ip = getClientIp(req)

  // ── Request body size check ──────────────────────────────────────────
  const contentLength = req.headers.get('content-length')
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: 'Payload too large. Maximum request size is 1 MB.' },
      { status: 413 }
    )
  }

  // ── Rate limiting ────────────────────────────────────────────────────
  const { allowed, remaining, resetIn } = rateLimit(ip)

  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': Math.ceil(resetIn / 1000).toString(),
          'X-RateLimit-Limit': MAX_REQUESTS.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Math.ceil(resetIn / 1000).toString(),
        },
      }
    )
  }

  // ── Cleanup stale entries to prevent memory bloat ──────────────────
  const now = Date.now()
  for (const [key, val] of rateLimitStore.entries()) {
    if (now - val.windowStart > WINDOW_MS) rateLimitStore.delete(key)
  }

  // ── Add rate limit headers to all responses ─────────────────────────
  const response = NextResponse.next()
  response.headers.set('X-RateLimit-Limit', MAX_REQUESTS.toString())
  response.headers.set('X-RateLimit-Remaining', remaining.toString())
  response.headers.set('X-RateLimit-Reset', Math.ceil(resetIn / 1000).toString())

  return response
}

export const config = {
  matcher: '/:path*',
}