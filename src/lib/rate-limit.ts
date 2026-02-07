/**
 * Simple in-memory rate limiter for API routes.
 * Uses a sliding window approach.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}, 60_000);

interface RateLimitConfig {
  windowMs: number;   // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // General API reads
  read: { windowMs: 60_000, maxRequests: 60 },
  // Write operations
  write: { windowMs: 60_000, maxRequests: 20 },
  // AI generation (expensive)
  generate: { windowMs: 300_000, maxRequests: 5 },
  // Ingest (scheduled, should be rare)
  ingest: { windowMs: 60_000, maxRequests: 3 },
};

/**
 * Check rate limit. Returns null if allowed, or a Response if rate-limited.
 */
export function checkRateLimit(
  request: Request,
  type: keyof typeof RATE_LIMITS = 'read'
): Response | null {
  const config = RATE_LIMITS[type];
  if (!config) return null;

  // Use IP + route as key
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
  const url = new URL(request.url);
  const key = `${ip}:${url.pathname}:${type}`;

  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return null;
  }

  entry.count++;

  if (entry.count > config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return new Response(
      JSON.stringify({ error: 'Too many requests. Please try again later.' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(config.maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(entry.resetAt / 1000)),
        },
      }
    );
  }

  return null;
}
