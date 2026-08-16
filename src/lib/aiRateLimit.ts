// Purpose: In-memory sliding-window rate limiter for the AI gateway — tracks per-IP request counts to control Gemini API costs and prevent abuse. NOTE: This resets on server restart / serverless cold-start; for production at scale, replace with Redis (e.g. Upstash).

interface RateLimitRecord {
  count: number;
  windowStart: number; // Unix timestamp ms
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Cleanup stale entries every 5 minutes to prevent unbounded memory growth
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    rateLimitStore.forEach((record, key) => {
      if (now - record.windowStart > 60_000 * 5) {
        rateLimitStore.delete(key);
      }
    });
  }, 5 * 60_000);
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: number; // Unix ms when the window resets
}

/**
 * Checks and increments the per-IP rate limit counter.
 *
 * @param key     - Unique key (e.g. IP address or `${ip}:${endpoint}`)
 * @param limit   - Max requests per window
 * @param windowMs - Window duration in milliseconds (default: 60,000 = 1 minute)
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs = 60_000
): RateLimitResult {
  const now = Date.now();
  const existing = rateLimitStore.get(key);

  if (!existing || now - existing.windowStart >= windowMs) {
    // New window
    rateLimitStore.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: limit - 1, limit, resetAt: now + windowMs };
  }

  if (existing.count >= limit) {
    const resetAt = existing.windowStart + windowMs;
    return { allowed: false, remaining: 0, limit, resetAt };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: limit - existing.count,
    limit,
    resetAt: existing.windowStart + windowMs,
  };
}

/**
 * Extracts IP from a Next.js Request (works for both Edge and Node runtimes).
 */
export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
