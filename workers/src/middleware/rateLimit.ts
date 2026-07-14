// Simple Rate Limiting Middleware for Cloudflare Workers
// Uses D1 for storage (simple but effective for moderate traffic)

import { Env } from '../types';
import { errorResponse } from '../utils/response';

interface RateLimitOptions {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests allowed in the window
  keyGenerator?: (request: Request) => string; // Custom key (default: IP)
}

const DEFAULT_OPTIONS: RateLimitOptions = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60,
};

/**
 * Simple in-memory + D1 rate limiter
 * For production, consider using Cloudflare Rate Limiting or KV
 */
export async function rateLimit(
  request: Request,
  env: Env,
  options: Partial<RateLimitOptions> = {}
): Promise<Response | null> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Get client IP
  const ip = request.headers.get('CF-Connecting-IP') || 
             request.headers.get('X-Forwarded-For') || 
             'unknown';

  const key = `ratelimit:${ip}`;
  const now = Date.now();
  const windowStart = now - opts.windowMs;

  try {
    // Clean old entries and count current requests in window
    await env.DB.prepare(`
      DELETE FROM rate_limits WHERE created_at < ?
    `).bind(windowStart).run();

    const countResult = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM rate_limits WHERE key = ? AND created_at >= ?
    `).bind(key, windowStart).first() as { count: number } | null;

    const currentCount = countResult?.count ?? 0;

    if (currentCount >= opts.maxRequests) {
      return errorResponse('Too many requests. Please try again later.', 429);
    }

    // Record this request
    await env.DB.prepare(`
      INSERT INTO rate_limits (key, created_at) VALUES (?, ?)
    `).bind(key, now).run();

    return null; // Allow request
  } catch (error) {
    console.error('[RateLimit] Error:', error);
    // Fail open - allow request if rate limiting fails
    return null;
  }
}

/**
 * Helper to create table if not exists (call once at startup or migration)
 */
export async function ensureRateLimitTable(db: D1Database): Promise<void> {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS rate_limits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `).run();

  // Optional: Add index for performance
  await db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_rate_limits_key_created 
    ON rate_limits(key, created_at)
  `).run();
}